import { useEffect, useState } from "react";
import { FiAlertTriangle, FiPieChart, FiTrendingUp } from "react-icons/fi";

import CategoryProgressBar from "./CategoryProgressBar";
import EmptyState from "./EmptyState";
import { Skeleton } from "./Loader";
import { getBudgetUtilization } from "../../services/budgetService";
import { getUserId } from "../../utils/auth";
import { money, tileAmount } from "../../utils/incomeFormulas";

// =========================================================================
// BUDGET UTILISATION
//
// A budget limit is a MONTHLY figure. The old version of this panel measured
// every category against every expense ever recorded, so a 5,000 food limit
// was compared with a year of food spending and read 1,400% used - the panel
// said "over" no matter how the month had actually gone, which is the same
// as saying nothing.
//
// So there are two readings, and the user picks which one they are asking
// for:
//
//   A month  - the plan for that month against the spending in it. This is
//              the only comparison a limit is defined for.
//   Overall  - every month rolled up, where a category's allowance is the
//              SUM of its monthly limits. The useful question here is not
//              "am I over" but "do I keep setting this limit wrong", which
//              is what the months-over count answers.
//
// Both come from one endpoint so they can never disagree, and both read
// spending from the ledger - a split share counts, a card payment does not.
// =========================================================================

const OVERALL = "overall";

// Status, not identity: one measure, three states. Each bar carries its
// number in text as well, so the state is never colour alone.
const toneFor = (percent, hasPlan = true) => {
  if (!hasPlan) return { bar: "bg-slate-600", text: "text-slate-400" };

  if (percent > 100) return { bar: "bg-red-400", text: "text-red-300" };

  if (percent >= 85) return { bar: "bg-amber-400", text: "text-amber-300" };

  return { bar: "bg-emerald-400", text: "text-emerald-300" };
};

const shortMonth = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
};

function Tile({ label, value, hint, tone = "text-white" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>

      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>

      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// One row per month: how much of that month's plan was used. Bars are thin
// and share one scale, so a run of months reads as a trend rather than as a
// row of unrelated gauges.
function MonthTrend({ months, selected, onSelect }) {
  // A month that ran to 160% still has to fit, so the scale stretches to the
  // worst month rather than clipping at 100 and hiding exactly the overspend
  // the panel exists to show.
  const ceiling = Math.max(
    120,
    ...months.map((item) => item.percentUsed || 0),
  );

  return (
    <div className="space-y-1.5">
      {months.map((item) => {
        const tone = toneFor(item.percentUsed, item.hasBudget);

        const width = item.hasBudget
          ? Math.max((item.percentUsed / ceiling) * 100, 1.5)
          : 0;

        return (
          <button
            key={item.monthKey}
            type="button"
            onClick={() => onSelect(item.monthKey)}
            className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5 ${
              selected === item.monthKey ? "bg-white/5" : ""
            }`}
            title={`${item.month} · ${money(item.totalSpent)} of ${money(
              item.totalBudget,
            )}`}
          >
            <span className="w-16 shrink-0 text-xs text-slate-400">
              {shortMonth(item.monthKey)}
            </span>

            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
              {item.hasBudget && (
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${tone.bar}`}
                  style={{ width: `${Math.min(width, 100)}%` }}
                />
              )}

              {/* Where the plan sat, so an over-run is read against a mark
                  rather than against nothing. */}
              {item.hasBudget && (
                <span
                  className="absolute inset-y-0 w-px bg-white/40"
                  style={{ left: `${(100 / ceiling) * 100}%` }}
                />
              )}
            </span>

            <span
              className={`w-24 shrink-0 text-right text-xs tabular-nums ${
                item.hasBudget ? tone.text : "text-slate-500"
              }`}
            >
              {item.hasBudget ? `${item.percentUsed}%` : "no plan"}
            </span>

            <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums text-slate-500 sm:block">
              {tileAmount(item.totalSpent)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function BudgetUtilizationPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState(OVERALL);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const userId = getUserId();

        if (!userId) return;

        const response = await getBudgetUtilization(userId);

        if (cancelled) return;

        setData(response.data);

        // Open on the current month when there is one to read - "how am I
        // doing right now" is the question being asked most of the time.
        const current = (response.data?.months || []).find(
          (item) => item.isCurrentMonth && item.hasBudget,
        );

        if (current) setView(current.monthKey);
      } catch (err) {
        console.error("Budget utilisation:", err);

        if (!cancelled) setError("Could not load budget utilisation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const months = data?.months || [];

  const overall = data?.overall || null;

  const month = months.find((item) => item.monthKey === view) || null;

  const isOverall = view === OVERALL;

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <Skeleton className="mb-6 h-7 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-2 text-xl font-semibold">Budget Utilization</h2>
        <p className="text-sm text-slate-400">{error}</p>
      </div>
    );
  }

  if (!months.length) {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-6 text-xl font-semibold">Budget Utilization</h2>

        <EmptyState
          icon={FiPieChart}
          title="No budget categories found"
          message="Create a budget to track category utilization here."
        />
      </div>
    );
  }

  const categories = isOverall
    ? overall?.categories || []
    : month?.categories || [];

  const unbudgeted = isOverall
    ? overall?.unbudgeted || []
    : month?.unbudgeted || [];

  const net = isOverall ? overall?.net || 0 : month?.net || 0;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Budget Utilization</h2>

          <p className="mt-1 text-sm text-slate-400">
            {isOverall
              ? `Every month with a plan · ${overall?.budgetedMonthCount || 0} of ${
                  overall?.monthCount || 0
                } months budgeted`
              : month?.hasBudget
                ? `${month.month} · this month's plan against this month's spending`
                : `${month?.month} · no plan was set for this month`}
          </p>
        </div>

        {/* One control, one row, above the data it filters. */}
        <select
          value={view}
          onChange={(event) => setView(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
        >
          <option value={OVERALL}>Overall · all months</option>

          {months.map((item) => (
            <option key={item.monthKey} value={item.monthKey}>
              {item.month}
              {item.hasBudget ? "" : " (no plan)"}
            </option>
          ))}
        </select>
      </div>

      {/* ---- headline ---- */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Budgeted"
          value={tileAmount(
            isOverall ? overall?.totalBudget : month?.totalBudget,
          )}
          hint={
            isOverall
              ? `across ${overall?.budgetedMonthCount || 0} months`
              : undefined
          }
        />

        <Tile
          label="Spent"
          value={tileAmount(isOverall ? overall?.totalSpent : month?.totalSpent)}
          tone={net < 0 ? "text-red-300" : "text-emerald-300"}
          hint={
            isOverall && overall?.averageSpent !== null
              ? `${tileAmount(overall?.averageSpent)} a month on average`
              : undefined
          }
        />

        <Tile
          label={net < 0 ? "Over budget" : "Left"}
          value={tileAmount(Math.abs(net))}
          tone={net < 0 ? "text-red-300" : "text-white"}
        />

        <Tile
          label={isOverall ? "Average used" : "Used"}
          value={
            isOverall
              ? overall?.averagePercentUsed === null
                ? "—"
                : `${overall?.averagePercentUsed}%`
              : `${month?.percentUsed || 0}%`
          }
          tone={
            toneFor(
              isOverall
                ? (overall?.averagePercentUsed ?? 0)
                : month?.percentUsed || 0,
            ).text
          }
          hint={
            isOverall
              ? `${overall?.monthsWithinBudget || 0} within · ${
                  overall?.monthsOverBudget || 0
                } over`
              : undefined
          }
        />
      </div>

      {/* ---- the trend, overall only ---- */}
      {isOverall && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <FiTrendingUp className="text-slate-500" size={15} />

            <h3 className="text-sm font-medium text-slate-300">
              Month by month
            </h3>

            <span className="text-xs text-slate-500">
              share of that month&apos;s plan used · tap a month to open it
            </span>
          </div>

          <MonthTrend
            months={[...months].reverse()}
            selected={view}
            onSelect={setView}
          />
        </div>
      )}

      {/* ---- limits that are set wrong, not months that went wrong ---- */}
      {isOverall && overall?.chronicOverspend?.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
            <FiAlertTriangle size={15} />
            Over in half their months or more
          </p>

          <p className="mt-1 text-xs text-amber-200/70">
            A line that goes over this often is a limit set too low, not a run
            of bad months.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {overall.chronicOverspend.map((item) => (
              <span
                key={item.name}
                className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100"
              >
                {item.name} · {item.monthsOver}/{item.months} months ·{" "}
                {tileAmount(item.averageSpent)} avg vs{" "}
                {tileAmount(item.averageLimit)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---- per category ---- */}
      <h3 className="mb-4 text-sm font-medium text-slate-300">
        {isOverall ? "Categories, all months combined" : "Categories"}
      </h3>

      {categories.length === 0 ? (
        <EmptyState
          icon={FiPieChart}
          title={
            isOverall ? "No budget categories found" : "No plan for this month"
          }
          message={
            isOverall
              ? "Create a budget to track category utilization here."
              : "Nothing was budgeted this month, so there is nothing to measure against."
          }
        />
      ) : (
        categories.map((category) => (
          <div key={category.name} className="mb-5">
            <CategoryProgressBar
              name={`${category.icon ? `${category.icon} ` : ""}${category.name}`}
              spent={category.spent}
              limit={category.limit}
            />

            {isOverall && (
              <p className="mt-1 text-xs text-slate-500">
                {tileAmount(category.averageSpent)} a month against{" "}
                {tileAmount(category.averageLimit)} planned
                {category.monthsOver > 0 && (
                  <>
                    {" · "}
                    <span className="text-amber-300">
                      over in {category.monthsOver} of {category.months} months
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        ))
      )}

      {/* ---- spending with no plan behind it ---- */}
      {unbudgeted.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="text-sm font-medium text-slate-300">
            Spent outside the plan
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Counted toward the totals above, but no category was budgeted for
            it.
          </p>

          <div className="mt-3 space-y-2">
            {unbudgeted.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-slate-300">{item.name}</span>

                <span className="shrink-0 tabular-nums text-slate-400">
                  {money(item.spent)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
