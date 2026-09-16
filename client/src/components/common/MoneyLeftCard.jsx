import { useEffect, useMemo, useRef, useState } from "react";
import { FiAlertTriangle, FiCheck, FiChevronDown, FiInfo } from "react-icons/fi";

import { Skeleton } from "./Loader";
import {
  getSpendableSummary,
  setSpendableAccounts,
} from "../../services/accountService";
import { getUserId } from "../../utils/auth";
import { money } from "../../utils/incomeFormulas";

// =========================================================================
// MONEY LEFT TO SPEND
//
// Two limits, not one. The bank says how much money exists; the budget says
// how much of it was meant for spending. Only the smaller of the two is
// really available, so it leads - and which one is binding is stated, since
// "you are out of cash" and "you are at your plan" call for opposite
// responses.
//
// Both sides come from the server, off the same ledger the rest of the app
// reads. Letting each page work out its own "budget left" is how the
// Dashboard and Expenses came to quote different numbers for it.
// =========================================================================

export default function MoneyLeftCard({ refreshKey, compact = false }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickerRef = useRef(null);

  // Bumped to pull the figures again after the selection changes; the
  // reserving depends on server-side bills and loans, so it is re-fetched
  // rather than recomputed optimistically.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const userId = getUserId();

        if (!userId) return;

        const response = await getSpendableSummary(userId);

        if (!cancelled) setSummary(response.data);
      } catch (error) {
        console.error("Spendable error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, reloadToken]);

  // A picker left open over a page the user has moved on from is just in the
  // way, so any click outside closes it.
  useEffect(() => {
    if (!open) return undefined;

    const onClick = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);

    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const accounts = useMemo(() => summary?.accounts || [], [summary]);

  const selectable = useMemo(
    () => accounts.filter((account) => account.selectable),
    [accounts],
  );

  const included = useMemo(
    () => selectable.filter((account) => account.included),
    [selectable],
  );

  const toggle = async (accountId) => {
    const next = included.some((account) => account._id === accountId)
      ? included.filter((account) => account._id !== accountId)
      : [...included, accounts.find((account) => account._id === accountId)];

    const ids = next.map((account) => account._id);

    // Reflected immediately; the figures behind it are re-fetched rather than
    // guessed at, because reserving depends on server-side bills and loans.
    setSummary((current) => ({
      ...current,
      accounts: current.accounts.map((account) =>
        account.selectable
          ? { ...account, included: ids.includes(account._id) }
          : account,
      ),
    }));

    try {
      setSaving(true);

      await setSpendableAccounts(getUserId(), ids);
    } catch (error) {
      console.error("Spendable save error:", error);
    } finally {
      setSaving(false);

      // Re-read either way: on failure this puts the optimistic tick back to
      // whatever the server actually holds.
      setReloadToken((value) => value + 1);
    }
  };

  if (loading) {
    return <Skeleton className={compact ? "h-28 rounded-2xl" : "h-44 rounded-2xl"} />;
  }

  if (!summary) return null;

  const safeToSpend = Number(summary.safeToSpend || 0);
  const budgetRemaining = Number(summary.budgetRemaining || 0);
  const hasBudget = Boolean(summary.hasBudget);

  const limitedByCash = summary.limitedBy !== "budget";

  const amount = Number(summary.moneyLeft || 0);

  const unfunded = Number(summary.unfunded || 0);

  const negative = amount < 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">Money left to spend</p>

          <p
            className={`mt-1 text-2xl sm:text-3xl font-bold tabular-nums ${
              negative
                ? "text-red-300"
                : limitedByCash
                  ? "text-emerald-300"
                  : "text-indigo-200"
            }`}
          >
            {money(amount)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {negative
              ? "Your commitments come to more than you hold"
              : limitedByCash
                ? hasBudget
                  ? "Your cash is the limit, not your budget"
                  : "Across the accounts you have selected"
                : "Your budget is the limit — you hold more than this"}
          </p>
        </div>

        {/* The picker sits on the figure it changes, so the question "which
            accounts is this counting?" is answered where it is asked. */}
        <div className="relative shrink-0" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:border-white/20"
          >
            {included.length} of {selectable.length} account
            {selectable.length === 1 ? "" : "s"}
            <FiChevronDown
              className={`transition ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-xl">
              <p className="px-2 py-1.5 text-xs text-slate-500">
                Count toward money left
              </p>

              {selectable.map((account) => (
                <button
                  key={account._id}
                  type="button"
                  disabled={saving}
                  onClick={() => toggle(account._id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-white/5 disabled:opacity-50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                        account.included
                          ? "border-indigo-400 bg-indigo-400 text-slate-950"
                          : "border-white/20"
                      }`}
                    >
                      {account.included && <FiCheck size={11} />}
                    </span>

                    <span className="truncate">{account.name}</span>
                  </span>

                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    {money(account.balance)}
                  </span>
                </button>
              ))}

              {/* Stated rather than silently omitted: a card showing up as
                  spendable money is the single most misleading thing this
                  card could do. */}
              {accounts.some((account) => !account.selectable) && (
                <p className="mt-1 flex gap-1.5 border-t border-white/5 px-2 pt-2 text-xs text-slate-500">
                  <FiInfo className="mt-0.5 shrink-0" />
                  Cards, EPF and investments are never counted — credit is
                  borrowing, not money you hold.
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      {!compact && (
        <div className="mt-4 space-y-2 border-t border-white/5 pt-4 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-slate-400">In selected accounts</span>

            <span className="tabular-nums">
              {money(summary.spendableCash || 0)}
            </span>
          </div>

          {(summary.reservedItems || []).map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="min-w-0 truncate text-slate-500">
                {item.label}
              </span>

              <span className="shrink-0 tabular-nums text-slate-400">
                −{money(item.amount)}
              </span>
            </div>
          ))}

          <div className="flex items-baseline justify-between gap-3 border-t border-white/5 pt-2 font-semibold">
            <span>Safe to spend</span>

            <span
              className={`tabular-nums ${
                safeToSpend < 0 ? "text-red-300" : "text-emerald-300"
              }`}
            >
              {money(safeToSpend)}
            </span>
          </div>

          {hasBudget && (
            <div className="flex items-baseline justify-between gap-3 text-slate-400">
              <span>Budget left this month</span>

              <span className="tabular-nums">{money(budgetRemaining)}</span>
            </div>
          )}
        </div>
      )}

      {/* The part of the plan with no money behind it. Worth saying plainly:
          it is the difference between a budget and a wish. */}
      {unfunded > 0 && (
        <p className="mt-3 flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
          <FiAlertTriangle className="mt-0.5 shrink-0" />

          <span>
            {money(unfunded)} of your remaining budget is not backed by cash.
            Either trim the plan or move money in.
          </span>
        </p>
      )}
    </section>
  );
}
