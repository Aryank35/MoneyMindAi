import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiCheck,
  FiChevronDown,
  FiClock,
  FiCloudOff,
  FiDelete,
  FiX,
} from "react-icons/fi";

import { useToast } from "./Toast";
import { useConnection } from "../../context/connectionContext";
import { createExpense } from "../../services/expenseService";
import { getAccountsByUser } from "../../services/accountService";
import { getBudgetByUser } from "../../services/budgetService";
import { enqueue } from "../../utils/offlineQueue";
import { getUserId } from "../../utils/auth";
import { readCache, writeCache, cacheKey } from "../../utils/localCache";
import { evaluateExpression } from "../../utils/calc";
import { money } from "../../utils/incomeFormulas";

// =========================================================================
// QUICK EXPENSE
//
// A phone-first bottom sheet: amount first on a big keypad, then a category
// and an account as tappable chips. No dropdowns, no keyboard, nothing
// smaller than a thumb.
//
// It reads accounts and categories from the local cache, so it is fully
// usable while the API is still waking. If the server is not reachable when
// you save, the entry goes to the outbox and syncs by itself.
// =========================================================================

// Four rows of digits with an operator down the right, so splitting a bill
// or adding a tip never needs the system keyboard.
const KEYPAD = [
  ["7", "8", "9", "\u00f7"],
  ["4", "5", "6", "\u00d7"],
  ["1", "2", "3", "-"],
  [".", "0", "back", "+"],
];

const OPERATOR_KEYS = new Set(["+", "-", "\u00d7", "\u00f7"]);

// A shortlist so the common case is one tap, with the full list behind
// "more" for everything else.
const FALLBACK_CATEGORIES = [
  "Food",
  "Travel",
  "Groceries",
  "Bills",
  "Shopping",
  "Health",
  "Fuel",
  "Other",
];

const isCard = (account) => account?.type === "Credit Card";

const getOutstanding = (account) =>
  Math.max(-Number(account?.balance || 0), 0);

export default function QuickExpenseSheet({ isOpen, onClose, onSaved }) {
  const toast = useToast();
  const { isReachable, status } = useConnection();

  const userId = getUserId();

  // Seeded from cache so the sheet is usable on first paint.
  const [accounts, setAccounts] = useState(() =>
    readCache(cacheKey(userId, "accounts"), []),
  );
  const [categories, setCategories] = useState(() =>
    readCache(cacheKey(userId, "categories"), []),
  );

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refresh in the background whenever the sheet opens and the API answers.
  useEffect(() => {
    if (!isOpen || !userId) return undefined;

    let cancelled = false;

    const refresh = async () => {
      try {
        const [accountRes, budgetRes] = await Promise.all([
          getAccountsByUser(userId),
          getBudgetByUser(userId),
        ]);

        if (cancelled) return;

        const nextAccounts = accountRes.data || [];
        const nextCategories = (budgetRes.data?.[0]?.categories || []).map(
          (item) => item.name,
        );

        setAccounts(nextAccounts);
        writeCache(cacheKey(userId, "accounts"), nextAccounts);

        if (nextCategories.length) {
          setCategories(nextCategories);
          writeCache(cacheKey(userId, "categories"), nextCategories);
        }
      } catch {
        // Cached values stay on screen - the sheet must not break because
        // the server is still starting.
      }
    };

    refresh();

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  // Clear the amount each time it opens, but keep the category and account
  // from last time - the next expense is usually on the same card, and
  // re-picking both every time is the tax that makes an app annoying.
  // Deferred a tick so the reset lands outside the effect body, matching how
  // the rest of the app kicks off state changes.
  useEffect(() => {
    if (!isOpen) return undefined;

    const timer = window.setTimeout(() => {
      setAmount("");
      setNote("");
      setShowAllCategories(false);
      setAccountId((prev) => prev || accounts[0]?._id || "");
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const shortlist = useMemo(() => {
    const known = categories.length ? categories : FALLBACK_CATEGORIES;

    return showAllCategories ? known : known.slice(0, 6);
  }, [categories, showAllCategories]);

  const selectedAccount = accounts.find((item) => item._id === accountId);

  // The last run of digits, which is what the decimal-place and duplicate
  // guards below should apply to - not the whole expression.
  const lastNumber = (text) => text.split(/[+\-\u00d7\u00f7]/).pop() || "";

  const press = (key) => {
    if (key === "back") {
      setAmount((prev) => prev.slice(0, -1));

      return;
    }

    if (key === "clear") {
      setAmount("");

      return;
    }

    if (OPERATOR_KEYS.has(key)) {
      // Nothing to operate on yet, and a second operator replaces the first
      // rather than producing "20++".
      setAmount((prev) => {
        if (!prev) return "";

        return OPERATOR_KEYS.has(prev.slice(-1))
          ? prev.slice(0, -1) + key
          : prev + key;
      });

      return;
    }

    if (key === ".") {
      const tail = lastNumber(amount);

      if (tail.includes(".")) return;

      setAmount((prev) => (tail === "" ? `${prev}0.` : prev + key));

      return;
    }

    // Two decimal places is as fine as money gets.
    const tail = lastNumber(amount);

    if (tail.includes(".") && tail.split(".")[1]?.length >= 2) return;

    setAmount((prev) => (prev === "0" ? key : prev + key));
  };

  const { value: resolved, error, isExpression } = evaluateExpression(amount);

  const value = resolved ?? 0;

  const handleSave = async () => {
    if (error) {
      toast.error(error);
      return;
    }

    if (!(value > 0)) {
      toast.error("Enter an amount");
      return;
    }

    if (!category) {
      toast.error("Pick a category");
      return;
    }

    if (!accountId) {
      toast.error("Pick an account");
      return;
    }

    const payload = {
      userId,
      accountId,
      category,
      amount: value,
      note,
      expenseDate: new Date(),
    };

    try {
      setSaving(true);

      if (!isReachable) {
        // Held on the device and replayed by ConnectionProvider. This is the
        // whole point of the sheet working before the API answers.
        const entry = enqueue("expense.create", payload, {
          accountName: selectedAccount?.name,
        });

        if (!entry) {
          toast.error("Could not save on this device - storage unavailable");

          return;
        }

        toast.success(`${money(value)} saved — will sync automatically`);
      } else {
        await createExpense(payload);
        toast.success(`${money(value)} added`);
      }

      onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-label="Add an expense"
            className="
              fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto
              rounded-t-3xl border-t border-white/10 bg-slate-900
              sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2
              sm:w-[26rem] sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:rounded-3xl sm:border
            "
            style={{
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center justify-between px-5 pt-3">
              <h2 className="text-lg font-semibold">Add expense</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-xl bg-slate-800 p-2.5"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Offline notice - stated up front, not after a failed save */}
            {!isReachable && (
              <p className="mx-5 mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                {status === "offline" ? (
                  <FiCloudOff className="mt-0.5 shrink-0" />
                ) : (
                  <FiClock className="mt-0.5 shrink-0" />
                )}
                {status === "offline"
                  ? "You are offline. This will be saved here and sent when you reconnect."
                  : "The server is still starting. Go ahead — this will be sent as soon as it answers."}
              </p>
            )}

            {/* Amount */}
            <div className="px-5 pt-5 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Amount
              </p>
              <p
                className={`mt-1 break-all font-bold tabular-nums ${
                  isExpression ? "text-3xl" : "text-5xl"
                } ${amount ? "text-white" : "text-slate-600"}`}
              >
                {amount ? amount.replace(/^/, "₹") : "₹0"}
              </p>

              {/* The running result, so a half-typed sum is never a mystery */}
              {isExpression && (
                <p
                  className={`mt-1 text-2xl font-bold tabular-nums ${
                    error ? "text-red-300" : "text-emerald-300"
                  }`}
                >
                  {error ? error : `= ${money(resolved ?? 0)}`}
                </p>
              )}
              {selectedAccount && (
                <p className="mt-1 text-xs text-slate-500">
                  {isCard(selectedAccount)
                    ? `${selectedAccount.name} · ${money(getOutstanding(selectedAccount))} owed`
                    : `${selectedAccount.name} · ${money(selectedAccount.balance)} available`}
                </p>
              )}
            </div>

            {/* Categories */}
            <div className="px-5 pt-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                {shortlist.map((name) => (
                  <button
                    key={name}
                    onClick={() => setCategory(name)}
                    className={`rounded-xl border px-3 py-2.5 text-sm transition active:scale-95 ${
                      category === name
                        ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                        : "border-white/10 bg-slate-800 text-slate-300"
                    }`}
                  >
                    {name}
                  </button>
                ))}

                {(categories.length || FALLBACK_CATEGORIES.length) > 6 && (
                  <button
                    onClick={() => setShowAllCategories((prev) => !prev)}
                    className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm text-slate-400 transition active:scale-95"
                  >
                    {showAllCategories ? "Less" : "More"}
                    <FiChevronDown
                      className={showAllCategories ? "rotate-180" : ""}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Accounts */}
            <div className="px-5 pt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Paid from
              </p>

              {accounts.length === 0 ? (
                <p className="rounded-xl bg-slate-800 p-3 text-xs text-slate-400">
                  No accounts cached yet. Once the app has loaded once, they
                  are available here even before the server answers.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accounts.map((account) => (
                    <button
                      key={account._id}
                      onClick={() => setAccountId(account._id)}
                      className={`rounded-xl border px-3 py-2.5 text-sm transition active:scale-95 ${
                        accountId === account._id
                          ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                          : "border-white/10 bg-slate-800 text-slate-300"
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note */}
            <div className="px-5 pt-4">
              <input
                aria-label="Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-sm"
              />
            </div>

            {/* Keypad - large targets, operators included, no system keyboard */}
            <div className="mt-4 px-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Maths works — 20 + 10, or 900 + 18%
                </p>
                {amount && (
                  <button
                    onClick={() => press("clear")}
                    className="rounded-lg px-2 py-1 text-xs text-slate-400 transition active:scale-95"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {KEYPAD.flat().map((key) => {
                  const isOperator = OPERATOR_KEYS.has(key);

                  return (
                    <button
                      key={key}
                      onClick={() => press(key)}
                      aria-label={key === "back" ? "Delete last character" : key}
                      className={`
                        flex h-14 items-center justify-center rounded-2xl border
                        text-xl font-semibold transition active:scale-95
                        ${
                          isOperator
                            ? "border-indigo-400/30 bg-indigo-400/10 text-indigo-200"
                            : "border-white/10 bg-slate-800 active:bg-slate-700"
                        }
                      `}
                    >
                      {key === "back" ? <FiDelete /> : key}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !(value > 0)}
                className="
                  flex w-full items-center justify-center gap-2 rounded-2xl
                  bg-indigo-400 py-4 text-base font-semibold text-slate-950
                  transition active:scale-[0.98] disabled:opacity-40
                "
              >
                <FiCheck size={20} />
                {saving
                  ? "Saving…"
                  : isReachable
                    ? `Add ${value > 0 ? money(value) : "expense"}`
                    : `Save ${value > 0 ? money(value) : ""} for later`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
