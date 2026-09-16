import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  FiArrowDownLeft,
  FiArrowRight,
  FiArrowUpRight,
  FiBriefcase,
  FiCreditCard,
  FiInbox,
  FiPieChart,
  FiTarget,
  FiTrendingUp,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";
import AccountCard from "../components/common/AccountCard";
import { Skeleton } from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import MoneyLeftCard from "../components/common/MoneyLeftCard";

import { getDashboardOverview } from "../services/dashboardService";
import { getUserId } from "../utils/auth";
import { money, compactAmount } from "../utils/incomeFormulas";
import { kindMeta } from "../constants/transactionKinds";
import { CHART_ACCENT, CHART_AXIS, TOOLTIP_STYLE } from "../utils/chartTheme";
import {
  computeFinancialHealth,
  getHealthLabel,
  getHealthTone,
} from "../utils/financialHealth";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";

  return "Good night";
};

const formatDay = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

// A shared shell so every panel on the page has the same edge, padding and
// heading treatment instead of each one restating them.
function Panel({ title, action, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
          )}

          {action}
        </header>
      )}

      {children}
    </section>
  );
}

function PanelLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-indigo-300 transition hover:bg-white/5"
    >
      {children}
      <FiArrowRight />
    </Link>
  );
}

// A labelled bar. Anything over its limit is drawn clipped at full width and
// recoloured, so "over budget" reads as a state rather than as a bar that
// silently stopped growing.
function Meter({ value, limit, tone = "bg-indigo-400" }) {
  const percent = limit > 0 ? Math.round((value / limit) * 100) : 0;

  const over = percent > 100;

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            over ? "bg-red-400" : tone
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      {limit > 0 && (
        <p
          className={`mt-1 text-xs ${over ? "text-red-300" : "text-slate-500"}`}
        >
          {percent}% of {money(limit)}
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const userId = getUserId();

        if (!userId) return;

        const overview = await getDashboardOverview(userId);

        if (!cancelled) setData(overview);
      } catch (error) {
        console.error("Dashboard Error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-48 rounded-3xl" />

        <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  const {
    accounts = [],
    pots = [],
    portfolio,
    netWorth = 0,
    totalAssets = 0,
    totalDebt = 0,
    month = {},
    recent = [],
    spendByDay = [],
    spendByCategory = [],
    budgetCategories = [],
    todaySpent = 0,
    weekSpent = 0,
    dailyLimit = 0,
    weeklyLimit = 0,
    totalBudget = 0,
    remainingBudget = 0,
    budgetUsed = 0,
    savingsRate = 0,
    ledgerReady = true,
  } = data || {};

  const health = computeFinancialHealth(data || {});
  const healthLabel = getHealthLabel(health.score, health.hasData);
  const healthTone = getHealthTone(health.score, health.hasData);

  const cards = accounts.filter((account) => account.type === "Credit Card");

  const hasAnything = accounts.length > 0 || month.count > 0;

  const topCategories = spendByCategory.slice(0, 5);

  const maxCategory = topCategories[0]?.amount || 0;

  const stats = [
    {
      key: "today",
      label: "Spent today",
      value: todaySpent,
      limit: dailyLimit,
      tone: "bg-orange-400",
      valueClass: "text-orange-300",
    },
    {
      key: "week",
      label: "Spent this week",
      value: weekSpent,
      limit: weeklyLimit,
      tone: "bg-cyan-400",
      valueClass: "text-cyan-300",
    },
    {
      key: "remaining",
      label: "Budget left",
      value: remainingBudget,
      valueClass:
        remainingBudget < 0 ? "text-red-300" : "text-emerald-300",
      hint:
        totalBudget > 0
          ? `${budgetUsed}% of ${money(totalBudget)} used`
          : "No budget set",
    },
    {
      key: "savings",
      label: "Savings rate",
      value: `${savingsRate}%`,
      isText: true,
      valueClass: savingsRate >= 20 ? "text-emerald-300" : "text-amber-300",
      hint: "Of money in, this month",
    },
  ];

  return (
    <DashboardLayout>
      {/* ---------------------------------------------------------------
          Hero - net worth, and what this month has actually done to it.
          --------------------------------------------------------------- */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(207,175,102,0.10),transparent_55%)]" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-slate-400 text-sm">
                {getGreeting()}
                {currentUser?.name ? `, ${currentUser.name}` : ""}
              </p>

              <p className="mt-1 text-slate-500 text-xs">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>

              <span
                className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${healthTone.bg} ${healthTone.border} ${healthTone.text}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${healthTone.dot}`} />
                {healthLabel}
                {health.hasData && ` · ${health.score}/100`}
              </span>
            </div>

            <div className="min-w-0 sm:text-right">
              <p className="text-slate-400 text-sm">Net worth</p>

              <h2 className="mt-1 text-3xl sm:text-4xl font-bold tabular-nums text-emerald-300">
                {money(netWorth)}
              </h2>

              <p className="mt-2 text-xs text-slate-500">
                {money(totalAssets)} in assets
                {totalDebt > 0 && ` · ${money(totalDebt)} owed`}
              </p>
            </div>
          </div>

          {/* This month, straight off the unified ledger. */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <FiArrowDownLeft className="text-emerald-300" />
                Money in
              </p>

              <p className="mt-1 text-lg sm:text-2xl font-bold tabular-nums text-emerald-300">
                {money(month.inflow || 0)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <FiArrowUpRight className="text-red-300" />
                Money out
              </p>

              <p className="mt-1 text-lg sm:text-2xl font-bold tabular-nums text-red-300">
                {money(month.outflow || 0)}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <p className="text-xs text-slate-400">Spent this month</p>

              <p className="mt-1 text-lg sm:text-2xl font-bold tabular-nums">
                {money(month.spending || 0)}
              </p>

              {totalBudget > 0 && (
                <Meter value={month.spending || 0} limit={totalBudget} />
              )}
            </div>
          </div>

          {/* Money out counts everything that left an account; spending is
              only what was actually spent. Saying so prevents the two
              figures above reading as a contradiction. */}
          {(month.outflow || 0) > (month.spending || 0) && (
            <p className="mt-3 text-xs text-slate-500">
              {money((month.outflow || 0) - (month.spending || 0))} of money out
              was moved rather than spent — transfers, pots and lending.
            </p>
          )}

          {!ledgerReady && (
            <p className="mt-3 text-xs text-amber-300">
              Activity could not be loaded, so this month may be incomplete.
            </p>
          )}
        </div>
      </motion.section>

      {/* The first thing after the hero, because "can I spend?" is the
          question the rest of the page only answers indirectly. */}
      <div className="mt-6">
        <MoneyLeftCard />
      </div>

      {!hasAnything && (
        <Panel className="mt-6">
          <EmptyState
            icon={FiTarget}
            title="Nothing tracked yet"
            message="Add an account, then record income or an expense — every figure on this page fills in from there."
            className="border-none bg-transparent py-6"
          />

          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to="/accounts"
              className="rounded-xl bg-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Add an account
            </Link>

            <Link
              to="/budget"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm"
            >
              Set a budget
            </Link>
          </div>
        </Panel>
      )}

      {/* --------------------------------------------------------------- */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.key}
            variants={itemVariants}
            className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5"
          >
            <p className="truncate text-xs sm:text-sm text-slate-400">
              {stat.label}
            </p>

            <p
              className={`mt-1 truncate text-xl sm:text-2xl font-bold tabular-nums ${stat.valueClass}`}
            >
              {stat.isText ? stat.value : money(stat.value)}
            </p>

            {stat.limit > 0 ? (
              <Meter value={stat.value} limit={stat.limit} tone={stat.tone} />
            ) : (
              stat.hint && (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {stat.hint}
                </p>
              )
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* ---------------------------------------------------------------
          Accounts and cards.
          --------------------------------------------------------------- */}
      {accounts.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-semibold">
              Accounts &amp; cards
            </h3>

            <PanelLink to="/accounts">Manage</PanelLink>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5"
          >
            {accounts.map((account) => (
              <motion.div key={account._id} variants={itemVariants}>
                <AccountCard account={account} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ---------------------------------------------------------------
          Activity - every kind of movement, not just Expense rows.
          --------------------------------------------------------------- */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel
          className="lg:col-span-2"
          title="Recent activity"
          action={<PanelLink to="/expenses">See all</PanelLink>}
        >
          {recent.length === 0 ? (
            <EmptyState
              icon={FiInbox}
              title="Nothing this month"
              message="Expenses, income, transfers, pot funding and lending all show up here."
              className="border-none bg-transparent py-6"
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {recent.map((row) => {
                const meta = kindMeta(row.kind);

                const incoming = row.amount > 0;

                return (
                  <li
                    key={`${row.kind}-${row.id}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 ${meta.tone}`}
                      >
                        {incoming ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm">
                          {row.label}
                        </span>

                        <span className="block truncate text-xs text-slate-500">
                          {meta.label} · {row.accountName} ·{" "}
                          {formatDay(row.date)}
                        </span>
                      </span>
                    </span>

                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        incoming ? "text-emerald-300" : "text-slate-200"
                      }`}
                    >
                      {incoming ? "+" : "−"}
                      {money(Math.abs(row.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Where it went"
          action={<PanelLink to="/analytics">Analytics</PanelLink>}
        >
          {topCategories.length === 0 ? (
            <EmptyState
              icon={FiPieChart}
              title="No spending yet"
              message="Categories appear once you record an expense."
              className="border-none bg-transparent py-6"
            />
          ) : (
            <ul className="space-y-3">
              {topCategories.map((category) => (
                <li key={category.name}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm">{category.name}</span>

                    <span className="shrink-0 text-sm tabular-nums text-slate-300">
                      {money(category.amount)}
                    </span>
                  </div>

                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-indigo-400"
                      style={{
                        width: `${
                          maxCategory > 0
                            ? Math.round((category.amount / maxCategory) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ---------------------------------------------------------------
          Trend and plan.
          --------------------------------------------------------------- */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel className="lg:col-span-2" title="Spending this month">
          {spendByDay.some((point) => point.amount > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={spendByDay}>
                <defs>
                  <linearGradient id="spendBar" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={CHART_ACCENT}
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor={CHART_ACCENT}
                      stopOpacity={0.35}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  stroke={CHART_AXIS}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />

                <YAxis
                  stroke={CHART_AXIS}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(value) => compactAmount(value)}
                />

                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [money(value), "Spent"]}
                  labelFormatter={(label) => `Day ${label}`}
                />

                <Bar
                  dataKey="amount"
                  fill="url(#spendBar)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={FiTrendingUp}
              title="No spending this month"
              message="Daily spending will chart here as you record it."
              className="border-none bg-transparent py-6"
            />
          )}
        </Panel>

        <Panel
          title="Budget allocation"
          action={<PanelLink to="/budget">Edit</PanelLink>}
        >
          {budgetCategories.length === 0 ? (
            <EmptyState
              icon={FiTarget}
              title="No budget yet"
              message="Set category limits to track them against real spending."
              className="border-none bg-transparent py-6"
            />
          ) : (
            <ul className="space-y-3">
              {budgetCategories.map((category) => (
                <li key={category.name}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm">{category.name}</span>

                    <span
                      className={`shrink-0 text-xs tabular-nums ${
                        category.percent > 100
                          ? "text-red-300"
                          : "text-slate-400"
                      }`}
                    >
                      {money(category.spent)} / {money(category.limit)}
                    </span>
                  </div>

                  <Meter value={category.spent} limit={category.limit} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ---------------------------------------------------------------
          Pots and portfolio.
          --------------------------------------------------------------- */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel
          title="Savings pots"
          action={<PanelLink to="/pots">Open</PanelLink>}
        >
          {pots.length === 0 ? (
            <EmptyState
              icon={FiTarget}
              title="No pots yet"
              message="Set money aside for something specific and track it here."
              className="border-none bg-transparent py-6"
            />
          ) : (
            <ul className="space-y-3">
              {pots.slice(0, 5).map((pot) => (
                <li key={pot._id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm">
                      {pot.potIcon} {pot.itemName}
                      {pot.isMirrored && (
                        <span className="ml-2 text-xs text-cyan-300">
                          linked
                        </span>
                      )}
                    </span>

                    <span className="shrink-0 text-xs tabular-nums text-slate-400">
                      {money(pot.savedAmount)} / {money(pot.targetAmount)}
                    </span>
                  </div>

                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width: `${Math.min(pot.progressPercentage || 0, 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Portfolio"
          action={<PanelLink to="/investments">Open</PanelLink>}
        >
          {!portfolio?.totals?.holdings ? (
            <EmptyState
              icon={FiBriefcase}
              title="No holdings yet"
              message="Record an investment to see its value and return here."
              className="border-none bg-transparent py-6"
            />
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Current value</p>

                  <p className="mt-1 truncate text-lg font-bold tabular-nums">
                    {money(portfolio.totals.current)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Gain</p>

                  <p
                    className={`mt-1 truncate text-lg font-bold tabular-nums ${
                      portfolio.totals.gain >= 0
                        ? "text-emerald-300"
                        : "text-red-300"
                    }`}
                  >
                    {portfolio.totals.gain >= 0 ? "+" : "−"}
                    {money(Math.abs(portfolio.totals.gain))}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {portfolio.totals.holdings} holding
                {portfolio.totals.holdings === 1 ? "" : "s"} ·{" "}
                {money(portfolio.totals.invested)} invested ·{" "}
                {portfolio.totals.gainPercent >= 0 ? "+" : ""}
                {portfolio.totals.gainPercent.toFixed(1)}%
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* Cards need their due dates surfaced, not just their balances. */}
      {cards.length > 0 && (
        <Panel
          className="mt-6"
          title="Cards"
          action={<PanelLink to="/cards">Open</PanelLink>}
        >
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((card) => {
              const owed = Math.max(-Number(card.balance || 0), 0);

              return (
                <li
                  key={card._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FiCreditCard className="shrink-0 text-slate-400" />

                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {card.name}
                      </span>

                      <span className="block text-xs text-slate-500">
                        {card.card?.last4
                          ? `•••• ${card.card.last4}`
                          : card.card?.network || "Card"}
                      </span>
                    </span>
                  </span>

                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      owed > 0 ? "text-red-300" : "text-emerald-300"
                    }`}
                  >
                    {owed > 0 ? `${money(owed)} owed` : "Clear"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </DashboardLayout>
  );
}
