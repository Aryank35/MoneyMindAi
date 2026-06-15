import DashboardLayout from "../components/layout/DashboardLayout";
import { useEffect, useState } from "react";

import { getDashboardData } from "../services/dashboardService";
import { getUserId } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);

  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const userId = getUserId();

      if (!userId) {
        setLoading(false);
        return;
      }

      const data = await getDashboardData(userId);

      setDashboardData(data);
    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[70vh]">
          <h2 className="text-2xl font-semibold text-slate-400">
            Loading Dashboard...
          </h2>
        </div>
      </DashboardLayout>
    );
  }

  const totalBudget = dashboardData?.totalBudget || 0;

  const totalExpenses = dashboardData?.totalExpenses || 0;

  const remainingBudget = dashboardData?.remainingBudget || 0;

  const dailyLimit = dashboardData?.dailyLimit || 0;

  const weeklyLimit = dashboardData?.weeklyLimit || 0;

  const goal = dashboardData?.goal || {
    name: "Royal Enfield Hunter",
    savedAmount: 85000,
    targetAmount: 180000,
  };

  const goalPercentage = Math.round(
    (goal.savedAmount / goal.targetAmount) * 100,
  );

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

  const stats = [
    {
      title: "Income",
      value: totalIncome,
      icon: "💰",
      color: "text-green-400",
    },
    {
      title: "Expense",
      value: totalExpenses,
      icon: "📉",
      color: "text-red-400",
    },
    {
      title: "Budget",
      value: totalBudget,
      icon: "🎯",
      color: "text-cyan-400",
    },
    {
      title: "Savings",
      value: totalSaved,
      icon: "🏦",
      color: "text-yellow-400",
    },
  ];

  const totalInvestments = dashboardData?.totalInvestments || 0;

  const totalSavings = dashboardData?.totalSavings || 0;

  // const netWorth = totalAssets;

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
    {
      name: "Food",
      amount: 10000,
    },
    {
      name: "Investment",
      amount: 7000,
    },
    {
      name: "Needs",
      amount: 7000,
    },
    {
      name: "Travel",
      amount: 3500,
    },
    {
      name: "Entertainment",
      amount: 3500,
    },
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

  const todaySpent = (dashboardData?.expenses || [])
    .filter((expense) => expense.expenseDate?.split("T")[0] === today)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const dailyUsage =
    dailyLimit > 0 ? Math.round((todaySpent / dailyLimit) * 100) : 0;

  const currentDate = new Date();

  const firstDayOfWeek = new Date(currentDate);

  firstDayOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekSpent = (dashboardData?.expenses || [])
    .filter((expense) => new Date(expense.expenseDate) >= firstDayOfWeek)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const weeklyUsage =
    weeklyLimit > 0 ? Math.round((weekSpent / weeklyLimit) * 100) : 0;

  let financialScore = 100;

  if (budgetUsed > 100) financialScore -= 25;

  if (savingsRate < 20) financialScore -= 20;

  if (todaySpent > dailyLimit) financialScore -= 10;

  if (weekSpent > weeklyLimit) financialScore -= 10;

  if (totalAssets < totalIncome) financialScore -= 15;

  financialScore = Math.max(0, Math.min(100, financialScore));

  const healthMessage =
    totalIncome === 0 && totalExpenses === 0
      ? "Start tracking your finances"
      : financialScore >= 80
        ? "Excellent financial discipline"
        : financialScore >= 60
          ? "Good financial habits"
          : financialScore >= 40
            ? "Average financial health"
            : "Needs budget improvement";

  return (
    <DashboardLayout>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-cyan-600/20 p-8 backdrop-blur-xl mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.3),transparent_40%)]" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-6">
          <div>
            <h1 className="text-5xl font-bold mt-2">
              Hey {currentUser?.name?.split(" ")[0]} 👋
            </h1>

            <p className="text-slate-400 mt-3">Track. Plan. Grow.</p>
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
      </div>

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

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-slate-400 text-sm">Total Assets</p>

        <h3 className="text-3xl font-bold mt-2 text-emerald-400">
          ₹{totalAssets.toLocaleString()}
        </h3>
      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-5 mt-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Total Budget</p>

          <h3 className="text-3xl font-bold mt-2 text-green-400">
            ₹{totalBudget.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Today's Spending</p>

          <h3 className="text-3xl font-bold mt-2 text-orange-400">
            ₹{todaySpent.toLocaleString()}
          </h3>

          <p className="text-xs text-slate-400 mt-2">
            Limit ₹{dailyLimit.toLocaleString()}
          </p>

          <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
            <div
              className={`h-2 rounded-full ${
                dailyUsage > 100 ? "bg-red-500" : "bg-orange-500"
              }`}
              style={{
                width: `${Math.min(dailyUsage, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Weekly Spending</p>

          <h3 className="text-3xl font-bold mt-2 text-cyan-400">
            ₹{weekSpent.toLocaleString()}
          </h3>

          <p className="text-xs text-slate-400 mt-2">
            Limit ₹{weeklyLimit.toLocaleString()}
          </p>

          <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
            <div
              className={`h-2 rounded-full ${
                weeklyUsage > 100 ? "bg-red-500" : "bg-cyan-500"
              }`}
              style={{
                width: `${Math.min(weeklyUsage, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Monthly Income</p>

          <h3 className="text-3xl font-bold mt-2 text-cyan-400">
            ₹{totalIncome.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Monthly Expense</p>

          <h3 className="text-3xl font-bold mt-2 text-red-400">
            ₹{totalExpenses.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Savings Rate</p>

          <h3 className="text-3xl font-bold mt-2 text-yellow-400">
            {savingsRate}%
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Remaining Budget</p>

          <h3 className="text-3xl font-bold mt-2 text-purple-400">
            ₹{remainingBudget.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Net Worth</p>

          <h3 className="text-3xl font-bold mt-2 text-emerald-400">
            ₹{netWorth.toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-5">My Accounts</h3>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {accounts.map((account) => (
            <div
              key={account._id}
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
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-semibold mb-5">Savings Pots</h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between">
              <span>✈ Trip Fund</span>
              <span>₹3,000 / ₹50,000</span>
            </div>

            <div className="w-full h-2 bg-slate-700 rounded-full mt-2">
              <div
                className="h-2 bg-indigo-500 rounded-full"
                style={{ width: "6%" }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <span>🎉 Events Fund</span>
              <span>₹1,800 / ₹20,000</span>
            </div>

            <div className="w-full h-2 bg-slate-700 rounded-full mt-2">
              <div
                className="h-2 bg-purple-500 rounded-full"
                style={{ width: "9%" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-semibold mb-5">Monthly Allocation</h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Food</span>
            <span>₹10,000</span>
          </div>

          <div className="flex justify-between">
            <span>Investment</span>
            <span>₹7,000</span>
          </div>

          <div className="flex justify-between">
            <span>Needs</span>
            <span>₹7,000</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((card) => (
          <div
            key={card.title}
            className="
      bg-white/5
      backdrop-blur-xl
      border border-white/10
      rounded-3xl
      p-6
      hover:scale-105
      transition-all
    "
          >
            <div className="text-4xl">{card.icon}</div>

            <p className="mt-4 text-slate-400">{card.title}</p>

            <h3 className={`text-3xl font-bold mt-2 ${card.color}`}>
              ₹{card.value.toLocaleString()}
            </h3>
          </div>
        ))}
      </div>

      {/* Analytics Section */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-4">
            Monthly Spending Analysis
          </h3>

          <div className="h-72 flex flex-col items-center justify-center text-slate-500">
            <div className="text-6xl mb-4">📊</div>

            <p className="text-lg">Expense Analytics</p>

            <p className="text-sm mt-2">
              Total Expenses ₹{totalExpenses.toLocaleString()}
            </p>
          </div>
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

            <p className="text-slate-400">{goal.name}</p>

            <div className="w-full h-3 bg-slate-700 rounded-full mt-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{
                  width: `${goalPercentage}%`,
                }}
              />
            </div>

            <div className="flex justify-between mt-3 text-sm">
              <span className="text-indigo-400">₹85,000 Saved</span>

              <span className="text-slate-400">₹1,80,000 Goal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Widgets */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-5">Recent Transactions</h3>

          <div className="space-y-4">
            {dashboardData?.expenses?.length ? (
              dashboardData.expenses.slice(0, 5).map((expense) => (
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
              <p className="text-slate-400">No transactions found</p>
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-5">Investment Snapshot</h3>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Mutual Funds</span>
              <span>₹60,000</span>
            </div>

            <div className="flex justify-between">
              <span>Stocks</span>
              <span>₹40,000</span>
            </div>

            <div className="flex justify-between">
              <span>FD</span>
              <span>₹20,000</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6">
          <h3 className="text-xl font-semibold">🤖 AI Financial Coach</h3>

          <div className="space-y-3">
            <p>
              💡 You saved ₹{totalSaved.toLocaleString()}
              this month.
            </p>

            <p>📊 Your savings rate is {savingsRate}%.</p>

            <p>⚠ Food category accounts for most spending.</p>

            <p>
              🎯 You're
              {goalPercentage}% towards your goal.
            </p>
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
