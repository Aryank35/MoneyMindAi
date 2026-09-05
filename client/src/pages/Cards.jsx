import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiEdit2,
  FiFileText,
  FiPlus,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";
import Modal from "../components/common/Modal";
import StatementModal from "../components/common/StatementModal";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import EmptyState from "../components/common/EmptyState";
import { Skeleton } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";

import {
  getCardsOverview,
  getAccountsByUser,
  createAccount,
  updateAccount,
} from "../services/accountService";
import { createTransfer } from "../services/transferService";
import { getUserId } from "../utils/auth";
import { money } from "../utils/incomeFormulas";

const NETWORKS = ["Visa", "Mastercard", "RuPay", "Amex", "Diners", "Other"];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// Urgency drives colour everywhere on this page, so the mapping lives once.
const DUE_TONES = {
  overdue: {
    ring: "border-red-500/40",
    chip: "bg-red-500/15 text-red-200 border-red-500/30",
    bar: "bg-red-400",
  },
  today: {
    ring: "border-amber-400/40",
    chip: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    bar: "bg-amber-400",
  },
  urgent: {
    ring: "border-amber-400/30",
    chip: "bg-amber-500/10 text-amber-200 border-amber-500/20",
    bar: "bg-amber-400",
  },
  soon: {
    ring: "border-white/10",
    chip: "bg-white/5 text-slate-300 border-white/10",
    bar: "bg-indigo-400",
  },
  scheduled: {
    ring: "border-white/10",
    chip: "bg-white/5 text-slate-400 border-white/10",
    bar: "bg-indigo-400",
  },
  clear: {
    ring: "border-white/10",
    chip: "bg-emerald-500/10 text-emerald-200 border-emerald-500/20",
    bar: "bg-emerald-400",
  },
};

const emptyCardForm = () => ({
  name: "",
  last4: "",
  network: "Visa",
  issuer: "",
  creditLimit: "",
  statementDay: 1,
  dueDay: 20,
  balance: "",
});

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const formatDayMonth = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "-";

export default function Cards() {
  const toast = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [cardForm, setCardForm] = useState(emptyCardForm);

  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", fromAccountId: "" });

  const [statementAccount, setStatementAccount] = useState(null);

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: "easeOut" },
        };

  const loadPage = async () => {
    try {
      const userId = getUserId();

      const [cardsRes, accountsRes] = await Promise.all([
        getCardsOverview(userId),
        getAccountsByUser(userId),
      ]);

      setOverview(cardsRes.data || null);
      setAccounts(accountsRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadPage, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Anything that isn't a card can fund a payment.
  const fundingAccounts = useMemo(
    () => accounts.filter((account) => account.type !== "Credit Card"),
    [accounts],
  );

  const cards = overview?.cards || [];
  const totals = overview?.totals || {
    count: 0,
    outstanding: 0,
    due: 0,
    creditLimit: 0,
    currentCycleSpend: 0,
  };

  const overallUtilisation =
    totals.creditLimit > 0
      ? Math.round((totals.outstanding / totals.creditLimit) * 100)
      : null;

  const needsAttention = cards.filter((card) => card.dueStatus.severity >= 2);

  // =====================================================================
  // CARD CRUD
  // =====================================================================

  const openAddCard = () => {
    setEditingCard(null);
    setCardForm(emptyCardForm());
    setShowCardModal(true);
  };

  const openEditCard = (card) => {
    setEditingCard(card);
    setCardForm({
      name: card.name || "",
      last4: card.card?.last4 || "",
      network: card.card?.network || "Visa",
      issuer: card.card?.issuer || "",
      creditLimit: String(card.card?.creditLimit || ""),
      statementDay: card.card?.statementDay || 1,
      dueDay: card.card?.dueDay || 20,
      balance: String(card.card?.openingOutstanding || ""),
    });
    setShowCardModal(true);
  };

  const handleSaveCard = async () => {
    if (!cardForm.name.trim()) {
      toast.error("Give the card a name");
      return;
    }

    if (cardForm.last4 && !/^\d{4}$/.test(cardForm.last4)) {
      toast.error("Last 4 digits must be exactly four numbers");
      return;
    }

    try {
      setSaving(true);

      // Money already owed is entered as a positive figure; the ledger works
      // in negative balances.
      const openingOutstanding = Math.abs(Number(cardForm.balance || 0));

      const payload = {
        name: cardForm.name.trim(),
        type: "Credit Card",
        card: {
          last4: cardForm.last4,
          network: cardForm.network,
          issuer: cardForm.issuer.trim(),
          creditLimit: Number(cardForm.creditLimit || 0),
          statementDay: Number(cardForm.statementDay),
          dueDay: Number(cardForm.dueDay),
          // Always sent: a `card` update replaces the whole subdocument, so
          // leaving it out would quietly reset the carried debt to zero.
          openingOutstanding,
        },
      };

      if (editingCard) {
        // The server moves `balance` by the change, so the spends and
        // payments logged since survive the edit.
        await updateAccount(editingCard._id, payload);
        toast.success("Card updated");
      } else {
        await createAccount({
          ...payload,
          userId: getUserId(),
          balance: -openingOutstanding,
        });
        toast.success("Card added");
      }

      setShowCardModal(false);
      setEditingCard(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================================
  // PAYMENT - a transfer from a funding account into the card
  // =====================================================================

  const openPay = (card) => {
    setPayTarget(card);
    setPayForm({
      amount: String(card.amountDue || card.outstanding || ""),
      fromAccountId: fundingAccounts[0]?._id || "",
    });
  };

  const handlePay = async () => {
    const amount = Number(payForm.amount);

    if (!(amount > 0)) {
      toast.error("Enter an amount greater than 0");
      return;
    }

    if (!payForm.fromAccountId) {
      toast.error("Choose the account to pay from");
      return;
    }

    try {
      setSaving(true);

      await createTransfer({
        userId: getUserId(),
        fromAccountId: payForm.fromAccountId,
        toAccountId: payTarget._id,
        amount,
        transferDate: new Date(),
        note: `Payment to ${payTarget.name}`,
      });

      toast.success(`${money(amount)} paid to ${payTarget.name}`);
      setPayTarget(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  const payFromAccount = accounts.find(
    (account) => account._id === payForm.fromAccountId,
  );

  // =====================================================================
  // RENDER
  // =====================================================================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-slate-950 text-white">
          <Skeleton className="mb-6 h-40" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 text-white">
        {/* ============ HEADER ============ */}
        <motion.section
          {...motionProps(0)}
          className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-8"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Credit Cards
              </p>
              <h1 className="mt-2 text-4xl">
                {money(totals.outstanding)}{" "}
                <span className="font-sans text-base text-slate-400">
                  outstanding
                </span>
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Across {totals.count} card{totals.count === 1 ? "" : "s"}
                {overallUtilisation !== null &&
                  ` · ${overallUtilisation}% of ${money(totals.creditLimit)} limit used`}
              </p>
            </div>

            <Button icon={FiPlus} onClick={openAddCard}>
              Add Card
            </Button>
          </div>

          {totals.count > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Due now", money(totals.due), "text-amber-300"],
                ["Outstanding", money(totals.outstanding), "text-red-300"],
                [
                  "Available credit",
                  money(Math.max(totals.creditLimit - totals.outstanding, 0)),
                  "text-emerald-300",
                ],
                ["This cycle", money(totals.currentCycleSpend), ""],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-xl bg-slate-800/80 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className={`mt-1 break-words text-2xl font-bold ${tone}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Reminders */}
          {needsAttention.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                <FiAlertTriangle />
                {needsAttention.length} card
                {needsAttention.length === 1 ? "" : "s"} need
                {needsAttention.length === 1 ? "s" : ""} paying
              </p>

              <div className="mt-3 space-y-2">
                {needsAttention.map((card) => (
                  <div
                    key={card._id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/20 p-3"
                  >
                    <span className="text-sm">
                      <span className="font-semibold">{card.name}</span>
                      <span className="text-amber-200/80">
                        {" "}
                        — {card.dueStatus.label}, {money(card.amountDue)} due by{" "}
                        {formatDate(card.cycle.dueDate)}
                      </span>
                    </span>
                    <Button size="sm" onClick={() => openPay(card)}>
                      Pay now
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.section>

        {/* ============ CARDS ============ */}
        {cards.length === 0 ? (
          <EmptyState
            icon={FiCreditCard}
            title="No credit cards yet"
            message="Add a card to track its spending, statement cycle and payment dues."
            action={
              <Button icon={FiPlus} onClick={openAddCard}>
                Add your first card
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {cards.map((card, index) => {
              const tone = DUE_TONES[card.dueStatus.key] || DUE_TONES.scheduled;
              const utilisation = card.utilisation ?? 0;

              return (
                <motion.div
                  key={card._id}
                  {...motionProps(0.05 * index)}
                  className={`rounded-3xl border bg-slate-900 p-6 ${tone.ring}`}
                >
                  {/* Card face */}
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {card.card?.issuer || "Credit Card"}
                        </p>
                        <p className="mt-1 text-lg font-semibold">
                          {card.name}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {card.card?.network || "Card"}
                      </span>
                    </div>

                    <p className="mt-6 font-mono text-lg tracking-[0.3em] text-slate-400">
                      ····&nbsp;····&nbsp;····&nbsp;{card.card?.last4 || "····"}
                    </p>

                    <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          {card.creditBalance > 0 ? "In credit" : "Outstanding"}
                        </p>
                        <p
                          className={`break-words text-3xl font-bold ${
                            card.creditBalance > 0
                              ? "text-emerald-300"
                              : card.outstanding > 0
                                ? "text-red-300"
                                : "text-slate-200"
                          }`}
                        >
                          {money(card.creditBalance || card.outstanding)}
                        </p>
                      </div>

                      {card.card?.creditLimit > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Available</p>
                          <p className="text-lg font-semibold text-emerald-300">
                            {money(card.availableCredit)}
                          </p>
                        </div>
                      )}
                    </div>

                    {card.card?.creditLimit > 0 && (
                      <div className="mt-4">
                        <div className="h-1 w-full rounded-full bg-white/10">
                          <div
                            className={`h-1 rounded-full transition-all ${
                              utilisation >= 70 ? "bg-red-400" : tone.bar
                            }`}
                            style={{ width: `${Math.min(utilisation, 100)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {utilisation}% of {money(card.card.creditLimit)} used
                          {utilisation >= 70 && " — high utilisation"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cycle */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-800/80 p-4">
                      <p className="flex items-center gap-2 text-sm text-slate-400">
                        <FiCalendar className="shrink-0" />
                        Payment due
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {money(card.amountDue)}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs ${tone.chip}`}
                      >
                        {card.dueStatus.key === "clear" ? (
                          <span className="flex items-center gap-1">
                            <FiCheckCircle />
                            {card.dueStatus.label}
                          </span>
                        ) : (
                          card.dueStatus.label
                        )}
                      </span>
                      <p className="mt-2 text-xs text-slate-500">
                        By {formatDate(card.cycle.dueDate)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/80 p-4">
                      <p className="text-sm text-slate-400">This cycle</p>
                      <p className="mt-1 text-xl font-bold">
                        {money(card.currentCycleSpend)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Last statement {money(card.lastStatementSpend)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Next statement{" "}
                        {formatDayMonth(card.cycle.nextStatementDate)}
                      </p>
                    </div>
                  </div>

                  {card.paidSinceStatement > 0 && (
                    <p className="mt-3 text-xs text-emerald-300">
                      {money(card.paidSinceStatement)} already paid since the
                      last statement.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => openPay(card)}
                      disabled={card.outstanding <= 0}
                    >
                      Pay
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={FiFileText}
                      onClick={() =>
                        setStatementAccount({
                          _id: card._id,
                          name: card.name,
                          type: "Credit Card",
                        })
                      }
                    >
                      Statement
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={FiEdit2}
                      onClick={() => openEditCard(card)}
                    >
                      Edit
                    </Button>
                    <Link
                      to="/expenses"
                      className="inline-flex items-center rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                      Add spend
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ============ ADD / EDIT CARD ============ */}
        <Modal
          isOpen={showCardModal}
          onClose={() => {
            setShowCardModal(false);
            setEditingCard(null);
          }}
          title={editingCard ? "Edit Card" : "Add Credit Card"}
          maxWidth="max-w-2xl"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Card Name"
              placeholder="HDFC Regalia"
              value={cardForm.name}
              onChange={(e) =>
                setCardForm({ ...cardForm, name: e.target.value })
              }
            />

            <Input
              label="Issuer"
              placeholder="HDFC Bank"
              value={cardForm.issuer}
              onChange={(e) =>
                setCardForm({ ...cardForm, issuer: e.target.value })
              }
            />

            <Input
              label="Last 4 Digits"
              placeholder="4321"
              inputMode="numeric"
              maxLength={4}
              value={cardForm.last4}
              onChange={(e) =>
                setCardForm({
                  ...cardForm,
                  last4: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
            />

            <Select
              label="Network"
              value={cardForm.network}
              onChange={(e) =>
                setCardForm({ ...cardForm, network: e.target.value })
              }
            >
              {NETWORKS.map((network) => (
                <option key={network}>{network}</option>
              ))}
            </Select>

            <Input
              label="Credit Limit"
              type="number"
              placeholder="200000"
              value={cardForm.creditLimit}
              onChange={(e) =>
                setCardForm({ ...cardForm, creditLimit: e.target.value })
              }
            />

            <Input
              label="Opening Outstanding"
              type="number"
              placeholder="0"
              value={cardForm.balance}
              onChange={(e) =>
                setCardForm({ ...cardForm, balance: e.target.value })
              }
              hint={
                editingCard
                  ? "Debt carried from before you started tracking this card. Expenses and payments logged here are counted on top."
                  : "Anything already owed on this card today."
              }
            />

            <Select
              label="Statement Day"
              value={cardForm.statementDay}
              onChange={(e) =>
                setCardForm({ ...cardForm, statementDay: e.target.value })
              }
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </Select>

            <Select
              label="Payment Due Day"
              value={cardForm.dueDay}
              onChange={(e) =>
                setCardForm({ ...cardForm, dueDay: e.target.value })
              }
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </Select>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            A day beyond the length of a short month is applied on its last day
            — a statement day of 31 falls on 28 February.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCardModal(false);
                setEditingCard(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCard} loading={saving}>
              {editingCard ? "Save Changes" : "Add Card"}
            </Button>
          </div>
        </Modal>

        {/* ============ PAY ============ */}
        <Modal
          isOpen={!!payTarget}
          onClose={() => setPayTarget(null)}
          title={payTarget ? `Pay ${payTarget.name}` : "Pay card"}
        >
          {fundingAccounts.length === 0 ? (
            <EmptyState
              icon={FiCreditCard}
              title="No account to pay from"
              message="Add a bank, cash or wallet account before paying a card."
            />
          ) : (
            <>
              <div className="grid gap-3">
                <Input
                  label="Amount"
                  type="number"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm({ ...payForm, amount: e.target.value })
                  }
                />

                <div className="flex flex-wrap gap-2">
                  {payTarget?.amountDue > 0 && (
                    <button
                      onClick={() =>
                        setPayForm({
                          ...payForm,
                          amount: String(payTarget.amountDue),
                        })
                      }
                      className="rounded-lg bg-indigo-400/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-400/20"
                    >
                      Minimum due {money(payTarget.amountDue)}
                    </button>
                  )}
                  {payTarget?.outstanding > 0 && (
                    <button
                      onClick={() =>
                        setPayForm({
                          ...payForm,
                          amount: String(payTarget.outstanding),
                        })
                      }
                      className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
                    >
                      Full balance {money(payTarget.outstanding)}
                    </button>
                  )}
                </div>

                <Select
                  label="Pay From"
                  value={payForm.fromAccountId}
                  onChange={(e) =>
                    setPayForm({ ...payForm, fromAccountId: e.target.value })
                  }
                >
                  {fundingAccounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name} — {money(account.balance)}
                    </option>
                  ))}
                </Select>
              </div>

              {payFromAccount &&
                Number(payForm.amount) > Number(payFromAccount.balance) && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                    <FiAlertTriangle className="mt-0.5 shrink-0" />
                    This is more than {payFromAccount.name} holds (
                    {money(payFromAccount.balance)}). It will take that account
                    negative.
                  </p>
                )}

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setPayTarget(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handlePay} loading={saving}>
                  Pay {money(payForm.amount)}
                </Button>
              </div>
            </>
          )}
        </Modal>

        <StatementModal
          account={statementAccount}
          isOpen={!!statementAccount}
          onClose={() => setStatementAccount(null)}
        />
      </div>
    </DashboardLayout>
  );
}
