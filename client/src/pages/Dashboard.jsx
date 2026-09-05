import DashboardLayout from "../components/layout/DashboardLayout";
import { useEffect, useState } from "react";
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
  FiTarget,
  FiBriefcase,
  FiBarChart2,
  FiInbox,
} from "react-icons/fi";

import { Skeleton } from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import { getDashboardData } from "../services/dashboardService";
import { getUserId } from "../utils/auth";
import {
  CHART_ACCENT,
  CHART_AXIS,
  TOOLTIP_STYLE,
} from "../utils/chartTheme";
import {
  computeFinancialHealth,
  getHealthLabel,
  getHealthTone,
} from "../utils/financialHealth";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);

  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const userId = getUserId();

        if (!userId) {
          if (!cancelled) setLoading(false);
          return;
        }

        const data = await getDashboardData(userId);

        if (!cancelled) setDashboardData(data);
      } catch (error) {
        console.error("Dashboard Error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-56 rounded-3xl" />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">
          <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  const totalBudget = dashboardData?.totalBudget || 0;

  const totalExpenses = dashboardData?.totalExpenses || 0;

  const remainingBudget = dashboardData?.remainingBudget || 0;

  const dailyLimit = dashboardData?.dailyLimit || 0;

  const weeklyLimit = dashboardData?.weeklyLimit || 0;

  const rawGoal = dashboardData?.goal;

  const hasGoal = Boolean(rawGoal && rawGoal.targetAmount);

  const goalPercentage = hasGoal
    ? Math.min(100, Math.round((rawGoal.savedAmount / rawGoal.targetAmount) * 100))
    : 0;

  const incomes = dashboardData?.incomes || [];

  const totalIncome = incomes.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const expenses = dashboardData?.expenses || [];

  const totalSpent = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const totalSaved = totalIncome - totalSpent;

  const accounts = dashboardData?.accounts || [];

  const totalAssets = dashboardData?.totalAssets || 0;

  const netWorth = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0,
  );

  const savingsPots = [
    {
      name: "Trip Fund",
      current: 3000,
      target: 50000,
      color: "bg-indigo-500",
      icon: "✈️",
    },
    {
      name: "Events Fund",
      current: 1800,
      target: 20000,
      color: "bg-purple-500",
      icon: "🎉",
    },
    {
      name: "LIC Fund",
      current: 1200,
      target: 6000,
      color: "bg-emerald-500",
      icon: "🛡️",
    },
  ];

  const allocations = [
    { name: "Food", amount: 10000 },
    { name: "Investment", amount: 7000 },
    { name: "Needs", amount: 7000 },
    { name: "Travel", amount: 3500 },
    { name: "Entertainment", amount: 3500 },
  ];

  const savingsRate = dashboardData?.savingsRate || 0;

  const budgetUsed =
    totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good Morning 🌅";
    }

    if (hour < 17) {
      return "Good Afternoon ☀️";
    }

    if (hour < 21) {
      return "Good Evening 🌇";
    }

    return "Good Night 🌙";
  };

  const today = new Date().toISOString().split("T")[0];

  const todaySpent = expenses
    .filter((expense) => expense.expenseDate?.split("T")[0] === today)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const dailyUsage =
    dailyLimit > 0 ? Math.round((todaySpent / dailyLimit) * 100) : 0;

  const currentDate = new Date();

  const firstDayOfWeek = new Date(currentDate);

  firstDayOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekSpent = expenses
    .filter((expense) => new Date(expense.expenseDate) >= firstDayOfWeek)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const weeklyUsage =
    weeklyLimit > 0 ? Math.round((weekSpent / weeklyLimit) * 100) : 0;

  const health = computeFinancialHealth(dashboardData);
  const healthLabel = getHealthLabel(health.score, health.hasData);
  const healthTone = getHealthTone(health.score, health.hasData);

  // Real top-spending category, derived from this page's already-fetched
  // expenses — replaces the old unconditional "Food category..." mock line.
  const categoryTotals = expenses.reduce((acc, expense) => {
    const key = expense.category || "Other";
    acc[key] = (acc[key] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});

  const topCategoryEntry = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1],
  )[0];

  // Real monthly spending trend, built from expenses already fetched for
  // this page (no new API call) — replaces the static emoji placeholder.
  const monthlySpendChartData = (() => {
    const now = new Date();

    const dailyTotals = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.expenseDate);

      if (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      ) {
        const day = date.getDate();
        dailyTotals[day] = (dailyTotals[day] || 0) + Number(expense.amount || 0);
      }
    });

    return Object.keys(dailyTotals)
      .map(Number)
      .sort((a, b) => a - b)
      .map((day) => ({ day: String(day), amount: dailyTotals[day] }));
  })();

  const statCards = [
    {
      key: "budget",
      title: "Total Budget",
      icon: "🎯",
      value: totalBudget,
      valueColor: "text-emerald-400",
    },
    {
      key: "today",
      title: "Today's Spending",
      icon: "📅",
      value: todaySpent,
      valueColor: "text-orange-400",
      subLabel: `Limit ₹${dailyLimit.toLocaleString()}`,
      progress: dailyUsage,
      progressColor: dailyUsage > 100 ? "bg-red-500" : "bg-orange-500",
    },
    {
      key: "week",
      title: "Weekly Spending",
      icon: "🗓️",
      value: weekSpent,
      valueColor: "text-cyan-400",
      subLabel: `Limit ₹${weeklyLimit.toLocaleString()}`,
      progress: weeklyUsage,
      progressColor: weeklyUsage > 100 ? "bg-red-500" : "bg-cyan-500",
    },
    {
      key: "income",
      title: "Monthly Income",
      icon: "💰",
      value: totalIncome,
      valueColor: "text-green-400",
    },
    {
      key: "expense",
      title: "Monthly Expense",
      icon: "📉",
      value: totalExpenses,
      valueColor: "text-red-400",
    },
    {
      key: "savingsRate",
      title: "Savings Rate",
      icon: "📈",
      value: `${savingsRate}%`,
      valueColor: "text-yellow-400",
      isText: true,
    },
    {
      key: "remaining",
      title: "Remaining Budget",
      icon: "💼",
      value: remainingBudget,
      valueColor: "text-purple-400",
    },
    {
      key: "networth",
      title: "Net Worth",
      icon: "🏦",
      value: netWorth,
      valueColor: "text-emerald-400",
    },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-8"
      >
        {/* Arbitrary values bypass the theme, so this one carries the gold
            accent literally. Kept faint - it is a wash, not a fill. */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(207,175,102,0.10),transparent_55%)]" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-6">
          <div>
            <p className="text-slate-400">{getGreeting()}</p>

            <h1 className="mt-2 text-5xl">
              Hey {currentUser?.name?.split(" ")[0]} 👋
            </h1>

            <p className="text-slate-400 mt-3">Track. Plan. Grow.</p>

            <div
              className={`inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-xl border text-sm ${healthTone.bg} ${healthTone.border} ${healthTone.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${healthTone.dot}`} />
              Financial Health: {healthLabel}
              {health.hasData && ` · ${health.score}/100`}
            </div>
          </div>

          <div className="text-right">
            <p className="text-slate-400">Net Worth</p>

            <h2 className="text-5xl font-bold text-emerald-400">
              ₹{netWorth.toLocaleString()}
            </h2>

            <p className="text-sm text-slate-400 mt-2">
              Savings Rate {savingsRate}%
            </p>
          </div>
        </div>
      </motion.div>

      {dailyUsage > 100 && (
        <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
          <h3 className="text-red-400 font-semibold">
            ⚠ Daily Budget Exceeded
          </h3>

          <p className="text-slate-300 mt-2">
            You have spent ₹{todaySpent.toLocaleString() + " "}
            today against your limit of ₹{dailyLimit.toLocaleString()}.
          </p>
        </div>
      )}

      {weeklyUsage > 100 && (
        <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 mb-6">
          <h3 className="text-orange-400 font-semibold">
            ⚠ Weekly Budget Exceeded
          </h3>

          <p className="text-slate-300 mt-2">
            You have spent ₹{weekSpent.toLocaleString() + " "}
            this week against your limit of ₹{weeklyLimit.toLocaleString()}.
          </p>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
        <p className="text-slate-400 text-sm">Total Assets</p>

        <h3 className="text-3xl font-bold mt-2 text-emerald-400">
          ₹{totalAssets.toLocaleString()}
        </h3>
      </div>

      {/* Summary Cards */}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-8"
      >
        {statCards.map((card) => (
          <motion.div
            key={card.key}
            variants={itemVariants}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">{card.title}</p>
              <span className="text-xl" aria-hidden="true">
                {card.icon}
              </span>
            </div>

            <h3 className={`text-3xl font-bold mt-2 ${card.valueColor}`}>
              {card.isText ? card.value : `₹${Number(card.value).toLocaleString()}`}
            </h3>

            {card.subLabel && (
              <p className="text-xs text-slate-400 mt-2">{card.subLabel}</p>
            )}

            {card.progress !== undefined && (
              <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full ${card.progressColor}`}
                  style={{ width: `${Math.min(card.progress, 100)}%` }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-5">My Accounts</h3>

        {accounts.length ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid md:grid-cols-2 xl:grid-cols-4 gap-5"
          >
            {accounts.map((account) => (
              <motion.div
                key={account._id}
                variants={itemVariants}
                className="
        relative
        overflow-hidden
        rounded-3xl
        bg-gradient-to-br
        from-indigo-600
        to-purple-700
        p-6
        shadow-xl
        hover:scale-105
        transition-all
      "
              >
                <div className="absolute top-4 right-4 opacity-20 text-6xl">
                  💳
                </div>

                <div className="text-4xl">{account.icon || "🏦"}</div>

                <h3 className="mt-6 text-xl font-bold">{account.name}</h3>

                <p className="text-indigo-100">{account.type}</p>

                <div className="mt-8">
                  <p className="text-indigo-100 text-sm">Available Balance</p>

                  <h2 className="text-3xl font-bold">
                    ₹{Number(account.balance || 0).toLocaleString()}
                  </h2>
                </div>

                <p className="mt-6 text-xs opacity-70">**** **** **** 2458</p>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <EmptyState
            icon={FiBriefcase}
            title="No accounts yet"
            message="Add an account to start tracking balances here."
          />
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 mt-8">
        <h3 className="text-xl font-semibold mb-5">Savings Pots</h3>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {savingsPots.map((pot) => {
            const percent =
              pot.target > 0
                ? Math.min(Math.round((pot.current / pot.target) * 100), 100)
                : 0;

            return (
              <motion.div key={pot.name} variants={itemVariants}>
                <div className="flex justify-between">
                  <span>
                    {pot.icon} {pot.name}
                  </span>
                  <span>
                    ₹{pot.current.toLocaleString()} / ₹
                    {pot.target.toLocaleString()}
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-700 rounded-full mt-2">
                  <div
                    className={`h-2 ${pot.color} rounded-full`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-semibold mb-5">Monthly Allocation</h3>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {allocations.map((item) => (
            <motion.div
              key={item.name}
              variants={itemVariants}
              className="flex justify-between"
            >
              <span>{item.name}</span>
              <span>₹{item.amount.toLocaleString()}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Analytics Section */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-4">
            Monthly Spending Analysis
          </h3>

          {monthlySpendChartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlySpendChartData}>
                <defs>
                  <linearGradient
                    id="dashboardSpendGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0.4} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

                <XAxis
                  dataKey="day"
                  stroke={CHART_AXIS}
                  fontSize={12}
                  tickLine={false}
                />

                <YAxis stroke={CHART_AXIS} fontSize={12} tickLine={false} />

                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [
                    `₹${Number(value).toLocaleString()}`,
                    "Spent",
                  ]}
                  labelFormatter={(label) => `Day ${label}`}
                />

                <Bar
                  dataKey="amount"
                  fill="url(#dashboardSpendGradient)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={FiBarChart2}
              title="No spending data yet"
              message="Add expenses this month to see your spending trend here."
              className="h-72 justify-center border-none bg-transparent"
            />
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">Budget Progress</h3>

            <div className="flex justify-between mb-3">
              <span>Used</span>

              <span>{budgetUsed}%</span>
            </div>

            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{
                  width: `${Math.min(budgetUsed, 100)}%`,
                }}
              />
            </div>

            <p className="text-sm text-slate-400 mt-3">
              ₹{totalExpenses.toLocaleString()} spent out of ₹
              {totalBudget.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">Goal Progress</h3>

            {hasGoal ? (
              <>
                <p className="text-slate-400">{rawGoal.name}</p>

                <div className="w-full h-3 bg-slate-700 rounded-full mt-3">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{
                      width: `${goalPercentage}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-indigo-400">
                    ₹{Number(rawGoal.savedAmount).toLocaleString()} Saved
                  </span>

                  <span className="text-slate-400">
                    ₹{Number(rawGoal.targetAmount).toLocaleString()} Goal
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                icon={FiTarget}
                title="No goal set"
                message="Coming soon — set a savings goal to track progress here."
                className="py-6 border-none bg-transparent"
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Widgets */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
          <h3 className="text-xl font-semibold mb-5">Recent Transactions</h3>

          <div className="space-y-4">
            {expenses.length ? (
              expenses
                .slice(0, 5)
                .map((expense) => (
                  <div key={expense._id} className="flex justify-between">
                    <div>
                      <p>{expense.category}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </p>
                    </div>

                    <span className="text-red-400">-₹{expense.amount}</span>
                  </div>
                ))
            ) : (
              <EmptyState
                icon={FiInbox}
                title="No transactions yet"
                message="Your recent transactions will show up here."
                className="py-6 border-none bg-transparent"
              />
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
          <h3 className="text-xl font-semibold mb-5">Investment Snapshot</h3>

          <EmptyState
            icon={FiBriefcase}
            title="Coming soon"
            message="Investment tracking isn't connected yet — this section will show your real portfolio once it is."
            className="py-6 border-none bg-transparent"
          />
        </div>

        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6">
          <h3 className="text-xl font-semibold">🤖 AI Financial Coach</h3>

          <div className="space-y-3 mt-3">
            <p>
              💡 You saved ₹{totalSaved.toLocaleString()}
              this month.
            </p>

            <p>📊 Your savings rate is {savingsRate}%.</p>

            {topCategoryEntry ? (
              <p>
                ⚠ {topCategoryEntry[0]} accounts for most of your spending (₹
                {topCategoryEntry[1].toLocaleString()}).
              </p>
            ) : (
              <p>⚠ Add some expenses to see your top spending category.</p>
            )}

            {hasGoal && (
              <p>
                🎯 You're
                {goalPercentage}% towards your goal.
              </p>
            )}
          </div>

          <div className="mt-4 text-sm space-y-2">
            <p>📅 Today Spent: ₹{todaySpent.toLocaleString()}</p>

            <p>📊 This Week: ₹{weekSpent.toLocaleString()}</p>

            <p>💰 Remaining: ₹{remainingBudget.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
