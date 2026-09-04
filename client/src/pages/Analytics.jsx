import DashboardLayout from "../components/layout/DashboardLayout";
import { getExpensesByUser } from "../services/expenseService";

import { getBudgetByUser } from "../services/budgetService";

import { getUserId } from "../utils/auth";

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
import CategoryProgressBar from "../components/common/CategoryProgressBar";

export default function Analytics() {
  const [expenses, setExpenses] = useState([]);

  const [budget, setBudget] = useState(null);

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

        setBudget(budgetRes.data?.[0] || null);

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

  const categorySummary = {};
  expenses.forEach((expense) => {
    categorySummary[expense.category] =
      (categorySummary[expense.category] || 0) + expense.amount;
  });

  const categoryUtilization = (budget?.categories || []).map((category) => {
    const spent = expenses
      .filter(
        (expense) =>
          expense.category?.toLowerCase().trim() ===
          category.name?.toLowerCase().trim(),
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      name: category.name,
      limit: category.limit,
      spent,
    };
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
    const expenseDate = new Date(expense.expenseDate);

    const key =
      expenseDate.getFullYear() +
      "-" +
      String(expenseDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(expenseDate.getDate()).padStart(2, "0");

    expensesByDate[key] = (expensesByDate[key] || 0) + expense.amount;
  });

  const year = currentDate.getFullYear();

  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const sortedDays = Object.entries(expensesByDate).sort((a, b) => b[1] - a[1]);

  const highestDay = sortedDays[0] || [null, 0];

  const lowestDay = sortedDays.length
    ? [...sortedDays].sort((a, b) => a[1] - b[1])[0]
    : [null, 0];

  const firstDay = new Date(year, month, 1).getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = [];

  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  const COLORS = [
    "#6366F1", // Indigo
    "#06B6D4", // Cyan
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Violet
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#F97316", // Orange
    "#84CC16", // Lime
  ];

  const selectedExpenses = expenses.filter(
    (expense) =>
      new Date(expense.expenseDate).toISOString().split("T")[0] ===
      selectedDate,
  );

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const totalBudget = budget?.totalBudget || 0;

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

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

  const totalExpense = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

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

  const netWorth = totalIncome - totalExpense;

  const transactionCount = expenses.length;

  const pieData = Object.entries(categorySummary).map(([name, value]) => ({
    name,
    value,
  }));

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

  const insights = [
    topCategory ? `Highest spending category is ${topCategory[0]}` : null,

    totalExpense > (budget?.totalBudget || 0) * 0.8
      ? "You have used more than 80% of your budget."
      : "Budget utilization is healthy.",

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
        <h1 className="text-4xl font-bold">Analytics</h1>

        <p className="text-slate-400 mt-2">
          Deep dive into your spending patterns, income and financial habits
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
      >
        <h2 className="text-xl font-semibold mb-4">Category Distribution</h2>

        {pieData.length === 0 ? (
          <EmptyState
            icon={FiPieChart}
            title="No expense data yet"
            message="Add some expenses to see your category distribution."
          />
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="75%"
                paddingAngle={3}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`₹${value.toLocaleString()}`, name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Monthly Income",
            value: totalIncome,
            valueClassName: "",
          },
          {
            label: "Monthly Expense",
            value: totalSpent,
            valueClassName: "text-red-400",
          },
          {
            label: "Net Worth",
            value: netWorth,
            valueClassName: "text-green-400",
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

            <h3 className={`text-2xl font-bold ${card.valueClassName}`}>
              ₹{card.value.toLocaleString()}
            </h3>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="bg-white/5 rounded-2xl p-5"
        >
          <p className="text-slate-400">Savings Rate</p>

          <h3 className="text-2xl font-bold">{savingsRate.toFixed(2)}%</h3>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white/5 rounded-2xl p-6 mb-6"
      >
        <p className="text-slate-400">Remaining Budget</p>
        <h2 className="text-3xl font-bold mt-1">
          ₹{remaining.toLocaleString()}
        </h2>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Income</p>
            <h4 className="text-xl font-bold text-green-400 mt-1">
              ₹{totalIncome.toLocaleString()}
            </h4>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Expense</p>
            <h4 className="text-xl font-bold text-red-400 mt-1">
              ₹{totalExpense.toLocaleString()}
            </h4>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Transactions</p>
            <h4 className="text-xl font-bold mt-1">{transactionCount}</h4>
          </div>
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
          Based on your savings rate and spending habits.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6"
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
        <h3 className="text-xl font-semibold mb-5">Spending Calendar</h3>

        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center font-semibold text-slate-400">
              {day}
            </div>
          ))}

          {calendarCells.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-20" />;
            }

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
                key={day}
                role="button"
                tabIndex={0}
                aria-label={`${dayLabel}, ₹${amount.toLocaleString()} spent`}
                onClick={() => setSelectedDate(dateKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDate(dateKey);
                  }
                }}
                className={`
    relative
    h-24
    rounded-2xl
    cursor-pointer
    p-3
    border
    transition-all
    duration-200
    hover:scale-105
    hover:border-indigo-400
    ${selectedDate === dateKey ? "ring-2 ring-indigo-500" : "border-white/10"}
    ${getCellColor(amount)}
  `}
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-sm">{day}</span>

                  {amount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>

                <div className="absolute bottom-2 left-3">
                  {amount > 0 ? (
                    <p className="text-xs font-medium">
                      ₹{amount.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">No Spend</p>
                  )}
                </div>
              </div>
            );
          })}
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
          <p className="text-slate-400">Highest Spending Day</p>

          <h3 className="text-xl font-bold mt-2">
            {formatDate(highestDay[0])}
          </h3>

          <p className="text-red-400">₹{highestDay[1]}</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
          <p className="text-slate-400">Lowest Spending Day</p>

          <h3 className="text-xl font-bold mt-2">{formatDate(lowestDay[0])}</h3>

          <p className="text-green-400">₹{lowestDay[1]}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
        <h2 className="text-xl font-semibold mb-6">Budget Utilization</h2>

        {categoryUtilization.length === 0 ? (
          <EmptyState
            icon={FiPieChart}
            title="No budget categories found"
            message="Create a budget to track category utilization here."
          />
        ) : (
          categoryUtilization.map((category) => (
            <CategoryProgressBar
              key={category.name}
              name={category.name}
              spent={category.spent}
              limit={category.limit}
              className="mb-5"
            />
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
