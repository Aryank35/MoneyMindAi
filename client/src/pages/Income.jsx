import DashboardLayout from "../components/layout/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheckCircle,
  FiCreditCard,
  FiEdit2,
  FiInbox,
  FiLock,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiTrendingUp,
} from "react-icons/fi";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import EmptyState from "../components/common/EmptyState";
import { Skeleton } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";

import {
  getIncomeSources,
  getIncomesByUser,
  getIncomeSummary,
  getIncomeDeleteImpact,
  createIncome,
  updateIncome,
  deleteIncome,
} from "../services/incomeService";
import { getAccountsByUser } from "../services/accountService";
import { getUserId } from "../utils/auth";
import {
  CHART_AXIS,
  CHART_COLORS,
  CHART_INFO,
  CHART_POSITIVE,
  TOOLTIP_STYLE,
} from "../utils/chartTheme";
import {
  computeIncomeTotals,
  money,
  monthNames,
} from "../utils/incomeFormulas";

const paymentModes = ["Bank Transfer", "Cash", "UPI", "Cheque", "Card"];
const recurringTypes = ["Monthly", "Quarterly", "Yearly", "Weekly", "Daily"];


const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

// Blank entry for a source: every declared field starts empty, and the
// budget toggle starts wherever the registry says it should.
const createEmptyForm = (source, accountId = "") => {
  const now = new Date();

  return {
    sourceKey: source?.key || "salary",
    fields: (source?.fields || []).reduce(
      (values, field) => ({ ...values, [field.key]: "" }),
      {},
    ),
    accountId,
    includeInBudget: source?.includeInBudgetDefault ?? true,
    payer: "",
    note: "",
    attachments: "",
    paymentMode: "Bank Transfer",
    isRecurring: Boolean(source?.isRecurringDefault),
    recurringType: "Monthly",
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
    periodMonth: now.getMonth() + 1,
    periodYear: now.getFullYear(),
  };
};

function FormField({
  label,
  type = "text",
  options,
  placeholder,
  containerClassName,
  help,
  ...props
}) {
  const field =
    type === "select" ? (
      <Select label={label} containerClassName={containerClassName} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {(options || []).map((option) => {
          const isObject = typeof option === "object" && option !== null;
          const value = isObject ? option.value : option;

          return (
            <option key={value} value={value}>
              {isObject ? option.label : option}
            </option>
          );
        })}
      </Select>
    ) : (
      <Input
        label={label}
        type={type}
        placeholder={placeholder}
        containerClassName={containerClassName}
        {...props}
      />
    );

  if (!help) return field;

  return (
    <div className={containerClassName}>
      {field}
      <p className="mt-1 text-xs text-slate-500">{help}</p>
    </div>
  );
}

function StatTile({ label, value, hint, tone = "default" }) {
  const tones = {
    default: "text-white",
    positive: "text-emerald-300",
    muted: "text-slate-300",
    warning: "text-amber-300",
  };

  return (
    <div className="rounded-xl bg-slate-800/80 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-1 break-words text-2xl font-bold ${tones[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function Income() {
  const toast = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [sources, setSources] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(() => createEmptyForm(null));

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const now = new Date();
  const [period, setPeriod] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const [filters, setFilters] = useState({
    sourceKey: "all",
    account: "all",
    budget: "all",
    search: "",
  });

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: "easeOut" },
        };

  const loadPage = async (nextPeriod = period) => {
    try {
      const userId = getUserId();

      const [sourceRes, incomeRes, accountRes, summaryRes] = await Promise.all([
        getIncomeSources(),
        getIncomesByUser(userId),
        getAccountsByUser(userId),
        getIncomeSummary(userId, nextPeriod),
      ]);

      setSources(sourceRes.data || []);
      setIncomes(incomeRes.data || []);
      setAccounts(accountRes.data || []);
      setSummary(summaryRes.data || null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load income data");
    } finally {
      setLoading(false);
    }
  };

  // Deferred a tick so the fetch's setState lands outside the effect body,
  // matching how the other pages in this app kick off their loads.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPage(period);
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.month, period.year]);

  // =====================================================================
  // DERIVED
  // =====================================================================

  const sourceMap = useMemo(
    () =>
      sources.reduce((map, source) => {
        map[source.key] = source;
        return map;
      }, {}),
    [sources],
  );

  const accountMap = useMemo(
    () =>
      accounts.reduce((map, account) => {
        map[account._id] = account;
        return map;
      }, {}),
    [accounts],
  );

  const salaryAccount = accounts.find((account) => account.isSalaryAccount);
  const epfAccount = accounts.find((account) => account.isEpfAccount);

  const activeSource = sourceMap[formData.sourceKey] || null;

  // Live preview only. The server recomputes these on save and its numbers
  // are what get stored.
  const previewTotals = useMemo(
    () => computeIncomeTotals(activeSource, formData.fields),
    [activeSource, formData.fields],
  );

  const selectedAccount = accountMap[formData.accountId];

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account._id,
        label: account.isSalaryAccount
          ? `${account.name} - Salary Account`
          : account.isEpfAccount
            ? `${account.name} - EPF Account`
            : account.name,
      })),
    [accounts],
  );

  const filteredIncomes = useMemo(
    () =>
      incomes.filter((income) => {
        const source = sourceMap[income.sourceKey];
        const account = accountMap[income.accountId];
        const haystack = [
          source?.label,
          income.payer,
          income.note,
          account?.name,
          income.paymentMode,
        ]
          .join(" ")
          .toLowerCase();

        return (
          (filters.sourceKey === "all" ||
            income.sourceKey === filters.sourceKey) &&
          (filters.account === "all" || income.accountId === filters.account) &&
          (filters.budget === "all" ||
            String(Boolean(income.includeInBudget)) === filters.budget) &&
          haystack.includes(filters.search.toLowerCase())
        );
      }),
    [accountMap, filters, incomes, sourceMap],
  );

  const trendData = useMemo(() => {
    const today = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const rows = incomes.filter(
        (income) => income.periodMonth === month && income.periodYear === year,
      );

      return {
        month: date.toLocaleString("en-IN", { month: "short" }),
        received: rows.reduce(
          (sum, income) => sum + Number(income.creditedAmount || 0),
          0,
        ),
        budgetable: rows.reduce(
          (sum, income) => sum + Number(income.budgetableAmount || 0),
          0,
        ),
      };
    });
  }, [incomes]);

  const pieData = (summary?.bySource || [])
    .filter((row) => row.monthTotal > 0)
    .map((row) => ({ name: row.label, value: row.monthTotal }));

  const totals = summary?.totals || {
    month: 0,
    monthBudgetable: 0,
    monthExcluded: 0,
    epfMonth: 0,
    epfAllTime: 0,
    allTime: 0,
  };

  // =====================================================================
  // MODAL
  // =====================================================================

  const defaultAccountFor = (source) => {
    if (source?.key === "salary" && salaryAccount) return salaryAccount._id;

    return salaryAccount?._id || accounts[0]?._id || "";
  };

  const openAddModal = () => {
    const source = sources[0] || null;

    setEditingIncome(null);
    setFormData(createEmptyForm(source, defaultAccountFor(source)));
    setShowModal(true);
  };

  const openEditModal = (income) => {
    const source = sourceMap[income.sourceKey];
    const date = income.incomeDate ? new Date(income.incomeDate) : new Date();

    setEditingIncome(income);
    setFormData({
      ...createEmptyForm(source, income.accountId),
      sourceKey: income.sourceKey,
      // Only the declared input fields are editable; derived values are
      // recomputed rather than round-tripped.
      fields: (source?.fields || []).reduce(
        (values, field) => ({
          ...values,
          [field.key]: String(income.fields?.[field.key] ?? ""),
        }),
        {},
      ),
      accountId: income.accountId || "",
      includeInBudget: income.includeInBudget,
      payer: income.payer || "",
      note: income.note || "",
      attachments: (income.attachments || []).join(", "),
      paymentMode: income.paymentMode || "Bank Transfer",
      isRecurring: Boolean(income.isRecurring),
      recurringType: income.recurringType || "Monthly",
      date: date.toISOString().split("T")[0],
      time: date.toTimeString().slice(0, 5),
      periodMonth: income.periodMonth || date.getMonth() + 1,
      periodYear: income.periodYear || date.getFullYear(),
    });
    setShowModal(true);
  };

  // Switching source swaps the whole field set - values from the old source
  // are meaningless under the new one.
  const handleSourceChange = (key) => {
    const source = sourceMap[key];

    setFormData((prev) => ({
      ...createEmptyForm(source, defaultAccountFor(source)),
      payer: prev.payer,
      note: prev.note,
      date: prev.date,
      time: prev.time,
      periodMonth: prev.periodMonth,
      periodYear: prev.periodYear,
      paymentMode: prev.paymentMode,
    }));
  };

  const handleSave = async () => {
    if (!formData.accountId) {
      toast.error("Please choose the account this money went into");
      return;
    }

    if (previewTotals.creditedAmount <= 0 && previewTotals.epfAmount <= 0) {
      toast.error("This entry credits nothing - check the amounts entered");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        userId: getUserId(),
        sourceKey: formData.sourceKey,
        fields: formData.fields,
        accountId: formData.accountId,
        includeInBudget: formData.includeInBudget,
        payer: formData.payer,
        note: formData.note,
        paymentMode: formData.paymentMode,
        isRecurring: formData.isRecurring,
        recurringType: formData.isRecurring ? formData.recurringType : undefined,
        periodMonth: Number(formData.periodMonth),
        periodYear: Number(formData.periodYear),
        incomeDate: new Date(`${formData.date}T${formData.time}`),
        attachments: formData.attachments
          ? formData.attachments.split(",").map((item) => item.trim())
          : [],
      };

      const response = editingIncome
        ? await updateIncome(editingIncome._id, payload)
        : await createIncome(payload);

      toast.success(
        editingIncome ? "Income updated" : "Income added and credited",
      );

      if (response?.warning) toast.error(response.warning);

      setShowModal(false);
      setEditingIncome(null);
      await loadPage();
    } catch (error) {
      console.error("Income Save Error:", error);
      toast.error(error?.response?.data?.message || "Failed to save income");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================================
  // DELETE - always confirmed, and the confirmation states the consequence
  // =====================================================================

  const requestDelete = async (income) => {
    setDeleteTarget(income);
    setDeleteImpact(null);

    try {
      const response = await getIncomeDeleteImpact(income._id);

      setDeleteImpact(response.data);
    } catch (error) {
      console.error(error);
      // The dialog still opens - it just falls back to a generic warning.
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteIncome(deleteTarget._id);
      toast.success("Income deleted and the credit reversed");
      setDeleteTarget(null);
      setDeleteImpact(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to delete income");
    } finally {
      setDeleting(false);
    }
  };

  const deleteMessage = () => {
    if (!deleteTarget) return "";

    const label = sourceMap[deleteTarget.sourceKey]?.label || "income";

    if (!deleteImpact) {
      return `This permanently deletes the ${label} entry and reverses its credit. This cannot be undone.`;
    }

    const lines = [
      `This permanently deletes the ${label} entry of ${money(deleteImpact.creditedAmount)}.`,
    ];

    if (deleteImpact.account) {
      lines.push(
        `${deleteImpact.account.name}: ${money(deleteImpact.account.balance)} to ${money(deleteImpact.account.balanceAfter)}.`,
      );
    }

    if (deleteImpact.epfAccount && deleteImpact.epfAmount > 0) {
      lines.push(
        `${deleteImpact.epfAccount.name}: ${money(deleteImpact.epfAccount.balance)} to ${money(deleteImpact.epfAccount.balanceAfter)}.`,
      );
    }

    if (deleteImpact.budgetableAmount > 0) {
      lines.push(
        `Budgetable income drops by ${money(deleteImpact.budgetableAmount)}.`,
      );
    }

    return lines.join(" ");
  };

  // =====================================================================
  // RENDER
  // =====================================================================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-slate-950 text-white">
          <Skeleton className="mb-6 h-56" />
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const monthLabel = `${monthNames[period.month - 1]} ${period.year}`;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 text-white">
        {/* ============ HERO ============ */}
        <motion.section
          {...motionProps(0)}
          className="mb-6 rounded-2xl border border-emerald-400/20 bg-slate-900 p-5 shadow-2xl shadow-emerald-950/20"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                Step 1 of your plan
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight lg:text-4xl">
                Income
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                Record what comes in first. Your budget is planned against the
                income you mark as budgetable.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Month"
                value={period.month}
                onChange={(event) =>
                  setPeriod((prev) => ({
                    ...prev,
                    month: Number(event.target.value),
                  }))
                }
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </Select>

              <Select
                aria-label="Year"
                value={period.year}
                onChange={(event) =>
                  setPeriod((prev) => ({
                    ...prev,
                    year: Number(event.target.value),
                  }))
                }
              >
                {[period.year - 2, period.year - 1, period.year, period.year + 1].map(
                  (year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ),
                )}
              </Select>

              <button
                onClick={openAddModal}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
              >
                <FiPlus />
                Add Income
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label={`Received in ${monthLabel}`}
              value={money(totals.month)}
              tone="positive"
              hint={`${summary?.bySource?.length || 0} active sources`}
            />
            <StatTile
              label="Budgetable"
              value={money(totals.monthBudgetable)}
              hint="What the budget may plan against"
            />
            <StatTile
              label="Excluded from budget"
              value={money(totals.monthExcluded)}
              tone="muted"
              hint="Marked as not for planning"
            />
            <StatTile
              label="EPF this month"
              value={money(totals.epfMonth)}
              tone="muted"
              hint={`${money(totals.epfAllTime)} lifetime`}
            />
          </div>

          {/* ============ INCOME -> BUDGET FLOW ============ */}
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-950 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Received
              </p>
              <p className="font-bold">{money(totals.month)}</p>
            </div>
            <FiArrowRight className="text-slate-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Budgetable
              </p>
              <p className="font-bold text-emerald-300">
                {money(totals.monthBudgetable)}
              </p>
            </div>
            <FiArrowRight className="text-slate-600" />
            <Link
              to="/budget"
              className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
            >
              Plan this month's budget
            </Link>

            {totals.monthBudgetable <= 0 && (
              <p className="flex items-center gap-2 text-xs text-amber-200">
                <FiAlertTriangle className="shrink-0" />
                Nothing budgetable yet for {monthLabel} - add income first.
              </p>
            )}
          </div>
        </motion.section>

        {/* ============ SOURCE BREAKDOWN ============ */}
        <motion.section {...motionProps(0.05)} className="mb-6">
          <h2 className="mb-3 text-xl font-bold">Where the money came from</h2>

          {summary?.bySource?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summary.bySource.map((row) => (
                <div
                  key={row.key}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="text-xl">{row.icon}</span>
                      {row.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {row.count} entr{row.count === 1 ? "y" : "ies"}
                    </span>
                  </div>

                  <p className="mt-3 break-words text-2xl font-bold text-emerald-300">
                    {money(row.monthTotal)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {row.monthBudgetable === row.monthTotal
                      ? "All budgetable"
                      : `${money(row.monthBudgetable)} budgetable`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiInbox}
              title={`No income recorded for ${monthLabel}`}
              message="Add your salary, business income, freelancing, rent or anything else that credits an account."
            />
          )}
        </motion.section>

        {/* ============ ACCOUNT LINKS ============ */}
        <motion.section
          {...motionProps(0.1)}
          className="mb-6 grid gap-6 xl:grid-cols-2"
        >
          {[
            {
              title: "Salary Account",
              account: salaryAccount,
              blurb: "Where salary lands.",
              empty:
                "No salary account linked. Salary entries have no fixed home until you mark one.",
            },
            {
              title: "EPF Account",
              account: epfAccount,
              blurb: "EPF is withheld from salary and accumulates here.",
              empty:
                "No EPF account linked. EPF on a salary entry is recorded but no balance is credited.",
            },
          ].map((panel) => (
            <div
              key={panel.title}
              className="rounded-2xl border border-white/10 bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{panel.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">{panel.blurb}</p>
                </div>
                <Link
                  to="/accounts"
                  className="rounded-xl bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20"
                >
                  Manage
                </Link>
              </div>

              {panel.account ? (
                <div className="mt-4 rounded-xl bg-slate-800/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <FiCreditCard className="text-emerald-300" />
                      {panel.account.name}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-emerald-300">
                      <FiCheckCircle />
                      Linked
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">Balance</p>
                  <p className="break-words text-3xl font-bold text-emerald-300">
                    {money(panel.account.balance)}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
                  <p className="flex items-start gap-2 text-sm text-amber-200">
                    <FiAlertTriangle className="mt-0.5 shrink-0" />
                    {panel.empty}
                  </p>
                  <Link
                    to="/accounts"
                    className="mt-4 inline-flex rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
                  >
                    Link an account
                  </Link>
                </div>
              )}
            </div>
          ))}
        </motion.section>

        {/* ============ CHARTS ============ */}
        <motion.section
          {...motionProps(0.15)}
          className="mb-6 grid gap-6 xl:grid-cols-2"
        >
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">6-Month Trend</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="received" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_POSITIVE} stopOpacity={0.7} />
                      <stop offset="95%" stopColor={CHART_POSITIVE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke={CHART_AXIS} fontSize={12} />
                  <YAxis stroke={CHART_AXIS} fontSize={12} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => money(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    stroke={CHART_POSITIVE}
                    fill="url(#received)"
                    name="Received"
                  />
                  <Area
                    type="monotone"
                    dataKey="budgetable"
                    stroke={CHART_INFO}
                    fill="transparent"
                    name="Budgetable"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Source Split - {monthLabel}</h2>
            <div className="mt-4 h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => money(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={FiTrendingUp}
                  title="Nothing to chart yet"
                  message="Add income for this month to see the split."
                />
              )}
            </div>
          </div>
        </motion.section>

        {/* ============ TABLE ============ */}
        <motion.section
          {...motionProps(0.2)}
          className="rounded-2xl border border-white/10 bg-slate-900 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">All Income</h2>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  aria-label="Search income"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Search"
                  className="rounded-xl border border-white/10 bg-slate-800 p-3 pl-9"
                />
              </div>

              <select
                aria-label="Filter by source"
                value={filters.sourceKey}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    sourceKey: event.target.value,
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-800 p-3"
              >
                <option value="all">All sources</option>
                {sources.map((source) => (
                  <option key={source.key} value={source.key}>
                    {source.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by account"
                value={filters.account}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    account: event.target.value,
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-800 p-3"
              >
                <option value="all">All accounts</option>
                {accountOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by budget inclusion"
                value={filters.budget}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, budget: event.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-800 p-3"
              >
                <option value="all">Budget: any</option>
                <option value="true">In budget</option>
                <option value="false">Excluded</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Account</th>
                  <th className="p-4">Credited</th>
                  <th className="p-4">Budget</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncomes.length > 0 ? (
                  filteredIncomes.map((income) => {
                    const source = sourceMap[income.sourceKey];
                    const account = accountMap[income.accountId];

                    return (
                      <tr key={income._id} className="border-t border-white/5">
                        <td className="p-4">{formatDate(income.incomeDate)}</td>
                        <td className="p-4">
                          <span className="flex items-center gap-2">
                            <span>{source?.icon}</span>
                            {source?.label || income.sourceKey}
                          </span>
                          {income.payer && (
                            <span className="block text-xs text-slate-500">
                              {income.payer}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-2">
                            {account?.name || "-"}
                            {account?.isSalaryAccount && (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                                Salary
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-emerald-300">
                          {money(income.creditedAmount)}
                        </td>
                        <td className="p-4">
                          {income.includeInBudget ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                              {money(income.budgetableAmount)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-700/60 px-2 py-1 text-xs text-slate-400">
                              Excluded
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {(source?.derived || [])
                            .filter((d) => Number(income.fields?.[d.key]) > 0)
                            .map((d) => `${d.label}: ${money(income.fields[d.key])}`)
                            .join("  |  ") || "-"}
                          {income.epfAmount > 0 && (
                            <span className="block text-cyan-300">
                              EPF: {money(income.epfAmount)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-3">
                            <button
                              onClick={() => openEditModal(income)}
                              aria-label="Edit income"
                              className="text-cyan-300"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              onClick={() => requestDelete(income)}
                              aria-label="Delete income"
                              className="text-rose-400"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8">
                      <EmptyState
                        icon={FiInbox}
                        title="No matching income"
                        message="Adjust the filters, or add a new income entry."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* ============ ADD / EDIT MODAL ============ */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingIncome(null);
          }}
          title={editingIncome ? "Edit Income" : "Add Income"}
          maxWidth="max-w-3xl"
        >
          {/* Source picker - driven entirely by the server registry */}
          <div>
            <p className="mb-2 text-sm text-slate-400">Income Source</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <button
                  key={source.key}
                  onClick={() => handleSourceChange(source.key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    formData.sourceKey === source.key
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                      : "border-white/10 bg-slate-800 text-slate-300 hover:border-white/30"
                  }`}
                >
                  <span>{source.icon}</span>
                  {source.label}
                </button>
              ))}
            </div>
            {activeSource?.description && (
              <p className="mt-2 text-xs text-slate-500">
                {activeSource.description}
              </p>
            )}
          </div>

          {/* Fields for the chosen source */}
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(activeSource?.fields || []).map((field) => (
              <FormField
                key={field.key}
                label={field.label + (field.required ? " *" : "")}
                type={field.type}
                help={field.help}
                value={formData.fields[field.key] ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    fields: {
                      ...prev.fields,
                      [field.key]: event.target.value,
                    },
                  }))
                }
              />
            ))}
          </div>

          {/* Derived values, computed live */}
          {(activeSource?.derived || []).length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {activeSource.derived.map((derived) => {
                const value = previewTotals.fields[derived.key] || 0;
                const tone =
                  derived.tone === "negative"
                    ? "bg-rose-500/10 text-rose-200"
                    : derived.tone === "positive"
                      ? "bg-emerald-500/10 text-emerald-200"
                      : "bg-slate-800 text-slate-300";

                return (
                  <div key={derived.key} className={`rounded-xl p-4 ${tone}`}>
                    <p className="text-sm">{derived.label}</p>
                    <p className="break-words text-2xl font-bold text-white">
                      {money(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Budget inclusion */}
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950 p-4">
            {activeSource?.canToggleBudget ? (
              <label className="flex items-start gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={formData.includeInBudget}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      includeInBudget: event.target.checked,
                    }))
                  }
                />
                <span>
                  Include in budget planning
                  <span className="mt-1 block text-xs text-slate-500">
                    {formData.includeInBudget
                      ? `${money(previewTotals.budgetableAmount)} will be available to budget with.`
                      : "This money still credits the account, but the budget won't plan against it."}
                  </span>
                </span>
              </label>
            ) : (
              <p className="flex items-start gap-2 text-sm text-slate-400">
                <FiLock className="mt-0.5 shrink-0" />
                {activeSource?.label} always counts toward your budget.
              </p>
            )}
          </div>

          {/* Generic fields */}
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <FormField
              label="Account Credited"
              type="select"
              value={formData.accountId}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  accountId: event.target.value,
                }))
              }
              placeholder="Select Account"
              options={accountOptions}
            />

            <FormField
              label={activeSource?.payerLabel || "Received From"}
              value={formData.payer}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, payer: event.target.value }))
              }
            />

            <FormField
              label="Payment Mode"
              type="select"
              value={formData.paymentMode}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentMode: event.target.value,
                }))
              }
              options={paymentModes}
            />

            <FormField
              label="Date"
              type="date"
              value={formData.date}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, date: event.target.value }))
              }
            />

            <FormField
              label="Budget Month"
              type="select"
              value={formData.periodMonth}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  periodMonth: event.target.value,
                }))
              }
              options={monthNames.map((name, index) => ({
                value: index + 1,
                label: name,
              }))}
              help="Which month's budget this income belongs to."
            />

            <FormField
              label="Budget Year"
              type="number"
              value={formData.periodYear}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  periodYear: event.target.value,
                }))
              }
            />

            <label className="flex items-center gap-3 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    isRecurring: event.target.checked,
                  }))
                }
              />
              Recurring
            </label>

            {formData.isRecurring && (
              <FormField
                label="Repeats"
                type="select"
                value={formData.recurringType}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    recurringType: event.target.value,
                  }))
                }
                options={recurringTypes}
              />
            )}

            <FormField
              label="Note"
              value={formData.note}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, note: event.target.value }))
              }
              containerClassName="md:col-span-3"
            />
          </div>

          {/* Live credit preview */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Credits to account"
              value={money(previewTotals.creditedAmount)}
              tone="positive"
              hint={selectedAccount?.name}
            />
            <StatTile
              label="Budgetable"
              value={money(
                formData.includeInBudget ? previewTotals.budgetableAmount : 0,
              )}
            />
            <StatTile
              label="Balance after"
              value={money(
                Number(selectedAccount?.balance || 0) +
                  previewTotals.creditedAmount,
              )}
              tone="muted"
            />
          </div>

          {previewTotals.epfAmount > 0 && (
            <p
              className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs ${
                epfAccount
                  ? "bg-cyan-500/10 text-cyan-200"
                  : "bg-amber-500/10 text-amber-200"
              }`}
            >
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              {epfAccount
                ? `${money(previewTotals.epfAmount)} goes to ${epfAccount.name}, not your bank. It is never budgetable.`
                : `${money(previewTotals.epfAmount)} EPF will be recorded but not credited anywhere - link an EPF account on the Accounts page.`}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingIncome(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingIncome ? "Save Changes" : "Add Income"}
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
          title="Delete this income entry?"
          message={deleteMessage()}
          confirmLabel="Delete and reverse"
          loading={deleting}
        />
      </div>
    </DashboardLayout>
  );
}
