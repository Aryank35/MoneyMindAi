import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FiAlertTriangle,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCheck,
  FiEdit2,
  FiRotateCcw,
  FiSlash,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import EmptyState from "../components/common/EmptyState";
import { Skeleton } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";

import {
  getObligationOverview,
  createObligation,
  updateObligation,
  settleObligation,
  undoSettlement,
  getObligationDeleteImpact,
  deleteObligation,
} from "../services/obligationService";
import { getAccountsByUser } from "../services/accountService";
import { getUserId } from "../utils/auth";
import { money } from "../utils/incomeFormulas";

const STATUS_TONES = {
  overdue: { row: "border-red-500/40 bg-red-500/5", chip: "bg-red-500/15 text-red-200" },
  today: { row: "border-amber-400/40", chip: "bg-amber-500/15 text-amber-200" },
  urgent: { row: "border-amber-400/25", chip: "bg-amber-500/10 text-amber-200" },
  soon: { row: "border-white/10", chip: "bg-white/5 text-slate-300" },
  scheduled: { row: "border-white/10", chip: "bg-white/5 text-slate-400" },
  undated: { row: "border-amber-400/20", chip: "bg-amber-500/10 text-amber-200" },
  settled: { row: "border-white/5 opacity-70", chip: "bg-emerald-500/15 text-emerald-200" },
  "written-off": { row: "border-white/5 opacity-60", chip: "bg-white/5 text-slate-500" },
  clear: { row: "border-white/10", chip: "bg-white/5 text-slate-400" },
};

const toInputDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "no date agreed";

const emptyForm = () => ({
  direction: "lent",
  counterparty: "",
  relationship: "",
  principal: "",
  accountId: "",
  promiseDate: "",
  agreedOn: toInputDate(new Date()),
  note: "",
  adjustBalance: true,
});

export default function Lending() {
  const toast = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [settleTarget, setSettleTarget] = useState(null);
  const [settleForm, setSettleForm] = useState({ amount: "", accountId: "", note: "" });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [tab, setTab] = useState("open");

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

      const [overviewRes, accountsRes] = await Promise.all([
        getObligationOverview(userId),
        getAccountsByUser(userId),
      ]);

      setOverview(overviewRes.data || null);
      setAccounts(accountsRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load lending records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadPage, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = overview?.totals || {
    owedToMe: 0,
    iOwe: 0,
    net: 0,
    openCount: 0,
    overdue: 0,
    undated: 0,
    writtenOff: 0,
  };

  const all = overview?.obligations || [];

  const visible = all.filter((item) => {
    if (tab === "open") return !item.isClosed;
    if (tab === "lent") return item.direction === "lent" && !item.isClosed;
    if (tab === "borrowed") return item.direction === "borrowed" && !item.isClosed;

    return item.isClosed;
  });

  // =====================================================================
  // FORM
  // =====================================================================

  const openAdd = (direction = "lent") => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      direction,
      accountId: accounts[0]?._id || "",
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      direction: item.direction,
      counterparty: item.counterparty || "",
      relationship: item.relationship || "",
      principal: String(item.principal ?? ""),
      accountId: item.accountId || "",
      promiseDate: toInputDate(item.promiseDate),
      agreedOn: toInputDate(item.agreedOn),
      note: item.note || "",
      adjustBalance: false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.counterparty.trim()) {
      toast.error(
        form.direction === "lent"
          ? "Who did you lend it to?"
          : "Who did you borrow it from?",
      );
      return;
    }

    if (!(Number(form.principal) > 0)) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        userId: getUserId(),
        principal: Number(form.principal),
        promiseDate: form.promiseDate || null,
      };

      if (editing) {
        await updateObligation(editing._id, payload);
        toast.success("Record updated");
      } else {
        const response = await createObligation(payload);

        toast.success(
          response.balanceMoved
            ? form.direction === "lent"
              ? `${money(form.principal)} recorded and debited`
              : `${money(form.principal)} recorded and credited`
            : "Record added",
        );
      }

      setShowModal(false);
      setEditing(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================================
  // SETTLEMENT
  // =====================================================================

  const openSettle = (item) => {
    setSettleTarget(item);
    setSettleForm({
      amount: String(item.outstanding),
      accountId: item.accountId || accounts[0]?._id || "",
      note: "",
    });
  };

  const handleSettle = async () => {
    const amount = Number(settleForm.amount);

    if (!(amount > 0)) {
      toast.error("Enter an amount greater than 0");
      return;
    }

    try {
      setSaving(true);

      await settleObligation(settleTarget._id, {
        amount,
        accountId: settleForm.accountId || null,
        note: settleForm.note,
      });

      toast.success(
        settleTarget.direction === "lent"
          ? `${money(amount)} received back`
          : `${money(amount)} repaid`,
      );

      setSettleTarget(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Could not record it");
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async (item) => {
    try {
      setBusyId(item._id);
      await undoSettlement(item._id);
      toast.success("Last repayment undone and the balance restored");
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Could not undo");
    } finally {
      setBusyId(null);
    }
  };

  const toggleWriteOff = async (item) => {
    try {
      setBusyId(item._id);
      await updateObligation(item._id, { writtenOff: !item.writtenOff });
      toast.success(item.writtenOff ? "Reopened" : "Written off");
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error("Could not update");
    } finally {
      setBusyId(null);
    }
  };

  const requestDelete = async (item) => {
    setDeleteTarget(item);
    setDeleteImpact(null);

    try {
      const response = await getObligationDeleteImpact(item._id);

      setDeleteImpact(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteObligation(deleteTarget._id);
      toast.success("Record removed");
      setDeleteTarget(null);
      setDeleteImpact(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error("Could not remove");
    } finally {
      setDeleting(false);
    }
  };

  const deleteMessage = () => {
    if (!deleteTarget) return "";

    if (!deleteImpact) {
      return `This removes the record for ${deleteTarget.counterparty}. This cannot be undone.`;
    }

    const verb = deleteImpact.direction === "lent" ? "lent to" : "borrowed from";

    return `This removes the record of ${money(deleteImpact.principal)} ${verb} ${deleteImpact.counterparty}, with ${money(deleteImpact.outstanding)} still outstanding. Account balances are left as they are — deleting the record does not un-move the money. This cannot be undone.`;
  };

  // =====================================================================
  // RENDER
  // =====================================================================

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="mb-6 h-40" />
        <Skeleton className="h-72" />
      </DashboardLayout>
    );
  }

  const isLent = form.direction === "lent";

  return (
    <DashboardLayout>
      {/* ============ HEADER ============ */}
      <motion.section
        {...motionProps(0)}
        className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-6 lg:p-8"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Lending & Borrowing
            </p>
            <h1 className="mt-2 text-4xl">
              {money(Math.abs(totals.net))}
              <span className="ml-2 font-sans text-base text-slate-400">
                {totals.net >= 0 ? "owed to you, net" : "you owe, net"}
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Money lent out is an asset you cannot spend; money borrowed is a
              debt. Both move real balances when recorded and repaid.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button icon={FiArrowUpRight} onClick={() => openAdd("lent")}>
              I lent money
            </Button>
            <Button
              variant="secondary"
              icon={FiArrowDownLeft}
              onClick={() => openAdd("borrowed")}
            >
              I borrowed
            </Button>
          </div>
        </div>

        {all.length > 0 && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Owed to you", money(totals.owedToMe), "text-emerald-300"],
                ["You owe", money(totals.iOwe), "text-red-300"],
                [
                  "Overdue",
                  totals.overdue,
                  totals.overdue > 0 ? "text-red-300" : "text-slate-300",
                ],
                [
                  "No date agreed",
                  totals.undated,
                  totals.undated > 0 ? "text-amber-300" : "text-slate-300",
                  "The kind that never comes back",
                ],
              ].map(([label, value, tone, sub]) => (
                <div key={label} className="rounded-xl bg-slate-800/80 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className={`mt-1 break-words text-2xl font-bold ${tone || ""}`}>
                    {value}
                  </p>
                  {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
                </div>
              ))}
            </div>

            {(overview?.people || []).length > 0 && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <FiUsers />
                  By person
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {overview.people.map((person) => (
                    <span
                      key={person.name}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
                      title={`${money(person.owesMe)} owed to you, ${money(person.iOwe)} owed by you`}
                    >
                      {person.name}{" "}
                      <span
                        className={
                          person.net >= 0 ? "text-emerald-300" : "text-red-300"
                        }
                      >
                        {person.net >= 0 ? "+" : "−"}
                        {money(Math.abs(person.net))}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.section>

      {/* ============ LIST ============ */}
      {all.length === 0 ? (
        <EmptyState
          icon={FiUsers}
          title="Nothing recorded"
          message="Track money you have lent out or borrowed, with the date it was promised back."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={FiArrowUpRight} onClick={() => openAdd("lent")}>
                I lent money
              </Button>
              <Button
                variant="secondary"
                icon={FiArrowDownLeft}
                onClick={() => openAdd("borrowed")}
              >
                I borrowed
              </Button>
            </div>
          }
        />
      ) : (
        <motion.section
          {...motionProps(0.05)}
          className="rounded-2xl border border-white/10 bg-slate-900 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Records</h2>

            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-800 p-1">
              {[
                { key: "open", label: "Open" },
                { key: "lent", label: "Lent out" },
                { key: "borrowed", label: "Borrowed" },
                { key: "closed", label: "Closed" },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setTab(option.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    tab === option.key
                      ? "bg-indigo-400/15 text-indigo-200"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {visible.length === 0 ? (
              <EmptyState
                icon={FiUsers}
                title="Nothing here"
                message="No records in this view."
              />
            ) : (
              visible.map((item) => {
                const tone = STATUS_TONES[item.status.key] || STATUS_TONES.clear;
                const busy = busyId === item._id;
                const lent = item.direction === "lent";

                return (
                  <div
                    key={item._id}
                    className={`rounded-2xl border p-4 transition-colors ${tone.row}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {lent ? (
                            <FiArrowUpRight className="shrink-0 text-emerald-300" />
                          ) : (
                            <FiArrowDownLeft className="shrink-0 text-red-300" />
                          )}
                          <span className="break-words">{item.counterparty}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${tone.chip}`}>
                            {item.status.label}
                          </span>
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {lent ? "You lent" : "You borrowed"}{" "}
                          {money(item.principal)}
                          {item.relationship && ` · ${item.relationship}`}
                          {" · due "}
                          {formatDate(item.promiseDate)}
                        </p>

                        {item.settlementCount > 0 && (
                          <p className="mt-1 text-xs text-emerald-300">
                            {money(item.settledAmount)} of{" "}
                            {money(item.principal)} settled across{" "}
                            {item.settlementCount} payment
                            {item.settlementCount === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p
                          className={`break-words text-xl font-bold ${
                            item.isClosed
                              ? "text-slate-400"
                              : lent
                                ? "text-emerald-300"
                                : "text-red-300"
                          }`}
                        >
                          {money(item.outstanding)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.isClosed ? "cleared" : "outstanding"}
                        </p>
                      </div>
                    </div>

                    {item.progressPercentage > 0 && !item.isClosed && (
                      <div className="mt-3 h-1 w-full rounded-full bg-white/5">
                        <div
                          className="h-1 rounded-full bg-emerald-400"
                          style={{ width: `${item.progressPercentage}%` }}
                        />
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {!item.isClosed && (
                        <button
                          onClick={() => openSettle(item)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-400 px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:opacity-50"
                        >
                          <FiCheck />
                          {lent ? "Got it back" : "Repay"}
                        </button>
                      )}

                      {item.settlementCount > 0 && (
                        <button
                          onClick={() => handleUndo(item)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20 disabled:opacity-50"
                        >
                          <FiRotateCcw />
                          Undo last
                        </button>
                      )}

                      {lent && item.outstanding > 0 && (
                        <button
                          onClick={() => toggleWriteOff(item)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20 disabled:opacity-50"
                        >
                          <FiSlash />
                          {item.writtenOff ? "Reopen" : "Write off"}
                        </button>
                      )}

                      <button
                        onClick={() => openEdit(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20"
                      >
                        <FiEdit2 />
                        Edit
                      </button>

                      <button
                        onClick={() => requestDelete(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-red-300 transition hover:border-red-500/40"
                      >
                        <FiTrash2 />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.section>
      )}

      {/* ============ ADD / EDIT ============ */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        title={editing ? "Edit Record" : isLent ? "Money I Lent" : "Money I Borrowed"}
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-wrap gap-2">
          {[
            { key: "lent", label: "I lent it out", icon: FiArrowUpRight },
            { key: "borrowed", label: "I borrowed it", icon: FiArrowDownLeft },
          ].map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.key}
                onClick={() => setForm({ ...form, direction: option.key })}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  form.direction === option.key
                    ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                    : "border-white/10 bg-slate-800 text-slate-300 hover:border-white/30"
                }`}
              >
                <Icon />
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            label={isLent ? "Lent to" : "Borrowed from"}
            placeholder="Ravi"
            value={form.counterparty}
            onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
          />

          <Input
            label="Relationship (optional)"
            placeholder="Cousin"
            value={form.relationship}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          />

          <Input
            label="Amount"
            type="number"
            value={form.principal}
            onChange={(e) => setForm({ ...form, principal: e.target.value })}
          />

          <Select
            label={isLent ? "Paid out from" : "Received into"}
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">Not through an account</option>
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name} — {money(account.balance)}
              </option>
            ))}
          </Select>

          <Input
            label="Promised back by"
            type="date"
            value={form.promiseDate}
            onChange={(e) => setForm({ ...form, promiseDate: e.target.value })}
          />

          <Input
            label="Agreed on"
            type="date"
            value={form.agreedOn}
            onChange={(e) => setForm({ ...form, agreedOn: e.target.value })}
          />

          <Input
            label="Note"
            containerClassName="md:col-span-2"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>

        {!form.promiseDate && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            No date set. Undated lending is the kind that quietly never comes
            back — worth agreeing one even loosely.
          </p>
        )}

        {!editing && form.accountId && (
          <label className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 bg-slate-800 p-3 text-sm text-slate-300">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.adjustBalance}
              onChange={(e) =>
                setForm({ ...form, adjustBalance: e.target.checked })
              }
            />
            <span>
              Move the money now
              <span className="mt-1 block text-xs text-slate-500">
                {form.adjustBalance
                  ? isLent
                    ? "The amount will be debited from the account."
                    : "The amount will be credited to the account."
                  : "Balances stay as they are — right for something that happened a while ago and is already reflected."}
              </span>
            </span>
          </label>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowModal(false);
              setEditing(null);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editing ? "Save Changes" : "Add Record"}
          </Button>
        </div>
      </Modal>

      {/* ============ SETTLE ============ */}
      <Modal
        isOpen={!!settleTarget}
        onClose={() => setSettleTarget(null)}
        title={
          settleTarget
            ? settleTarget.direction === "lent"
              ? `${settleTarget.counterparty} paid you back`
              : `Repay ${settleTarget.counterparty}`
            : ""
        }
        maxWidth="max-w-md"
      >
        {settleTarget && (
          <>
            <Input
              label="Amount"
              type="number"
              value={settleForm.amount}
              onChange={(e) =>
                setSettleForm({ ...settleForm, amount: e.target.value })
              }
            />

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setSettleForm({
                    ...settleForm,
                    amount: String(settleTarget.outstanding),
                  })
                }
                className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
              >
                All of it · {money(settleTarget.outstanding)}
              </button>
              <button
                onClick={() =>
                  setSettleForm({
                    ...settleForm,
                    amount: String(Math.round(settleTarget.outstanding / 2)),
                  })
                }
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
              >
                Half
              </button>
            </div>

            <Select
              label={
                settleTarget.direction === "lent" ? "Received into" : "Paid from"
              }
              containerClassName="mt-3"
              value={settleForm.accountId}
              onChange={(e) =>
                setSettleForm({ ...settleForm, accountId: e.target.value })
              }
            >
              <option value="">Not through an account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name} — {money(account.balance)}
                </option>
              ))}
            </Select>

            <Input
              label="Note"
              containerClassName="mt-3"
              value={settleForm.note}
              onChange={(e) =>
                setSettleForm({ ...settleForm, note: e.target.value })
              }
            />

            <p className="mt-3 text-xs text-slate-500">
              {settleForm.accountId
                ? settleTarget.direction === "lent"
                  ? "This will be credited to the chosen account."
                  : "This will be debited from the chosen account."
                : "No account chosen — the record updates but no balance moves."}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setSettleTarget(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSettle} loading={saving}>
                Record
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteImpact(null);
        }}
        onConfirm={handleDelete}
        title="Remove this record?"
        message={deleteMessage()}
        confirmLabel="Remove"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
