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
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

export default function Analytics() {
  const [expenses, setExpenses] = useState([]);

  const [budget, setBudget] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);

  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());

  const [accounts, setAccounts] = useState([]);

  const [incomes, setIncomes] = useState([]);

  const loadData = async () => {
    try {
      const userId = getUserId();

      if (!userId) {
        setLoading(false);
        return;
      }

      const expenseRes = await getExpensesByUser(userId);

      const budgetRes = await getBudgetByUser(userId);

      const accountRes = await getAccountsByUser(userId);

      const incomeRes = await getIncomesByUser(userId);

      setExpenses(expenseRes.data || []);

      setBudget(budgetRes.data?.[0] || null);

      setAccounts(accountRes.data || []);

      setIncomes(incomeRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[70vh]">
          <h2 className="text-2xl font-semibold text-slate-400">
            Loading Analytics...
          </h2>
        </div>
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

    const percentage =
      category.limit > 0 ? Math.round((spent / category.limit) * 100) : 0;

    return {
      ...category,

      spent,

      percentage,

      remaining: category.limit - spent,

      isOverBudget: spent > category.limit,
    };
  });

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
  expenses.forEach((expense) => {
    const date = new Date(expense.expenseDate).toISOString().split("T")[0];

    expensesByDate[date] = (expensesByDate[date] || 0) + expense.amount;
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

  const monthlyExpenses = expenses.filter((expense) => {
    const date = new Date(expense.expenseDate);

    return date.getMonth() === month && date.getFullYear() === year;
  });

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

  const monthlyComparison = [
    {
      name: "Income",
      amount: totalIncome,
    },
    {
      name: "Expense",
      amount: totalExpense,
    },
  ];

  const budgetUsed =
    totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;
  const healthScore = Math.max(
    0,
    Math.min(100, savingsRate + (100 - budgetUsed)),
  );

  const transactionCount = expenses.length;

  const pieData = Object.entries(categorySummary).map(([name, value]) => ({
    name,
    value,
  }));

  const accountPieData = accounts.map((account) => ({
    name: account.name,
    value: account.balance,
  }));

  const filteredExpenses = expenses.filter((expense) => {
    const d = new Date(expense.expenseDate);

    return d.getMonth() === month && d.getFullYear() === year;
  });

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
  ];

  const topCategories = Object.entries(categorySummary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Category Distribution</h2>

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
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
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
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-2xl p-5">
          <p className="text-slate-400">Monthly Income</p>

          <h3 className="text-2xl font-bold">
            ₹{totalIncome.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 rounded-2xl p-5">
          <p className="text-slate-400">Monthly Expense</p>

          <h3 className="text-2xl font-bold text-red-400">
            ₹{totalSpent.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 rounded-2xl p-5">
          <p className="text-slate-400">Net Worth</p>

          <h3 className="text-2xl font-bold text-green-400">
            ₹{netWorth.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 rounded-2xl p-5">
          <p className="text-slate-400">Savings Rate</p>

          <h3 className="text-2xl font-bold">{savingsRate.toFixed(2)}%</h3>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl p-6 mb-6">
        <h2 className="text-3xl font-bold">₹{remaining.toLocaleString()}</h2>

        <div className="grid grid-cols-3 mt-6">
          <div>
            <p>Income</p>
            <h4>₹{totalIncome.toLocaleString()}</h4>
          </div>

          <div>
            <p>Expense</p>
            <h4>₹{totalExpense.toLocaleString()}</h4>
          </div>

          <div>
            <p>Transactions</p>
            <h4>{transactionCount}</h4>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Accounts Overview</h2>
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
              className="
  relative overflow-hidden
  bg-gradient-to-br
  from-indigo-500/20
  to-purple-500/20
  backdrop-blur-xl
  border border-white/10
  rounded-3xl
  p-5
"
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
      </div>

      <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">AI Insights</h2>

        {insights.map((insight, index) => (
          <p key={index} className="mb-2">
            • {insight}
          </p>
        ))}
      </div>

      <div className="bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-2xl p-6 mt-6">
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
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevMonth}
            className="px-4 py-2 bg-slate-800 rounded-xl"
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
            className="px-4 py-2 bg-slate-800 rounded-xl"
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

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(dateKey)}
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
      </div>

      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-slate-900 rounded-2xl p-6 w-[500px]">
            <h3 className="text-xl font-bold mb-4">{selectedDate}</h3>

            {selectedExpenses.length === 0 ? (
              <p className="text-slate-400">No expenses on this day</p>
            ) : (
              selectedExpenses.map((expense) => (
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
              ))
            )}

            <button
              onClick={() => setSelectedDate(null)}
              className="mt-4 px-4 py-2 bg-indigo-600 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

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
          <p className="text-slate-400">No budget categories found</p>
        ) : (
          categoryUtilization.map((category) => (
            <div key={category.name} className="mb-5">
              <div className="flex justify-between mb-2">
                <span>{category.name}</span>

                <span>
                  ₹{category.spent}
                  {" / "}₹{category.limit}
                </span>
              </div>

              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    category.isOverBudget ? "bg-red-500" : "bg-indigo-500"
                  }`}
                  style={{
                    width: `${Math.min(category.percentage, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
