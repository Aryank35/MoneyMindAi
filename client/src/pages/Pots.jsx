import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiLink,
  FiPlus,
  FiShield,
  FiTarget,
  FiTrash2,
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
  getPotOverview,
  createPot,
  updatePot,
  fundPot,
  withdrawFromPot,
  getPotDeleteImpact,
  deletePot,
} from "../services/potService";
import { getAccountsByUser } from "../services/accountService";
import { getInvestmentsByUser } from "../services/investmentService";
import { getUserId } from "../utils/auth";
import { money } from "../utils/incomeFormulas";

const STATUS_TONES = {
  Completed: "bg-emerald-500/15 text-emerald-200",
  "On Track": "bg-emerald-500/10 text-emerald-200",
  Behind: "bg-amber-500/15 text-amber-200",
  Urgent: "bg-red-500/15 text-red-200",
  "Not Started": "bg-white/5 text-slate-400",
};

const ICONS = ["🎯", "✈️", "🏠", "🚗", "🎓", "💍", "📱", "🛡️", "🏥", "🎁"];

const toInputDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const emptyForm = () => ({
  kind: "goal",
  backing: "pot",
  itemName: "",
  targetAmount: "",
  targetDate: "",
  priority: "Medium",
  potIcon: "🎯",
  description: "",
  linkedAccountId: "",
  linkedInvestmentId: "",
});

export default function Pots() {
  const toast = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [moveTarget, setMoveTarget] = useState(null);
  const [moveMode, setMoveMode] = useState("fund");
  const [moveForm, setMoveForm] = useState({ amount: "", accountId: "", note: "" });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

      const [overviewRes, accountsRes, investmentsRes] = await Promise.all([
        getPotOverview(userId),
        getAccountsByUser(userId),
        getInvestmentsByUser(userId),
      ]);

      setOverview(overviewRes.data || null);
      setAccounts(accountsRes.data || []);
      setInvestments(investmentsRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load pots");
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
    count: 0,
    saved: 0,
    target: 0,
    remaining: 0,
    setAside: 0,
    monthlyNeeded: 0,
    completed: 0,
    behind: 0,
  };

  const pots = overview?.pots || [];

  // A pot cannot be funded from a credit card - that would be borrowing to
  // save.
  const fundingAccounts = accounts.filter(
    (account) => account.type !== "Credit Card",
  );

  // =====================================================================
  // FORM
  // =====================================================================

  const openAdd = (kind = "goal") => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      kind,
      potIcon: kind === "emergency" ? "🛡️" : "🎯",
    });
    setShowModal(true);
  };

  const openEdit = (pot) => {
    setEditing(pot);
    setForm({
      kind: pot.kind || "goal",
      backing: pot.backing || "pot",
      itemName: pot.itemName || "",
      targetAmount: String(pot.targetAmount ?? ""),
      targetDate: toInputDate(pot.targetDate),
      priority: pot.priority || "Medium",
      potIcon: pot.potIcon || "🎯",
      description: pot.description || "",
      linkedAccountId: pot.linkedAccountId || "",
      linkedInvestmentId: pot.linkedInvestmentId || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.itemName.trim()) {
      toast.error("Give this pot a name");
      return;
    }

    if (!(Number(form.targetAmount) > 0)) {
      toast.error("Target must be greater than 0");
      return;
    }

    try {
      setSaving(true);

      const payload = { ...form, userId: getUserId(), targetAmount: Number(form.targetAmount) };

      if (editing) {
        await updatePot(editing._id, payload);
        toast.success("Pot updated");
      } else {
        await createPot(payload);
        toast.success("Pot created");
      }

      setShowModal(false);
      setEditing(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to save pot");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================================
  // MONEY IN / OUT
  // =====================================================================

  const openMove = (pot, mode) => {
    setMoveTarget(pot);
    setMoveMode(mode);
    setMoveForm({
      amount: mode === "fund" ? String(pot.requiredPerMonth || "") : "",
      accountId: fundingAccounts[0]?._id || "",
      note: "",
    });
  };

  const handleMove = async () => {
    const amount = Number(moveForm.amount);

    if (!(amount > 0)) {
      toast.error("Enter an amount greater than 0");
      return;
    }

    if (!moveForm.accountId) {
      toast.error("Choose an account");
      return;
    }

    try {
      setSaving(true);

      if (moveMode === "fund") {
        await fundPot(moveTarget._id, {
          amount,
          fromAccountId: moveForm.accountId,
          note: moveForm.note,
        });
        toast.success(`${money(amount)} moved into ${moveTarget.itemName}`);
      } else {
        await withdrawFromPot(moveTarget._id, {
          amount,
          toAccountId: moveForm.accountId,
          note: moveForm.note,
        });
        toast.success(`${money(amount)} returned to your account`);
      }

      setMoveTarget(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Could not move the money");
    } finally {
      setSaving(false);
    }
  };

  const moveAccount = accounts.find(
    (account) => account._id === moveForm.accountId,
  );

  // =====================================================================
  // DELETE
  // =====================================================================

  const requestDelete = async (pot) => {
    setDeleteTarget(pot);
    setDeleteImpact(null);

    try {
      const response = await getPotDeleteImpact(pot._id);

      setDeleteImpact(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);

      const response = await deletePot(
        deleteTarget._id,
        fundingAccounts[0]?._id,
      );

      toast.success(
        response.refunded > 0
          ? `Pot removed — ${money(response.refunded)} returned to ${response.refundedTo || "your account"}`
          : "Pot removed",
      );

      setDeleteTarget(null);
      setDeleteImpact(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error("Could not remove the pot");
    } finally {
      setDeleting(false);
    }
  };

  const deleteMessage = () => {
    if (!deleteTarget) return "";

    if (!deleteImpact) {
      return `This removes ${deleteTarget.itemName}. This cannot be undone.`;
    }

    if (deleteImpact.isMirrored) {
      return `This removes the "${deleteImpact.name}" pot. It only mirrors a linked account or investment, so no money moves — the balance it was showing stays exactly where it is. This cannot be undone.`;
    }

    return deleteImpact.savedAmount > 0
      ? `This removes the "${deleteImpact.name}" pot. The ${money(deleteImpact.savedAmount)} it holds is returned to your account rather than lost. This cannot be undone.`
      : `This removes the empty "${deleteImpact.name}" pot. This cannot be undone.`;
  };

  // =====================================================================
  // RENDER
  // =====================================================================

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="mb-6 h-40" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const isMirrorForm = form.backing !== "pot";

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
              Savings Pots
            </p>
            <h1 className="mt-2 text-4xl">
              {money(totals.saved)}
              <span className="ml-2 font-sans text-base text-slate-400">
                toward {money(totals.target)}
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Money set aside for something specific. Fund a pot from any
              account and it genuinely moves — so what is left in your
              accounts is what you can actually spend.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button icon={FiPlus} onClick={() => openAdd("goal")}>
              New Pot
            </Button>
            <Button
              variant="secondary"
              icon={FiShield}
              onClick={() => openAdd("emergency")}
            >
              Emergency Fund
            </Button>
          </div>
        </div>

        {totals.count > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Ring-fenced", money(totals.setAside), "text-emerald-300",
                "Actually moved out of your accounts"],
              ["Still to save", money(totals.remaining), ""],
              ["Needed monthly", money(totals.monthlyNeeded), "",
                "To hit every deadline"],
              [
                "Off track",
                totals.behind,
                totals.behind > 0 ? "text-amber-300" : "text-slate-300",
                `${totals.completed} completed`,
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
        )}
      </motion.section>

      {/* ============ POTS ============ */}
      {pots.length === 0 ? (
        <EmptyState
          icon={FiTarget}
          title="No pots yet"
          message="Create a pot for something you are saving toward, or an emergency fund backed by an account or fixed deposit."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={FiPlus} onClick={() => openAdd("goal")}>
                Create a pot
              </Button>
              <Button
                variant="secondary"
                icon={FiShield}
                onClick={() => openAdd("emergency")}
              >
                Emergency fund
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pots.map((pot, index) => {
            const linked =
              pot.backing === "account"
                ? accounts.find((a) => a._id === pot.linkedAccountId)?.name
                : pot.backing === "investment"
                  ? investments.find((i) => i._id === pot.linkedInvestmentId)?.name
                  : null;

            return (
              <motion.div
                key={pot._id}
                {...motionProps(0.04 * index)}
                className="rounded-2xl border border-white/10 bg-slate-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">{pot.potIcon}</span>
                    <span>
                      <span className="block font-semibold">{pot.itemName}</span>
                      <span className="text-xs text-slate-500">
                        {pot.kind === "emergency" ? "Emergency fund" : pot.priority}
                        {pot.isMirrored && linked && ` · mirrors ${linked}`}
                      </span>
                    </span>
                  </span>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      STATUS_TONES[pot.status] || "bg-white/5 text-slate-400"
                    }`}
                  >
                    {pot.status}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="break-words text-2xl font-bold">
                    {money(pot.savedAmount)}
                    <span className="ml-1 text-sm font-normal text-slate-500">
                      / {money(pot.targetAmount)}
                    </span>
                  </p>

                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/5">
                    <div
                      className="h-1.5 rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${pot.progressPercentage}%` }}
                    />
                  </div>

                  <p className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                    <span>{pot.progressPercentage}% there</span>
                    {pot.daysRemaining !== null && (
                      <span>
                        {pot.daysRemaining < 0
                          ? `${Math.abs(pot.daysRemaining)} days past target`
                          : `${pot.daysRemaining} days left`}
                      </span>
                    )}
                  </p>
                </div>

                {pot.remainingAmount > 0 && pot.requiredPerMonth > 0 && (
                  <p className="mt-3 rounded-xl bg-slate-800/60 p-3 text-xs text-slate-400">
                    {money(pot.requiredPerMonth)} a month to finish on time
                    {pot.requiredPerWeek > 0 &&
                      ` · ${money(pot.requiredPerWeek)} a week`}
                  </p>
                )}

                {pot.isMirrored && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-cyan-500/10 p-3 text-xs text-cyan-200">
                    <FiLink className="mt-0.5 shrink-0" />
                    This pot reflects {linked || "a linked holding"} rather than
                    holding its own balance — add money there.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {!pot.isMirrored && (
                    <>
                      <button
                        onClick={() => openMove(pot, "fund")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-400 px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-indigo-300"
                      >
                        <FiArrowUp />
                        Add money
                      </button>

                      {pot.savedAmount > 0 && (
                        <button
                          onClick={() => openMove(pot, "withdraw")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20"
                        >
                          <FiArrowDown />
                          Take out
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => openEdit(pot)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20"
                  >
                    <FiEdit2 />
                    Edit
                  </button>

                  <button
                    onClick={() => requestDelete(pot)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-red-300 transition hover:border-red-500/40"
                  >
                    <FiTrash2 />
                    Remove
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ============ ADD / EDIT ============ */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        title={editing ? "Edit Pot" : "New Pot"}
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-wrap gap-2">
          {[
            { key: "goal", label: "Savings goal", icon: "🎯" },
            { key: "emergency", label: "Emergency fund", icon: "🛡️" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setForm({ ...form, kind: option.key })}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                form.kind === option.key
                  ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                  : "border-white/10 bg-slate-800 text-slate-300 hover:border-white/30"
              }`}
            >
              <span>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        {/* How the money is held */}
        <div className="mt-4">
          <p className="mb-2 text-sm text-slate-400">Where the money sits</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { key: "pot", label: "In this pot", hint: "Moved out of an account" },
              { key: "account", label: "In an account", hint: "Mirrors its balance" },
              { key: "investment", label: "In an FD / RD", hint: "Mirrors its value" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setForm({ ...form, backing: option.key })}
                className={`rounded-xl border p-3 text-left text-sm transition ${
                  form.backing === option.key
                    ? "border-indigo-400 bg-indigo-500/10 text-indigo-100"
                    : "border-white/10 bg-slate-800 text-slate-300 hover:border-white/30"
                }`}
              >
                {option.label}
                <span className="mt-0.5 block text-xs text-slate-500">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            label="Name"
            placeholder={form.kind === "emergency" ? "Emergency fund" : "Japan trip"}
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
          />

          <Input
            label="Target amount"
            type="number"
            value={form.targetAmount}
            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
          />

          {form.backing === "account" && (
            <Select
              label="Mirrors this account"
              value={form.linkedAccountId}
              onChange={(e) =>
                setForm({ ...form, linkedAccountId: e.target.value })
              }
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name} — {money(account.balance)}
                </option>
              ))}
            </Select>
          )}

          {form.backing === "investment" && (
            <Select
              label="Mirrors this holding"
              value={form.linkedInvestmentId}
              onChange={(e) =>
                setForm({ ...form, linkedInvestmentId: e.target.value })
              }
            >
              <option value="">Select holding</option>
              {investments.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} — {money(item.currentValue)}
                </option>
              ))}
            </Select>
          )}

          <Input
            label={
              form.kind === "emergency"
                ? "Target date (optional)"
                : "Target date"
            }
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
          />

          {form.kind === "goal" && (
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </Select>
          )}

          <Input
            label="Note"
            containerClassName="md:col-span-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm text-slate-400">Icon</p>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setForm({ ...form, potIcon: icon })}
                className={`rounded-xl border px-3 py-2 text-lg transition ${
                  form.potIcon === icon
                    ? "border-indigo-400 bg-indigo-500/15"
                    : "border-white/10 bg-slate-800 hover:border-white/30"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {isMirrorForm && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-cyan-500/10 p-3 text-xs text-cyan-200">
            <FiLink className="mt-0.5 shrink-0" />
            A mirrored pot shows a balance that already exists elsewhere, so
            it is not counted twice and cannot be funded directly.
          </p>
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
            {editing ? "Save Changes" : "Create Pot"}
          </Button>
        </div>
      </Modal>

      {/* ============ FUND / WITHDRAW ============ */}
      <Modal
        isOpen={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        title={
          moveTarget
            ? moveMode === "fund"
              ? `Add to ${moveTarget.itemName}`
              : `Take out of ${moveTarget.itemName}`
            : ""
        }
        maxWidth="max-w-md"
      >
        {fundingAccounts.length === 0 ? (
          <EmptyState
            icon={FiTarget}
            title="No account available"
            message="Add a bank, cash or wallet account first. A pot cannot be funded from a credit card."
          />
        ) : (
          <>
            <Input
              label="Amount"
              type="number"
              value={moveForm.amount}
              onChange={(e) =>
                setMoveForm({ ...moveForm, amount: e.target.value })
              }
            />

            {moveMode === "fund" && moveTarget?.remainingAmount > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ["This month", moveTarget.requiredPerMonth],
                  ["Finish it", moveTarget.remainingAmount],
                ]
                  .filter(([, value]) => value > 0)
                  .map(([label, value]) => (
                    <button
                      key={label}
                      onClick={() =>
                        setMoveForm({ ...moveForm, amount: String(value) })
                      }
                      className="rounded-lg bg-indigo-400/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-400/20"
                    >
                      {label} · {money(value)}
                    </button>
                  ))}
              </div>
            )}

            <Select
              label={moveMode === "fund" ? "From account" : "Back into"}
              containerClassName="mt-3"
              value={moveForm.accountId}
              onChange={(e) =>
                setMoveForm({ ...moveForm, accountId: e.target.value })
              }
            >
              {fundingAccounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name} — {money(account.balance)}
                </option>
              ))}
            </Select>

            <Input
              label="Note"
              containerClassName="mt-3"
              value={moveForm.note}
              onChange={(e) => setMoveForm({ ...moveForm, note: e.target.value })}
            />

            {moveMode === "fund" &&
              moveAccount &&
              Number(moveForm.amount) > Number(moveAccount.balance) && (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                  <FiAlertTriangle className="mt-0.5 shrink-0" />
                  More than {moveAccount.name} holds ({money(moveAccount.balance)}).
                  It will take that account negative.
                </p>
              )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setMoveTarget(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleMove} loading={saving}>
                {moveMode === "fund" ? "Move in" : "Take out"}
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
        title="Remove this pot?"
        message={deleteMessage()}
        confirmLabel="Remove"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
