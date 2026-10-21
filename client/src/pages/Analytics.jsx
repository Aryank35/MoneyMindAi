import DashboardLayout from "../components/layout/DashboardLayout";
import { getExpensesByUser } from "../services/expenseService";

import { getBudgetByUser } from "../services/budgetService";

import { getUserId } from "../utils/auth";
import { CHART_COLORS, TOOLTIP_STYLE } from "../utils/chartTheme";

import { useEffect, useState } from "react";

import { getAccountsByUser } from "../services/accountService";

import { getIncomesByUser } from "../services/incomeService";

import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

import { FiPieChart, FiCreditCard, FiInbox } from "react-icons/fi";
import { motion } from "framer-motion";

import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { Skeleton } from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import BudgetUtilizationPanel from "../components/common/BudgetUtilizationPanel";
import { compactAmount, money, tileAmount } from "../utils/incomeFormulas";

// "YYYY-MM-DD" in the viewer's own timezone. Every calendar key in this
// file goes through here so cell totals and day listings agree.
const toLocalDateKey = (value) => {
  const date = new Date(value);

  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
};

// "YYYY-MM", the key every figure on this page is scoped by.
const toMonthKey = (value) => toLocalDateKey(value).slice(0, 7);

const monthKeyOf = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const labelForMonthKey = (key) => {
  const [year, month] = key.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// A budget stores its month as a label like "September 2026"; older rows
// have no monthKey at all. Mirrors the server's `keyForBudget` - parsed
// strictly, because a budget silently filed under the wrong month is worse
// than one with no month at all.
const budgetMonthKey = (budget) => {
  if (budget?.monthKey) return budget.monthKey;

  const match = /^\s*([A-Za-z]+)\s+(\d{4})\s*$/.exec(budget?.month || "");

  if (!match) return "";

  const index = MONTH_NAMES.indexOf(match[1].toLowerCase());

  if (index < 0) return "";

  return `${match[2]}-${String(index + 1).padStart(2, "0")}`;
};

// A pie stops saying anything once it has more slices than the eye can
// separate - and with a 10-colour ramp cycled across 40 categories the
// colours repeat outright, so identity means nothing. The big ones are
// named; the long tail is one honest "Other".
const TOP_SLICES = 8;

const toPieData = (summary) => {
  const rows = Object.entries(summary)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (rows.length <= TOP_SLICES + 1) return rows;

  const head = rows.slice(0, TOP_SLICES);

  const tail = rows.slice(TOP_SLICES);

  return [
    ...head,
    {
      name: `Other (${tail.length})`,
      value: tail.reduce((sum, row) => sum + row.value, 0),
      isOther: true,
    },
  ];
};

export default function Analytics() {
  const [expenses, setExpenses] = useState([]);

  // Every month's plan, not just the current one - the page can be read for
  // any month, and each month has to be measured against its own plan.
  const [budgets, setBudgets] = useState([]);

  // "month" reads the month the calendar is on; "all" reads everything ever
  // recorded. The tiles used to be labelled "Monthly" while summing all of
  // history, which is why a month with a 1,28,500 income showed the same
  // figure in April as in October.
  const [scope, setScope] = useState("month");

  const [selectedDate, setSelectedDate] = useState(null);

  const [loading, setLoading] = useState(() => Boolean(getUserId()));

  const [currentDate, setCurrentDate] = useState(new Date());

  const [accounts, setAccounts] = useState([]);

  const [incomes, setIncomes] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      let userId;

      try {
        userId = getUserId();
      } catch (error) {
        console.error("Error reading logged-in user:", error);
        return;
      }

      if (!userId) {
        return;
      }

      try {
        const expenseRes = await getExpensesByUser(userId);

        const budgetRes = await getBudgetByUser(userId);

        const accountRes = await getAccountsByUser(userId);

        const incomeRes = await getIncomesByUser(userId);

        if (cancelled) return;

        setExpenses(expenseRes.data || []);

        setBudgets(budgetRes.data || []);

        setAccounts(accountRes.data || []);

        setIncomes(incomeRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <Skeleton className="h-10 w-56 mb-3" />
          <Skeleton className="h-5 w-72" />
        </div>

        <Skeleton className="h-96 mb-6" />

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>

        <Skeleton className="h-64" />
      </DashboardLayout>
    );
  }

  const year = currentDate.getFullYear();

  const month = currentDate.getMonth();

  // ======================================================================
  // THE PERIOD EVERY FIGURE BELOW IS READ FOR
  //
  // One notion of "when" for the whole page: the calendar's month arrows
  // and the period control move the same state, so the tiles and the
  // calendar can never be describing different months.
  // ======================================================================
  const activeMonthKey = monthKeyOf(currentDate);

  const isAllTime = scope === "all";

  const periodLabel = isAllTime
    ? "All time"
    : labelForMonthKey(activeMonthKey);

  const inPeriod = (value) =>
    isAllTime || toMonthKey(value) === activeMonthKey;

  const periodExpenses = expenses.filter((expense) =>
    inPeriod(expense.expenseDate),
  );

  const periodIncomes = incomes.filter((income) => inPeriod(income.incomeDate));

  // Months that actually have something in them, newest first, plus the
  // current month so the page always opens on a real choice.
  const availableMonths = [
    ...new Set([
      monthKeyOf(new Date()),
      activeMonthKey,
      ...expenses.map((expense) => toMonthKey(expense.expenseDate)),
      ...incomes.map((income) => toMonthKey(income.incomeDate)),
    ]),
  ].sort((a, b) => (a < b ? 1 : -1));

  // The plan belonging to the month on screen - not whichever plan happened
  // to be returned first.
  const activeBudget = isAllTime
    ? null
    : budgets.find((item) => budgetMonthKey(item) === activeMonthKey) || null;

  const categorySummary = {};

  periodExpenses.forEach((expense) => {
    categorySummary[expense.category] =
      (categorySummary[expense.category] || 0) + expense.amount;
  });

  // Daily expense totals keyed by local "YYYY-MM-DD", built from the
  // expense's local date components — this is the format `getAmountForDay`
  // (and the spending calendar) actually reads. A second, overlapping loop
  // that re-derived the same keys via `toISOString()` used to run here too,
  // silently double-counting every day's total (and skewing the
  // highest/lowest spending day stats) — it added no new information and
  // has been removed.
  const expensesByDate = {};

  expenses.forEach((expense) => {
    const key = toLocalDateKey(expense.expenseDate);

    expensesByDate[key] = (expensesByDate[key] || 0) + expense.amount;
  });

  // The highest and lowest spending day are read for the period on screen,
  // so "my worst day" means the worst day of this month rather than the
  // worst day in the app's entire history.
  const periodByDate = {};

  periodExpenses.forEach((expense) => {
    const key = toLocalDateKey(expense.expenseDate);

    periodByDate[key] = (periodByDate[key] || 0) + expense.amount;
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const sortedDays = Object.entries(periodByDate).sort((a, b) => b[1] - a[1]);

  const highestDay = sortedDays[0] || [null, 0];

  const lowestDay = sortedDays.length
    ? [...sortedDays].sort((a, b) => a[1] - b[1])[0]
    : [null, 0];

  const firstDay = new Date(year, month, 1).getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Only real days are rendered. The first one is pushed to its weekday
  // column with grid-column-start instead of padding the grid with filler
  // divs - fewer nodes, and no placeholder keys to collide with day keys.
  const calendarCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const COLORS = CHART_COLORS;

  // Must use the same local key the calendar cells are built from. This
  // previously compared against toISOString(), which is UTC - east of
  // Greenwich that put early-morning spending on the previous day, so a cell
  // could show a total and then open to an empty list.
  const selectedExpenses = expenses.filter(
    (expense) => toLocalDateKey(expense.expenseDate) === selectedDate,
  );

  // Everything below is the PERIOD's figure. These used to be whole-history
  // sums sitting under labels that said "Monthly".
  const totalSpent = periodExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const totalIncome = periodIncomes.reduce(
    (sum, income) => sum + income.amount,
    0,
  );

  // A budget is a monthly plan, so there is no such thing as an all-time
  // one. Rather than sum plans that were never meant to be added together,
  // the remaining-budget card says so and steps aside.
  const totalBudget = Number(activeBudget?.totalBudget || 0);

  const remaining = Math.max(0, totalBudget - totalSpent);

  const getAmountForDay = (day) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;

    return expensesByDate[dateKey] || 0;
  };

  const getCellColor = (amount) => {
    if (amount === 0) return "bg-slate-800";

    if (amount < 500) return "bg-green-500/20";

    if (amount < 1000) return "bg-yellow-500/20";

    if (amount < 3000) return "bg-orange-500/20";

    return "bg-red-500/20";
  };

  const totalExpense = totalSpent;

  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
      : 0;

  const savingStatus = () => {
    if (savingsRate > 40) return "Saver";

    if (savingsRate > 20) return "Balanced";

    if (savingsRate > 0) return "Explorer";

    return "Spender";
  };

  // Income minus spending for the period. This was labelled "Net Worth",
  // which it has never been - net worth is what the accounts hold, and that
  // is shown further down under Accounts Overview.
  const netSaved = totalIncome - totalExpense;

  const transactionCount = periodExpenses.length;

  const categoryCount = Object.keys(categorySummary).length;

  const pieData = toPieData(categorySummary);

  const accountPieData = accounts.map((account) => ({
    name: account.name,
    value: account.balance,
  }));

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  const topCategory = Object.entries(categorySummary).sort(
    (a, b) => b[1] - a[1],
  )[0];

  // A budget is a monthly figure, so it is only ever measured against one
  // month's spending. Comparing it with the all-time total - which is what
  // this used to do - tells anyone who has used the app for more than a
  // month that they are over, however little they spent.
  const budgetInsight = isAllTime
    ? "Pick a month to measure spending against its budget."
    : totalBudget <= 0
      ? `No budget was set for ${periodLabel}.`
      : totalSpent > totalBudget
        ? `${periodLabel} is over budget by ₹${Math.round(
            totalSpent - totalBudget,
          ).toLocaleString("en-IN")}.`
        : totalSpent > totalBudget * 0.8
          ? `You have used ${Math.round(
              (totalSpent / totalBudget) * 100,
            )}% of the ${periodLabel} budget.`
          : `Budget utilization is healthy in ${periodLabel}.`;

  const insights = [
    topCategory
      ? `Highest spending category is ${topCategory[0]} (${periodLabel.toLowerCase()})`
      : null,

    budgetInsight,

    highestDay[0]
      ? `Highest spending day was ${formatDate(highestDay[0])}`
      : null,
  ].filter(Boolean);

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Analytics</h1>

            <p className="text-slate-400 mt-2">
              Deep dive into your spending patterns, income and financial
              habits
            </p>
          </div>

          {/* One control for the whole page. It moves the same state the
              calendar's arrows do, so the tiles and the calendar are always
              describing the same month. */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-white/10 p-1">
              {[
                { key: "month", label: "By month" },
                { key: "all", label: "All time" },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setScope(option.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    scope === option.key
                      ? "bg-indigo-500/20 text-indigo-100"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <select
              value={activeMonthKey}
              onChange={(event) => {
                const [nextYear, nextMonth] = event.target.value
                  .split("-")
                  .map(Number);

                setCurrentDate(new Date(nextYear, nextMonth - 1, 1));
                setScope("month");
              }}
              disabled={isAllTime}
              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 disabled:opacity-40"
            >
              {availableMonths.map((key) => (
                <option key={key} value={key}>
                  {labelForMonthKey(key)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
      >
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Category Distribution</h2>

          <p className="text-sm text-slate-400">
            {periodLabel}
            {categoryCount > 0 && (
              <>
                <span className="text-slate-600"> · </span>
                {categoryCount}{" "}
                {categoryCount === 1 ? "category" : "categories"}
                <span className="text-slate-600"> · </span>
                {money(totalSpent)}
              </>
            )}
          </p>
        </div>

        {pieData.length === 0 ? (
          <EmptyState
            icon={FiPieChart}
            title="No expense data yet"
            message={
              isAllTime
                ? "Add some expenses to see your category distribution."
                : `Nothing was spent in ${periodLabel}.`
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={2}
                  stroke="#0b0b0f"
                  strokeWidth={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      // The tail is deliberately neutral - "Other" is an
                      // absence of identity, not another category.
                      fill={entry.isOther ? "#4b4b55" : COLORS[index]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [money(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* The ranked readout is the part that actually gets read: every
                slice named, with its amount and share, rather than forty
                percentages fighting for room around a circle. */}
            <div className="space-y-1.5">
              {pieData.map((entry, index) => (
                <div
                  key={entry.name}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{
                      background: entry.isOther ? "#4b4b55" : COLORS[index],
                    }}
                  />

                  <span className="min-w-0 flex-1 truncate text-slate-300">
                    {entry.name}
                  </span>

                  <span className="shrink-0 tabular-nums text-slate-400">
                    {money(entry.value)}
                  </span>

                  <span className="w-10 shrink-0 text-right tabular-nums text-slate-500">
                    {totalSpent > 0
                      ? `${Math.round((entry.value / totalSpent) * 100)}%`
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Each tile names the period it is for. "Monthly Income" over an
          all-time sum was the single most misleading thing on this page. */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Income",
            value: money(totalIncome),
            valueClassName: "",
          },
          {
            label: "Expense",
            value: money(totalSpent),
            valueClassName: "text-red-400",
          },
          {
            label: "Net saved",
            value: money(netSaved),
            valueClassName: netSaved < 0 ? "text-red-400" : "text-green-400",
            hint:
              netSaved < 0 ? "spent more than came in" : "income minus spending",
          },
          {
            label: "Savings rate",
            value: `${savingsRate.toFixed(0)}%`,
            valueClassName: savingsRate < 0 ? "text-red-400" : "",
          },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            className="bg-white/5 rounded-2xl p-5"
          >
            <p className="text-slate-400">{card.label}</p>

            <h3
              className={`text-2xl font-bold tabular-nums ${card.valueClassName}`}
            >
              {card.value}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {card.hint || periodLabel}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white/5 rounded-2xl p-6 mb-6"
      >
        <p className="text-slate-400">
          Remaining Budget
          <span className="text-slate-600"> · </span>
          <span className="text-slate-500">{periodLabel}</span>
        </p>

        {/* A budget is a monthly plan. There is no all-time one, and summing
            twelve separate plans into a single "remaining" would be a figure
            that never meant anything. */}
        {isAllTime ? (
          <p className="mt-1 text-sm text-slate-500">
            Pick a month to see what is left of its budget.
          </p>
        ) : totalBudget <= 0 ? (
          <p className="mt-1 text-sm text-slate-500">
            No budget was set for {periodLabel}.
          </p>
        ) : (
          <>
            <h2 className="text-3xl font-bold mt-1 tabular-nums">
              {money(remaining)}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              of {money(totalBudget)} planned
              {totalSpent > totalBudget && (
                <span className="text-red-400">
                  {" "}
                  · {money(totalSpent - totalBudget)} over
                </span>
              )}
            </p>
          </>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6">
          {[
            {
              label: "Income",
              value: totalIncome,
              tone: "text-green-400",
            },
            {
              label: "Expense",
              value: totalExpense,
              tone: "text-red-400",
            },
            {
              label: "Transactions",
              value: transactionCount,
              tone: "",
              plain: true,
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className="min-w-0 bg-white/5 border border-white/10 rounded-xl p-2 sm:p-4"
            >
              <p className="text-slate-400 text-xs sm:text-sm truncate">
                {tile.label}
              </p>

              <h4
                className={`text-base sm:text-xl font-bold mt-1 tabular-nums truncate ${tile.tone}`}
                title={tile.plain ? undefined : `₹${tile.value.toLocaleString("en-IN")}`}
              >
                {tile.plain ? (
                  tile.value
                ) : (
                  <>
                    {/* Full figure while it fits the narrow tile, compact
                        past the point it would be ellipsised. */}
                    <span className="sm:hidden">{tileAmount(tile.value)}</span>

                    <span className="hidden sm:inline">
                      ₹{tile.value.toLocaleString("en-IN")}
                    </span>
                  </>
                )}
              </h4>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white/5 rounded-2xl p-6 mb-6"
      >
        <h2 className="text-xl font-semibold mb-4">Accounts Overview</h2>

        {accounts.length === 0 ? (
          <EmptyState
            icon={FiCreditCard}
            title="No accounts yet"
            message="Add an account to see your accounts overview here."
          />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={accountPieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                >
                  {accountPieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid md:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <div
                  key={account._id}
                  className="relative overflow-hidden bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
                >
                  <div className="text-3xl mb-3">{account.icon || "💳"}</div>

                  <h3 className="font-semibold">{account.name}</h3>

                  <p className="text-slate-400 text-sm">{account.type}</p>

                  <h2 className="text-3xl font-bold mt-4">
                    ₹{account.balance.toLocaleString()}
                  </h2>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl p-6"
      >
        <h2 className="text-xl font-bold mb-4">AI Insights</h2>

        {insights.length === 0 ? (
          <p className="text-slate-400">
            Not enough data yet to generate insights.
          </p>
        ) : (
          insights.map((insight, index) => (
            <p key={index} className="mb-2">
              • {insight}
            </p>
          ))
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-2xl p-6 mt-6"
      >
        <h2 className="text-xl font-bold">Spending DNA</h2>

        <h1 className="text-4xl mt-4">
          {savingStatus() === "Saver" && "🟢 Saver"}
          {savingStatus() === "Balanced" && "🔵 Balanced"}
          {savingStatus() === "Explorer" && "🟠 Explorer"}
          {savingStatus() === "Spender" && "🔴 Spender"}
        </h1>

        <p className="text-slate-400 mt-3">
          Based on your savings rate in {periodLabel.toLowerCase()}.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-6 mt-6"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            ←
          </button>

          <h2 className="text-2xl font-bold">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>

          <button
            onClick={handleNextMonth}
            aria-label="Next month"
            className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            →
          </button>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-5">
          Spending Calendar
        </h3>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-[10px] sm:text-sm font-semibold text-slate-400 pb-1"
            >
              {/* Three letters do not fit a phone-width column. */}
              <span className="sm:hidden">{day[0]}</span>
              <span className="hidden sm:inline">{day}</span>
            </div>
          ))}

          {calendarCells.map((day) => {
            const amount = getAmountForDay(day);

            const dateKey = `${year}-${String(month + 1).padStart(
              2,
              "0",
            )}-${String(day).padStart(2, "0")}`;

            const dayLabel = new Date(year, month, day).toLocaleDateString(
              "en-IN",
              { day: "numeric", month: "long", year: "numeric" },
            );

            return (
              <div
                key={`${year}-${month}-${day}`}
                role="button"
                tabIndex={0}
                style={day === 1 ? { gridColumnStart: firstDay + 1 } : undefined}
                aria-label={`${dayLabel}, ₹${amount.toLocaleString()} spent`}
                onClick={() => setSelectedDate(dateKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDate(dateKey);
                  }
                }}
                className={`
    flex flex-col justify-between overflow-hidden
    aspect-square sm:aspect-auto sm:h-24
    rounded-lg sm:rounded-2xl
    cursor-pointer
    p-1 sm:p-3
    border
    transition-all
    duration-200
    sm:hover:scale-105
    hover:border-indigo-400
    ${selectedDate === dateKey ? "ring-2 ring-indigo-500" : "border-white/10"}
    ${getCellColor(amount)}
  `}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className="font-semibold text-[11px] sm:text-sm leading-none">
                    {day}
                  </span>

                  {/* The figure itself flags a spend on a phone; the dot would
                      only take width off it. */}
                  {amount > 0 && (
                    <span className="hidden sm:block w-2 h-2 rounded-full bg-white shrink-0" />
                  )}
                </div>

                <div className="min-w-0">
                  {amount > 0 ? (
                    <p className="font-semibold sm:font-medium text-[10px] sm:text-xs leading-none tabular-nums truncate">
                      {/* A full "₹17,000" cannot fit a ~30px cell, so the
                          phone gets "17k" and the colour carries the scale.
                          The full figure stays in the cell's aria-label. */}
                      <span className="sm:hidden">{compactAmount(amount)}</span>

                      <span className="hidden sm:inline">
                        ₹{amount.toLocaleString("en-IN")}
                      </span>
                    </p>
                  ) : (
                    <p className="hidden sm:block text-xs text-slate-500">
                      No Spend
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Abbreviating the figure on a phone leans more weight on the cell
            colour, so the scale it encodes is spelled out. Thresholds mirror
            getCellColor. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 text-[10px] sm:text-xs text-slate-400">
          {[
            ["bg-slate-800", "No spend"],
            ["bg-green-500/20", "Under ₹500"],
            ["bg-yellow-500/20", "₹500 - ₹1k"],
            ["bg-orange-500/20", "₹1k - ₹3k"],
            ["bg-red-500/20", "₹3k+"],
          ].map(([swatch, label]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`w-3 h-3 rounded border border-white/10 shrink-0 ${swatch}`}
              />
              {label}
            </span>
          ))}
        </div>
      </motion.div>

      <Modal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDate(selectedDate) : ""}
        maxWidth="max-w-lg"
      >
        {selectedExpenses.length === 0 ? (
          <EmptyState
            icon={FiInbox}
            title="No expenses"
            message="No expenses were recorded on this day."
          />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar -mr-2 pr-2">
            {selectedExpenses.map((expense) => (
              <div
                key={expense._id}
                className="flex justify-between py-3 border-b border-slate-700"
              >
                <div>
                  <p className="font-medium">{expense.category}</p>

                  <p className="text-xs text-slate-400">
                    {expense.note || "No note"}
                  </p>
                </div>

                <div className="text-red-400">₹{expense.amount}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="primary" onClick={() => setSelectedDate(null)}>
            Close
          </Button>
        </div>
      </Modal>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
          <p className="text-slate-400">
            Highest Spending Day
            <span className="text-slate-600"> · </span>
            <span className="text-slate-500">{periodLabel}</span>
          </p>

          <h3 className="text-xl font-bold mt-2">
            {formatDate(highestDay[0])}
          </h3>

          <p className="text-red-400 tabular-nums">{money(highestDay[1])}</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
          <p className="text-slate-400">
            Lowest Spending Day
            <span className="text-slate-600"> · </span>
            {/* Days with no spending at all are not candidates - otherwise
                the answer is always zero and never says anything. */}
            <span className="text-slate-500">cheapest day with spending</span>
          </p>

          <h3 className="text-xl font-bold mt-2">{formatDate(lowestDay[0])}</h3>

          <p className="text-green-400 tabular-nums">{money(lowestDay[1])}</p>
        </div>
      </div>

      {/* Measured per month, and rolled up across months - a budget limit is
          a monthly figure, so comparing it with a running all-time total
          (which is what used to happen here) only ever reads "over". */}
      <BudgetUtilizationPanel />
    </DashboardLayout>
  );
}
