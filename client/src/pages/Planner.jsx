import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheck,
  FiEdit2,
  FiGift,
  FiPause,
  FiPlay,
  FiPlus,
  FiRotateCcw,
  FiShield,
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
  getScheduleOptions,
  getScheduleOverview,
  createSchedule,
  updateSchedule,
  markSchedulePaid,
  undoSchedulePayment,
  getScheduleDeleteImpact,
  deleteSchedule,
} from "../services/scheduleService";
import { getAccountsByUser } from "../services/accountService";
import { getUserId } from "../utils/auth";
import { money } from "../utils/incomeFormulas";

const STATE_TONES = {
  overdue: "border-red-500/40 bg-red-500/5",
  today: "border-amber-400/40 bg-amber-500/5",
  urgent: "border-amber-400/25",
  soon: "border-white/10",
  scheduled: "border-white/10",
  paused: "border-white/5 opacity-60",
  ended: "border-white/5 opacity-60",
  complete: "border-white/10",
};

const STATE_CHIPS = {
  overdue: "bg-red-500/15 text-red-200",
  today: "bg-amber-500/15 text-amber-200",
  urgent: "bg-amber-500/10 text-amber-200",
  soon: "bg-white/5 text-slate-300",
  scheduled: "bg-white/5 text-slate-400",
  paused: "bg-white/5 text-slate-500",
  ended: "bg-white/5 text-slate-500",
  complete: "bg-emerald-500/10 text-emerald-200",
};

const KIND_ICONS = { payment: FiCalendar, insurance: FiShield, contribution: FiGift };

const toInputDate = (value) => {
  const date = value ? new Date(value) : new Date();

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
    : "-";

const emptyForm = () => ({
  kind: "payment",
  name: "",
  amount: "",
  cadence: "monthly",
  every: 1,
  unit: "month",
  startDate: toInputDate(),
  endDate: "",
  accountId: "",
  category: "",
  contributor: "",
  includeInBudget: true,
  note: "",
  policy: {
    insurer: "",
    policyNumber: "",
    policyType: "Term",
    coverAmount: "",
    maturityDate: "",
    nominee: "",
  },
});

export default function Planner() {
  const toast = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [options, setOptions] = useState(null);
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [kindFilter, setKindFilter] = useState("all");

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

      const [optionsRes, overviewRes, accountsRes] = await Promise.all([
        getScheduleOptions(),
        getScheduleOverview(userId, 60),
        getAccountsByUser(userId),
      ]);

      setOptions(optionsRes.data || null);
      setOverview(overviewRes.data || null);
      setAccounts(accountsRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load the planner");
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
    overdue: 0,
    dueThisWeek: 0,
    monthlyOutgoing: 0,
    monthlyIncoming: 0,
    monthlyBudgetable: 0,
    dueInWindow: 0,
  };

  const schedules = useMemo(
    () =>
      (overview?.schedules || []).filter(
        (item) => kindFilter === "all" || item.kind === kindFilter,
      ),
    [overview?.schedules, kindFilter],
  );

  const upcoming = (overview?.upcoming || []).slice(0, 12);
  const accountName = (id) =>
    accounts.find((account) => account._id === id)?.name || "No account";

  // =====================================================================
  // FORM
  // =====================================================================

  const cadenceFor = (key) =>
    options?.cadences?.find((item) => item.key === key) || null;

  const applyCadence = (key) => {
    const preset = cadenceFor(key);

    setForm((prev) => ({
      ...prev,
      cadence: key,
      every: preset?.recurrence?.every ?? prev.every,
      unit: preset?.recurrence?.unit ?? prev.unit,
    }));
  };

  const openAdd = (kind = "payment") => {
    setEditing(null);
    setForm({ ...emptyForm(), kind });
    setShowModal(true);
  };

  const openEdit = (item) => {
    // Match the stored cadence back to a preset so the picker reflects it;
    // anything unusual shows as Custom with its own interval.
    const match = options?.cadences?.find(
      (preset) =>
        preset.key !== "custom" &&
        ((!preset.recurrence && !item.recurrence) ||
          (preset.recurrence &&
            item.recurrence &&
            preset.recurrence.every === item.recurrence.every &&
            preset.recurrence.unit === item.recurrence.unit)),
    );

    setEditing(item);
    setForm({
      ...emptyForm(),
      kind: item.kind,
      name: item.name || "",
      amount: String(item.amount ?? ""),
      cadence: item.isRecurring ? match?.key || "custom" : "once",
      every: item.recurrence?.every || 1,
      unit: item.recurrence?.unit || "month",
      startDate: toInputDate(item.startDate),
      endDate: item.endDate ? toInputDate(item.endDate) : "",
      accountId: item.accountId || "",
      category: item.category || "",
      contributor: item.contributor || "",
      includeInBudget: item.includeInBudget !== false,
      note: item.note || "",
      policy: {
        insurer: item.policy?.insurer || "",
        policyNumber: item.policy?.policyNumber || "",
        policyType: item.policy?.policyType || "Term",
        coverAmount: String(item.policy?.coverAmount || ""),
        maturityDate: item.policy?.maturityDate
          ? toInputDate(item.policy.maturityDate)
          : "",
        nominee: item.policy?.nominee || "",
      },
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Give this a name");
      return;
    }

    if (!(Number(form.amount) > 0)) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      setSaving(true);

      const isRecurring = form.cadence !== "once";

      const payload = {
        userId: getUserId(),
        kind: form.kind,
        name: form.name,
        amount: Number(form.amount),
        isRecurring,
        recurrence: isRecurring
          ? { every: Number(form.every) || 1, unit: form.unit }
          : undefined,
        startDate: form.startDate,
        endDate: form.endDate || null,
        accountId: form.accountId || null,
        category: form.category,
        contributor: form.contributor,
        includeInBudget: form.includeInBudget,
        note: form.note,
        policy: form.kind === "insurance" ? form.policy : undefined,
      };

      if (editing) {
        await updateSchedule(editing._id, payload);
        toast.success("Schedule updated");
      } else {
        await createSchedule(payload);
        toast.success("Schedule added");
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
  // ACTIONS
  // =====================================================================

  const handlePay = async (item) => {
    try {
      setBusyId(item._id);
      await markSchedulePaid(item._id);

      toast.success(
        item.kind === "contribution"
          ? `${item.name} recorded`
          : `${money(item.amount)} paid and logged as an expense`,
      );

      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Could not record payment");
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (item) => {
    try {
      setBusyId(item._id);
      await undoSchedulePayment(item._id);
      toast.success("Last payment undone and the balance restored");
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Could not undo");
    } finally {
      setBusyId(null);
    }
  };

  const togglePause = async (item) => {
    try {
      setBusyId(item._id);
      await updateSchedule(item._id, { isActive: !item.isActive });
      toast.success(item.isActive ? "Paused" : "Resumed");
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
      const response = await getScheduleDeleteImpact(item._id);

      setDeleteImpact(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteSchedule(deleteTarget._id);
      toast.success("Schedule removed");
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
      return `This removes ${deleteTarget.name} from your planner. This cannot be undone.`;
    }

    const base = `This removes the ${deleteImpact.cadenceLabel.toLowerCase()} ${deleteImpact.kind} "${deleteImpact.name}" of ${money(deleteImpact.amount)}.`;

    return deleteImpact.paidCount > 0
      ? `${base} The ${deleteImpact.paidCount} payment${deleteImpact.paidCount === 1 ? "" : "s"} already recorded (${money(deleteImpact.totalPaid)}) stay in your expenses — only the plan is deleted. This cannot be undone.`
      : `${base} This cannot be undone.`;
  };

  // =====================================================================
  // RENDER
  // =====================================================================

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="mb-6 h-44" />
        <div className="grid gap-6 xl:grid-cols-3">
          <Skeleton className="h-64 xl:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  const isInsurance = form.kind === "insurance";
  const isContribution = form.kind === "contribution";

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
              Planner
            </p>
            <h1 className="mt-2 text-4xl">
              {money(totals.monthlyOutgoing)}
              <span className="ml-2 font-sans text-base text-slate-400">
                a month committed
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Every dated commitment in one place — recurring bills, one-off
              future payments, premiums, and money others put in for you.
            </p>
          </div>

          <Button icon={FiPlus} onClick={() => openAdd()}>
            Add
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Overdue",
              totals.overdue,
              totals.overdue > 0 ? "text-red-300" : "text-slate-300",
            ],
            ["Due in 7 days", totals.dueThisWeek, ""],
            [
              "Coming in",
              money(totals.monthlyIncoming),
              "text-emerald-300",
              totals.monthlyIncoming > 0
                ? `${money(totals.monthlyBudgetable)} counts toward budget`
                : "No contributions",
            ],
            ["Next 60 days", money(totals.dueInWindow), ""],
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
      </motion.section>

      {totals.count === 0 ? (
        <EmptyState
          icon={FiCalendar}
          title="Nothing scheduled yet"
          message="Add rent, an EMI, a subscription, an insurance premium, or a deposit someone makes for you."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={FiPlus} onClick={() => openAdd("payment")}>
                Add a payment
              </Button>
              <Button
                variant="secondary"
                icon={FiShield}
                onClick={() => openAdd("insurance")}
              >
                Add insurance
              </Button>
              <Button
                variant="ghost"
                icon={FiGift}
                onClick={() => openAdd("contribution")}
              >
                Add a contribution
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {/* ============ SCHEDULE LIST ============ */}
          <motion.section
            {...motionProps(0.05)}
            className="rounded-2xl border border-white/10 bg-slate-900 p-5 xl:col-span-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Commitments</h2>

              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-800 p-1">
                {[
                  { key: "all", label: "All" },
                  ...(options?.kinds || []).map((kind) => ({
                    key: kind.key,
                    label: kind.label,
                  })),
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setKindFilter(tab.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition ${
                      kindFilter === tab.key
                        ? "bg-indigo-400/15 text-indigo-200"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {schedules.length === 0 ? (
                <EmptyState
                  icon={FiCalendar}
                  title="Nothing here"
                  message="No commitments of this kind yet."
                />
              ) : (
                schedules.map((item) => {
                  const Icon = KIND_ICONS[item.kind] || FiCalendar;
                  const busy = busyId === item._id;

                  return (
                    <div
                      key={item._id}
                      className={`rounded-2xl border p-4 transition-colors ${
                        STATE_TONES[item.status.state] || "border-white/10"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 font-semibold">
                            <Icon className="shrink-0 text-slate-400" />
                            <span className="break-words">{item.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                STATE_CHIPS[item.status.state] || "bg-white/5"
                              }`}
                            >
                              {item.status.label}
                            </span>
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.cadenceLabel}
                            {item.status.nextDate &&
                              ` · next ${formatDate(item.status.nextDate)}`}
                            {item.kind !== "contribution" &&
                              ` · from ${accountName(item.accountId)}`}
                            {item.contributor && ` · by ${item.contributor}`}
                            {item.kind === "contribution" &&
                              !item.includeInBudget &&
                              " · excluded from budget"}
                          </p>

                          {item.kind === "insurance" && item.policy?.coverAmount > 0 && (
                            <p className="mt-1 text-xs text-cyan-300">
                              {item.policy.policyType} ·{" "}
                              {money(item.policy.coverAmount)} cover
                              {item.policy.insurer && ` · ${item.policy.insurer}`}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="break-words text-xl font-bold">
                            {money(item.amount)}
                          </p>
                          {item.monthlyEquivalent > 0 &&
                            item.monthlyEquivalent !== item.amount && (
                              <p className="text-xs text-slate-500">
                                {money(item.monthlyEquivalent)}/mo
                              </p>
                            )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {item.isActive && item.status.nextDate && (
                          <button
                            onClick={() => handlePay(item)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-400 px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:opacity-50"
                          >
                            <FiCheck />
                            {item.kind === "contribution"
                              ? "Record"
                              : "Mark paid"}
                          </button>
                        )}

                        {item.paidCount > 0 && (
                          <button
                            onClick={() => handleUndo(item)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20 disabled:opacity-50"
                          >
                            <FiRotateCcw />
                            Undo last
                          </button>
                        )}

                        <button
                          onClick={() => togglePause(item)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20 disabled:opacity-50"
                        >
                          {item.isActive ? <FiPause /> : <FiPlay />}
                          {item.isActive ? "Pause" : "Resume"}
                        </button>

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

                        {item.paidCount > 0 && (
                          <span className="ml-auto text-slate-500">
                            {item.paidCount} paid · {money(item.totalPaid)} total
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.section>

          {/* ============ TIMELINE ============ */}
          <motion.section
            {...motionProps(0.1)}
            className="rounded-2xl border border-white/10 bg-slate-900 p-5"
          >
            <h2 className="text-xl font-bold">Next 60 days</h2>
            <p className="mt-1 text-sm text-slate-400">
              Every due date, not just the next one per commitment.
            </p>

            <div className="mt-4 space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nothing due in the next 60 days.
                </p>
              ) : (
                upcoming.map((entry, index) => (
                  <div
                    key={`${entry.scheduleId}-${entry.date}-${index}`}
                    className={`flex items-center justify-between gap-3 rounded-xl p-3 ${
                      entry.isOverdue ? "bg-red-500/10" : "bg-slate-800/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {entry.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.isOverdue ? "Overdue · " : ""}
                        {formatDate(entry.date)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        entry.kind === "contribution"
                          ? "text-emerald-300"
                          : "text-slate-200"
                      }`}
                    >
                      {entry.kind === "contribution" ? "+" : "−"}
                      {money(entry.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {(overview?.insurance || []).length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <FiShield className="text-cyan-300" />
                  Insurance cover
                </h3>

                <div className="mt-3 space-y-2">
                  {overview.insurance.map((policy) => (
                    <div key={policy._id} className="rounded-xl bg-slate-800/60 p-3">
                      <p className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{policy.name}</span>
                        <span className="shrink-0 text-cyan-300">
                          {money(policy.policy?.coverAmount)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {policy.policy?.policyType}
                        {policy.policy?.policyNumber &&
                          ` · ${policy.policy.policyNumber}`}
                        {" · "}
                        {money(policy.amount)} {policy.cadenceLabel.toLowerCase()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        </div>
      )}

      {/* ============ ADD / EDIT ============ */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        title={editing ? "Edit Schedule" : "Add to Planner"}
        maxWidth="max-w-2xl"
      >
        <div>
          <p className="mb-2 text-sm text-slate-400">Type</p>
          <div className="flex flex-wrap gap-2">
            {(options?.kinds || []).map((kind) => (
              <button
                key={kind.key}
                onClick={() => setForm({ ...form, kind: kind.key })}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  form.kind === kind.key
                    ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                    : "border-white/10 bg-slate-800 text-slate-300 hover:border-white/30"
                }`}
              >
                <span>{kind.icon}</span>
                {kind.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {options?.kinds?.find((kind) => kind.key === form.kind)?.description}
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input
            label="Name"
            placeholder={isInsurance ? "Term life cover" : "House rent"}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Input
            label={isInsurance ? "Premium" : "Amount"}
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <Select
            label="Repeats"
            value={form.cadence}
            onChange={(e) => applyCadence(e.target.value)}
          >
            {(options?.cadences || []).map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
          </Select>

          {form.cadence === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Every"
                type="number"
                min="1"
                value={form.every}
                onChange={(e) => setForm({ ...form, every: e.target.value })}
              />
              <Select
                label="Unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                <option value="day">Days</option>
                <option value="week">Weeks</option>
                <option value="month">Months</option>
                <option value="year">Years</option>
              </Select>
            </div>
          ) : (
            <Input
              label={form.cadence === "once" ? "Payment date" : "First due date"}
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          )}

          {form.cadence === "custom" && (
            <Input
              label="First due date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          )}

          {form.cadence !== "once" && (
            <Input
              label="Ends on (optional)"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          )}

          <Select
            label={isContribution ? "Lands in (optional)" : "Paid from"}
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">
              {isContribution ? "Not into my accounts" : "Select account"}
            </option>
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name}
              </option>
            ))}
          </Select>

          {!isContribution && (
            <Input
              label="Budget category"
              placeholder="Rent"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          )}

          {isContribution && (
            <Input
              label="Who contributes"
              placeholder="Father"
              value={form.contributor}
              onChange={(e) => setForm({ ...form, contributor: e.target.value })}
            />
          )}
        </div>

        {/* Insurance policy details */}
        {isInsurance && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <FiShield className="text-cyan-300" />
              Policy
            </h3>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Input
                label="Insurer"
                value={form.policy.insurer}
                onChange={(e) =>
                  setForm({
                    ...form,
                    policy: { ...form.policy, insurer: e.target.value },
                  })
                }
              />
              <Input
                label="Policy number"
                value={form.policy.policyNumber}
                onChange={(e) =>
                  setForm({
                    ...form,
                    policy: { ...form.policy, policyNumber: e.target.value },
                  })
                }
              />
              <Select
                label="Type"
                value={form.policy.policyType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    policy: { ...form.policy, policyType: e.target.value },
                  })
                }
              >
                {(options?.policyTypes || []).map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
              <Input
                label="Cover amount"
                type="number"
                value={form.policy.coverAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    policy: { ...form.policy, coverAmount: e.target.value },
                  })
                }
              />
              <Input
                label="Matures on"
                type="date"
                value={form.policy.maturityDate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    policy: { ...form.policy, maturityDate: e.target.value },
                  })
                }
              />
              <Input
                label="Nominee"
                value={form.policy.nominee}
                onChange={(e) =>
                  setForm({
                    ...form,
                    policy: { ...form.policy, nominee: e.target.value },
                  })
                }
              />
            </div>
          </div>
        )}

        {/* Budget inclusion for third-party money */}
        {isContribution && (
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-slate-800 p-3 text-sm text-slate-300">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.includeInBudget}
              onChange={(e) =>
                setForm({ ...form, includeInBudget: e.target.checked })
              }
            />
            <span>
              Count toward budget planning
              <span className="mt-1 block text-xs text-slate-500">
                {form.includeInBudget
                  ? "This will be treated as money you can plan around."
                  : "Tracked, but the budget will not plan against it — right for money that is saved on your behalf rather than given to you."}
              </span>
            </span>
          </label>
        )}

        <Input
          label="Note"
          containerClassName="mt-3"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

        {!isContribution && !form.accountId && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            Without a linked account this stays a reminder — marking it paid
            needs an account to debit.
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
            {editing ? "Save Changes" : "Add"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteImpact(null);
        }}
        onConfirm={handleDelete}
        title="Remove this schedule?"
        message={deleteMessage()}
        confirmLabel="Remove"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
