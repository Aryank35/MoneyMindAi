import DashboardLayout from "../components/layout/DashboardLayout";
import { getExpensesByUser } from "../services/expenseService";

import { getBudgetByUser } from "../services/budgetService";

import { getUserId } from "../utils/auth";

import { useEffect, useState } from "react";

import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

export default function Analytics() {
  const [expenses, setExpenses] = useState([]);

  const [budget, setBudget] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);

  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());

  const loadData = async () => {
    try {
      const userId = getUserId();

      if (!userId) {
        setLoading(false);
        return;
      }

      const expenseRes = await getExpensesByUser(userId);

      const budgetRes = await getBudgetByUser(userId);

      setExpenses(expenseRes.data || []);

      setBudget(budgetRes.data?.[0] || null);
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

  const calendarCells = [
    ...Array(firstDay).fill(null),
    ...Array.from(
      {
        length: daysInMonth,
      },
      (_, i) => i + 1,
    ),
  ];

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

  const totalIncome = 0;

  const totalExpense = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const transactionCount = expenses.length;

  const pieData = Object.entries(categorySummary).map(([name, value]) => ({
    name,
    value,
  }));

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

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
              formatter={(value) => [`₹${value.toLocaleString()}`, spent]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-2xl p-5">
          <p className="text-slate-400">Budget</p>

          <h3 className="text-2xl font-bold">
            ₹{totalBudget.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 rounded-2xl p-5">
          <p className="text-slate-400">Spent</p>

          <h3 className="text-2xl font-bold text-red-400">
            ₹{totalSpent.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 rounded-2xl p-5">
          <p className="text-slate-400">Remaining</p>

          <h3 className="text-2xl font-bold text-green-400">
            ₹{remaining.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 rounded-2xl p-5">
          <p className="text-slate-400">Transactions</p>

          <h3 className="text-2xl font-bold">{transactionCount}</h3>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl p-6 mb-6">
        <h2 className="text-3xl font-bold">₹{remaining.toLocaleString()}</h2>

        <div className="grid grid-cols-3 mt-6">
          <div>
            <p>Income</p>
            <h4>₹{totalIncome}</h4>
          </div>

          <div>
            <p>Expense</p>
            <h4>₹{totalExpense}</h4>
          </div>

          <div>
            <p>Transactions</p>
            <h4>{transactionCount}</h4>
          </div>
        </div>
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

        <h2 className="text-2xl font-bold">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h2>

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
                className={`h-20 rounded-xl cursor-pointer p-2 border border-white/10 ${getCellColor(
                  amount,
                )}`}
              >
                <div className="font-semibold">{day}</div>

                <div className="text-xs mt-2">₹{amount}</div>
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
