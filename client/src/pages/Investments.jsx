import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiPieChart,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiTrendingUp,
} from "react-icons/fi";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import DashboardLayout from "../components/layout/DashboardLayout";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import EmptyState from "../components/common/EmptyState";
import { Skeleton } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";

import {
  getInvestmentTypes,
  getPortfolio,
  createInvestment,
  updateInvestment,
  updateInvestmentValue,
  getInvestmentDeleteImpact,
  deleteInvestment,
} from "../services/investmentService";
import { getUserId } from "../utils/auth";
import { money } from "../utils/incomeFormulas";
import { resolveFields, evaluateFormula } from "../utils/formula";
import { CHART_COLORS, TOOLTIP_STYLE } from "../utils/chartTheme";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

const percent = (value, digits = 1) =>
  `${Number(value || 0) >= 0 ? "+" : ""}${Number(value || 0).toFixed(digits)}%`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const emptyForm = (type) => ({
  typeKey: type?.key || "mutualFund",
  name: "",
  platform: "",
  goal: "",
  onBehalfOf: "",
  note: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  isSip: false,
  sipAmount: "",
  sipDay: 5,
  fields: (type?.fields || []).reduce(
    (values, field) => ({ ...values, [field.key]: "" }),
    {},
  ),
});

// Green for gains, clay for losses - the one place colour carries meaning
// on this page.
const toneFor = (value) =>
  value > 0 ? "text-emerald-300" : value < 0 ? "text-red-300" : "text-slate-300";

function Stat({ label, value, sub, tone }) {
  return (
    <div className="rounded-xl bg-slate-800/80 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-1 break-words text-2xl font-bold ${tone || ""}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function Investments() {
  const toast = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState({});
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => emptyForm(null));

  const [valueTarget, setValueTarget] = useState(null);
  const [valueInput, setValueInput] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState({ typeKey: "all", search: "" });
  const [sortBy, setSortBy] = useState("value");

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

      const [typeRes, portfolioRes] = await Promise.all([
        getInvestmentTypes(),
        getPortfolio(userId),
      ]);

      setTypes(typeRes.data?.types || []);
      setCategories(typeRes.data?.categories || {});
      setPortfolio(portfolioRes.data || null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadPage, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeMap = useMemo(
    () => types.reduce((map, type) => ({ ...map, [type.key]: type }), {}),
    [types],
  );

  const activeType = typeMap[form.typeKey] || null;

  // Live preview while typing. The server recomputes on save and its numbers
  // are what get stored.
  const preview = useMemo(() => {
    if (!activeType) return { invested: 0, current: 0, fields: {} };

    const start = form.purchaseDate ? new Date(form.purchaseDate) : new Date();
    const now = new Date();
    const held = Math.max((now - start) / MS_PER_YEAR, 0);

    // Whole calendar months, matching the server - including the month-end
    // clamp, so an RD opened on the 31st counts February's instalment.
    let calendarMonths =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());

    const lastDayThisMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();

    if (now.getDate() < Math.min(start.getDate(), lastDayThisMonth)) {
      calendarMonths -= 1;
    }

    const values = resolveFields(activeType, form.fields, {
      _yearsHeld: held,
      _monthsHeld: held * 12,
      _calendarMonthsHeld: Math.max(calendarMonths, 0),
    });

    return {
      fields: values,
      invested: Math.max(evaluateFormula(activeType.investedFormula, values), 0),
      current: Math.max(evaluateFormula(activeType.currentFormula, values), 0),
    };
  }, [activeType, form.fields, form.purchaseDate]);

  const totals = portfolio?.totals || {
    invested: 0,
    current: 0,
    gain: 0,
    gainPercent: 0,
    annualisedReturn: null,
    holdings: 0,
    sipTotal: 0,
  };

  const visibleHoldings = useMemo(() => {
    // Built inside the memo so the "|| []" fallback isn't a fresh array on
    // every render, which would defeat the memo entirely.
    const rows = (portfolio?.holdings || []).filter((item) => {
      const haystack = [item.name, item.platform, item.type?.label, item.goal]
        .join(" ")
        .toLowerCase();

      return (
        (filters.typeKey === "all" || item.typeKey === filters.typeKey) &&
        haystack.includes(filters.search.toLowerCase())
      );
    });

    const sorters = {
      value: (a, b) => b.currentValue - a.currentValue,
      gain: (a, b) => b.gain - a.gain,
      gainPercent: (a, b) => b.gainPercent - a.gainPercent,
      name: (a, b) => a.name.localeCompare(b.name),
      newest: (a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate),
    };

    return [...rows].sort(sorters[sortBy] || sorters.value);
  }, [portfolio?.holdings, filters, sortBy]);

  const allocationData = (portfolio?.byType || []).map((row) => ({
    name: row.label,
    value: row.current,
  }));

  // =====================================================================
  // FORM
  // =====================================================================

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm(types[0]));
    setShowModal(true);
  };

  const openEdit = (item) => {
    const type = typeMap[item.typeKey];

    setEditing(item);
    setForm({
      ...emptyForm(type),
      typeKey: item.typeKey,
      name: item.name || "",
      platform: item.platform || "",
      goal: item.goal || "",
      onBehalfOf: item.onBehalfOf || "",
      note: item.note || "",
      purchaseDate: new Date(item.purchaseDate).toISOString().split("T")[0],
      isSip: Boolean(item.isSip),
      sipAmount: String(item.sipAmount || ""),
      sipDay: item.sipDay || 5,
      // Only declared inputs are editable - derived values are recomputed.
      fields: (type?.fields || []).reduce(
        (values, field) => ({
          ...values,
          [field.key]: String(item.fields?.[field.key] ?? ""),
        }),
        {},
      ),
    });
    setShowModal(true);
  };

  // Switching type swaps the whole field set - values from the old type
  // are meaningless under the new one.
  const changeType = (key) => {
    const type = typeMap[key];

    setForm((prev) => ({
      ...emptyForm(type),
      name: prev.name,
      platform: prev.platform,
      goal: prev.goal,
      onBehalfOf: prev.onBehalfOf,
      note: prev.note,
      purchaseDate: prev.purchaseDate,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Give this holding a name");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        userId: getUserId(),
        typeKey: form.typeKey,
        name: form.name,
        platform: form.platform,
        goal: form.goal,
        onBehalfOf: form.onBehalfOf,
        note: form.note,
        purchaseDate: form.purchaseDate,
        isSip: form.isSip,
        sipAmount: form.sipAmount,
        sipDay: form.sipDay,
        fields: form.fields,
      };

      if (editing) {
        await updateInvestment(editing._id, payload);
        toast.success("Holding updated");
      } else {
        await createInvestment(payload);
        toast.success("Added to portfolio");
      }

      setShowModal(false);
      setEditing(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to save holding");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================================
  // QUICK VALUE UPDATE
  // =====================================================================

  const openValueUpdate = (item) => {
    setValueTarget(item);
    setValueInput(String(item.fields?.[item.type?.valueField] ?? ""));
  };

  const handleValueUpdate = async () => {
    try {
      setSaving(true);
      await updateInvestmentValue(valueTarget._id, Number(valueInput));
      toast.success(`${valueTarget.name} revalued`);
      setValueTarget(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to update value");
    } finally {
      setSaving(false);
    }
  };

  const valueFieldLabel = valueTarget
    ? typeMap[valueTarget.typeKey]?.fields?.find(
        (field) => field.key === valueTarget.type?.valueField,
      )?.label || "Current Value"
    : "";

  // =====================================================================
  // DELETE
  // =====================================================================

  const requestDelete = async (item) => {
    setDeleteTarget(item);
    setDeleteImpact(null);

    try {
      const response = await getInvestmentDeleteImpact(item._id);

      setDeleteImpact(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteInvestment(deleteTarget._id);
      toast.success("Removed from portfolio");
      setDeleteTarget(null);
      setDeleteImpact(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to remove holding");
    } finally {
      setDeleting(false);
    }
  };

  const deleteMessage = () => {
    if (!deleteTarget) return "";

    if (!deleteImpact) {
      return `This removes ${deleteTarget.name} from your portfolio. This cannot be undone.`;
    }

    return `This removes ${deleteImpact.name} (${deleteImpact.typeLabel}) worth ${money(
      deleteImpact.currentValue,
    )} from your portfolio, along with its ${money(
      deleteImpact.investedAmount,
    )} invested and ${money(Math.abs(deleteImpact.gain))} ${
      deleteImpact.gain >= 0 ? "gain" : "loss"
    }. Your accounts and transactions are not affected. This cannot be undone.`;
  };

  // =====================================================================
  // RENDER
  // =====================================================================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-slate-950 text-white">
          <Skeleton className="mb-6 h-48" />
          <div className="mb-6 grid gap-6 xl:grid-cols-3">
            <Skeleton className="h-72 xl:col-span-2" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 text-white">
        {/* ============ PORTFOLIO HEADER ============ */}
        <motion.section
          {...motionProps(0)}
          className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-8"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Portfolio Value
              </p>
              <h1 className="mt-2 text-5xl">{money(totals.current)}</h1>

              <p className={`mt-3 text-lg font-semibold ${toneFor(totals.gain)}`}>
                <span className="inline-flex items-center gap-1">
                  {totals.gain >= 0 ? <FiArrowUp /> : <FiArrowDown />}
                  {money(Math.abs(totals.gain))}
                </span>
                <span className="ml-2 font-sans text-sm text-slate-400">
                  {percent(totals.gainPercent)} on {money(totals.invested)}{" "}
                  invested
                </span>
              </p>
            </div>

            <Button icon={FiPlus} onClick={openAdd} disabled={types.length === 0}>
              Add Holding
            </Button>
          </div>

          {totals.holdings > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Invested" value={money(totals.invested)} />
              <Stat
                label="Returns"
                value={money(totals.gain)}
                tone={toneFor(totals.gain)}
                sub={percent(totals.gainPercent)}
              />
              <Stat
                label="Annualised"
                value={
                  totals.annualisedReturn === null
                    ? "—"
                    : percent(totals.annualisedReturn)
                }
                tone={
                  totals.annualisedReturn === null
                    ? ""
                    : toneFor(totals.annualisedReturn)
                }
                sub={
                  totals.annualisedReturn === null
                    ? "Needs 3+ months of history"
                    : `Over ${totals.weightedYears.toFixed(1)} yrs held`
                }
              />
              <Stat
                label="Holdings"
                value={totals.holdings}
                sub={
                  totals.sipTotal > 0
                    ? `${money(totals.sipTotal)}/mo in SIPs`
                    : "No active SIPs"
                }
              />
            </div>
          )}
        </motion.section>

        {totals.holdings === 0 ? (
          <EmptyState
            icon={FiTrendingUp}
            title="Your portfolio is empty"
            message="Add mutual funds, stocks, deposits, gold or anything else you hold, and track what it's worth."
            action={
              <Button icon={FiPlus} onClick={openAdd}>
                Add your first holding
              </Button>
            }
          />
        ) : (
          <>
            {/* ============ ALLOCATION ============ */}
            <motion.section
              {...motionProps(0.05)}
              className="mb-6 grid gap-6 xl:grid-cols-3"
            >
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 xl:col-span-2">
                <h2 className="text-xl font-bold">Allocation</h2>

                <div className="mt-4 space-y-3">
                  {(portfolio?.byType || []).map((row, index) => (
                    <div key={row.key}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span>{row.icon}</span>
                          <span className="font-medium">{row.label}</span>
                          <span className="text-xs text-slate-500">
                            {row.count} holding{row.count === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="font-semibold">
                            {money(row.current)}
                          </span>
                          <span className={`text-xs ${toneFor(row.gain)}`}>
                            {percent(row.gainPercent)}
                          </span>
                          <span className="w-12 text-right text-xs text-slate-500">
                            {row.allocation.toFixed(1)}%
                          </span>
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 w-full rounded-full bg-white/5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${row.allocation}%`,
                            background:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Risk mix */}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="text-sm text-slate-400">By risk profile</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(portfolio?.byCategory || []).map((row) => (
                      <span
                        key={row.key}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
                      >
                        {row.label}{" "}
                        <span className="font-semibold text-slate-200">
                          {row.allocation.toFixed(0)}%
                        </span>
                        <span className="ml-1 text-slate-500">
                          {categories[row.key]?.risk || ""}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-bold">Split</h2>

                <div className="mt-2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {allocationData.map((entry, index) => (
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
                </div>

                {/* Best / worst */}
                <div className="mt-2 space-y-2">
                  {portfolio?.best && (
                    <div className="rounded-xl bg-emerald-500/10 p-3">
                      <p className="text-xs text-emerald-200">Best performer</p>
                      <p className="mt-0.5 flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{portfolio.best.name}</span>
                        <span className="font-semibold text-emerald-300">
                          {percent(portfolio.best.gainPercent)}
                        </span>
                      </p>
                    </div>
                  )}

                  {portfolio?.worst && (
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-xs text-slate-400">Weakest</p>
                      <p className="mt-0.5 flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{portfolio.worst.name}</span>
                        <span
                          className={`font-semibold ${toneFor(portfolio.worst.gainPercent)}`}
                        >
                          {percent(portfolio.worst.gainPercent)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>

            {/* ============ HOLDINGS ============ */}
            <motion.section
              {...motionProps(0.1)}
              className="rounded-2xl border border-white/10 bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Holdings</h2>

                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      aria-label="Search holdings"
                      value={filters.search}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          search: event.target.value,
                        }))
                      }
                      placeholder="Search"
                      className="rounded-xl border border-white/10 bg-slate-800 p-2.5 pl-9 text-sm"
                    />
                  </div>

                  <select
                    aria-label="Filter by type"
                    value={filters.typeKey}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        typeKey: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-white/10 bg-slate-800 p-2.5 text-sm"
                  >
                    <option value="all">All types</option>
                    {(portfolio?.byType || []).map((row) => (
                      <option key={row.key} value={row.key}>
                        {row.label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Sort holdings"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-800 p-2.5 text-sm"
                  >
                    <option value="value">Value</option>
                    <option value="gain">Gain</option>
                    <option value="gainPercent">Return %</option>
                    <option value="name">Name</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {visibleHoldings.length === 0 ? (
                  <EmptyState
                    icon={FiPieChart}
                    title="No matching holdings"
                    message="Adjust the filters, or add a new holding."
                  />
                ) : (
                  visibleHoldings.map((item) => {
                    const allocation =
                      totals.current > 0
                        ? (item.currentValue / totals.current) * 100
                        : 0;

                    return (
                      <div
                        key={item._id}
                        className="rounded-2xl border border-white/10 bg-slate-800/50 p-4 transition-colors hover:border-white/20"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 font-semibold">
                              <span className="text-lg">{item.type?.icon}</span>
                              <span className="break-words">{item.name}</span>
                              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400">
                                {item.type?.label}
                              </span>
                              {item.isSip && (
                                <span className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2 py-0.5 text-xs text-indigo-200">
                                  SIP {money(item.sipAmount)}/mo
                                </span>
                              )}
                              {item.isExternal && (
                                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-200">
                                  Held by {item.onBehalfOf || "another"}
                                </span>
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.platform || "No platform"} · since{" "}
                              {formatDate(item.purchaseDate)}
                              {item.goal && ` · for ${item.goal}`}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="break-words text-2xl font-bold">
                              {money(item.currentValue)}
                            </p>
                            <p
                              className={`text-sm font-semibold ${toneFor(item.gain)}`}
                            >
                              {item.gain >= 0 ? "+" : "−"}
                              {money(Math.abs(item.gain))}{" "}
                              <span className="text-xs">
                                ({percent(item.gainPercent)})
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-1 w-full rounded-full bg-white/5">
                          <div
                            className={`h-1 rounded-full ${
                              item.gain >= 0 ? "bg-emerald-400" : "bg-red-400"
                            }`}
                            style={{ width: `${Math.min(allocation, 100)}%` }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                          <span>
                            {money(item.investedAmount)} invested ·{" "}
                            {allocation.toFixed(1)}% of portfolio
                            {item.annualisedReturn !== null &&
                              ` · ${percent(item.annualisedReturn)} p.a.`}
                          </span>

                          <div className="flex flex-wrap gap-2">
                            {item.type?.valueField && (
                              <button
                                onClick={() => openValueUpdate(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20 hover:text-white"
                              >
                                <FiRefreshCw />
                                Update value
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(item)}
                              aria-label={`Edit ${item.name}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20 hover:text-white"
                            >
                              <FiEdit2 />
                              Edit
                            </button>
                            <button
                              onClick={() => requestDelete(item)}
                              aria-label={`Remove ${item.name}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-red-300 transition hover:border-red-500/40"
                            >
                              <FiTrash2 />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.section>
          </>
        )}

        {/* ============ ADD / EDIT ============ */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          title={editing ? "Edit Holding" : "Add Holding"}
          maxWidth="max-w-3xl"
        >
          <div>
            <p className="mb-2 text-sm text-slate-400">Type</p>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type.key}
                  onClick={() => changeType(type.key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    form.typeKey === type.key
                      ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                      : "border-white/10 bg-slate-800 text-slate-300 hover:border-white/30"
                  }`}
                >
                  <span>{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
            {activeType?.description && (
              <p className="mt-2 text-xs text-slate-500">
                {activeType.description}
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input
              label="Name"
              placeholder="Parag Parikh Flexi Cap"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <Input
              label={activeType?.platformLabel || "Platform"}
              placeholder="Groww"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            />
          </div>

          {/* Type-specific fields */}
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {(activeType?.fields || []).map((field) => (
              <div key={field.key}>
                <Input
                  label={field.label + (field.required ? " *" : "")}
                  type="number"
                  step={field.step}
                  value={form.fields[field.key] ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fields: { ...form.fields, [field.key]: e.target.value },
                    })
                  }
                />
                {field.help && (
                  <p className="mt-1 text-xs text-slate-500">{field.help}</p>
                )}
              </div>
            ))}
          </div>

          {/* Derived preview */}
          {(activeType?.derived || []).length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {activeType.derived.map((derived) => (
                <div
                  key={derived.key}
                  className={`rounded-xl p-4 ${
                    derived.tone === "positive"
                      ? "bg-emerald-500/10"
                      : "bg-slate-800"
                  }`}
                >
                  <p className="text-sm text-slate-400">{derived.label}</p>
                  <p className="break-words text-xl font-bold">
                    {money(preview.fields[derived.key])}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Input
              label="Purchase Date"
              type="date"
              value={form.purchaseDate}
              onChange={(e) =>
                setForm({ ...form, purchaseDate: e.target.value })
              }
            />

            <Input
              label="Goal (optional)"
              placeholder="Retirement"
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />

            <div>
              <Input
                label="Held by (optional)"
                placeholder="Father"
                value={form.onBehalfOf}
                onChange={(e) =>
                  setForm({ ...form, onBehalfOf: e.target.value })
                }
              />
              <p className="mt-1 text-xs text-slate-500">
                For an FD or property someone holds for you. Tracked in your
                portfolio and flagged as externally held.
              </p>
            </div>

            <label className="flex items-center gap-3 self-end rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.isSip}
                onChange={(e) => setForm({ ...form, isSip: e.target.checked })}
              />
              Monthly SIP
            </label>

            {form.isSip && (
              <>
                <Input
                  label="SIP Amount"
                  type="number"
                  value={form.sipAmount}
                  onChange={(e) =>
                    setForm({ ...form, sipAmount: e.target.value })
                  }
                />
                <Select
                  label="SIP Day"
                  value={form.sipDay}
                  onChange={(e) => setForm({ ...form, sipDay: e.target.value })}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </Select>
              </>
            )}

            <Input
              label="Note"
              containerClassName="md:col-span-3"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          {/* Live summary */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Invested" value={money(preview.invested)} />
            <Stat label="Current Value" value={money(preview.current)} />
            <Stat
              label="Gain / Loss"
              value={money(preview.current - preview.invested)}
              tone={toneFor(preview.current - preview.invested)}
              sub={
                preview.invested > 0
                  ? percent(
                      ((preview.current - preview.invested) / preview.invested) *
                        100,
                    )
                  : "—"
              }
            />
          </div>

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
              {editing ? "Save Changes" : "Add Holding"}
            </Button>
          </div>
        </Modal>

        {/* ============ QUICK VALUE UPDATE ============ */}
        <Modal
          isOpen={!!valueTarget}
          onClose={() => setValueTarget(null)}
          title={valueTarget ? `Revalue ${valueTarget.name}` : "Update value"}
          maxWidth="max-w-md"
        >
          <Input
            label={valueFieldLabel}
            type="number"
            step="any"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
          />

          {valueTarget && (
            <p className="mt-3 text-sm text-slate-400">
              Last valued {formatDate(valueTarget.valuedAt)} at{" "}
              {money(valueTarget.currentValue)}.
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setValueTarget(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleValueUpdate} loading={saving}>
              Update
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
          title="Remove this holding?"
          message={deleteMessage()}
          confirmLabel="Remove"
          loading={deleting}
        />
      </div>
    </DashboardLayout>
  );
}
