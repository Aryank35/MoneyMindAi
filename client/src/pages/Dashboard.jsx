import DashboardLayout from "../components/layout/DashboardLayout";
import { useEffect, useState } from "react";

import { getDashboardData } from "../services/dashboardService";
import { USER_ID } from "../constants/user";

export default function Dashboard() {
  const [dashboardData, setDashboardData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data =
        await getDashboardData(
          USER_ID
        );

      setDashboardData(data);
    } catch (error) {
      console.error(
        "Dashboard Error:",
        error
      );
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

  const totalBudget =
    dashboardData?.totalBudget || 0;

  const totalExpenses =
    dashboardData?.totalExpenses || 0;

  const remainingBudget =
    dashboardData?.remainingBudget || 0;

  const savingsRate =
    totalBudget > 0
      ? Math.round(
        (remainingBudget /
          totalBudget) *
        100
      )
      : 0;

  const budgetUsed =
    totalBudget > 0
      ? Math.round(
        (totalExpenses /
          totalBudget) *
        100
      )
      : 0;

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

  return (
    <DashboardLayout>

      {/* Welcome Section */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <p className="text-slate-400">
            {getGreeting()}
          </p>

          <h2 className="text-4xl font-bold">
            Welcome Back, Aryan
          </h2>

          <p className="text-slate-500 mt-2">
            Here's your financial summary for this month
          </p>
        </div>

        <div className="flex flex-wrap gap-3">

          <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">
            + Expense
          </button>

          <button className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 transition">
            + Income
          </button>

          <button className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 transition">
            + Goal
          </button>

          <button className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition">
            + Investment
          </button>

        </div>

      </div>

      {/* Financial Health */}

      <div className="mt-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">

        <div className="flex justify-between items-center">

          <div>
            <h3 className="text-xl font-semibold">
              Financial Health Score
            </h3>

            <p className="text-slate-400 mt-2">
              Excellent financial discipline
            </p>
          </div>

          <div className="text-right">
            <h2 className="text-5xl font-bold text-green-400">
              {savingsRate}
            </h2>

            <p className="text-slate-400">
              out of 100
            </p>
          </div>

        </div>

      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-5 mt-8">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-slate-400 text-sm">
            Total Budget
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-400">
            ₹{totalBudget.toLocaleString()}
          </h3>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-slate-400 text-sm">
            Monthly Income
          </p>

          <h3 className="text-3xl font-bold mt-2 text-cyan-400">
            ₹50,000
          </h3>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-slate-400 text-sm">
            Monthly Expense
          </p>

          <h3 className="text-3xl font-bold mt-2 text-red-400">
            ₹{totalExpenses.toLocaleString()}
          </h3>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-slate-400 text-sm">
            Savings Rate
          </p>

          <h3 className="text-3xl font-bold mt-2 text-yellow-400">
            {savingsRate}%
          </h3>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-slate-400 text-sm">
            Remaining Budget
          </p>

          <h3 className="text-3xl font-bold mt-2 text-purple-400">
            ₹{remainingBudget.toLocaleString()}
          </h3>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-slate-400 text-sm">
            Net Worth
          </p>

          <h3 className="text-3xl font-bold mt-2 text-emerald-400">
            ₹{remainingBudget.toLocaleString()}
          </h3>

        </div>

      </div>

      {/* Analytics Section */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">

        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">

          <h3 className="text-xl font-semibold mb-4">
            Monthly Spending Analysis
          </h3>

          <div className="h-72 flex flex-col items-center justify-center text-slate-500">

            <div className="text-6xl mb-4">
              📊
            </div>

            <p className="text-lg">
              Expense Analytics
            </p>

            <p className="text-sm mt-2">
              Total Expenses ₹{totalExpenses.toLocaleString()}
            </p>

          </div>

        </div>

        <div className="space-y-5">

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

            <h3 className="text-xl font-semibold mb-4">
              Budget Progress
            </h3>

            <div className="flex justify-between mb-3">

              <span>
                Used
              </span>

              <span>
                {budgetUsed}%
              </span>

            </div>

            <div className="w-full bg-slate-700 rounded-full h-3">

              <div
                className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{
                  width: `${budgetUsed}%`,
                }}
              />

            </div>

            <p className="text-sm text-slate-400 mt-3">
              ₹{totalExpenses.toLocaleString()}
              {" "}spent out of{" "}
              ₹{totalBudget.toLocaleString()}
            </p>

          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

            <h3 className="text-xl font-semibold mb-4">
              Goal Progress
            </h3>

            <p className="text-slate-400">
              Royal Enfield Hunter 350
            </p>

            <div className="w-full h-3 bg-slate-700 rounded-full mt-3">

              <div className="w-[47%] h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />

            </div>

            <div className="flex justify-between mt-3 text-sm">

              <span className="text-indigo-400">
                ₹85,000 Saved
              </span>

              <span className="text-slate-400">
                ₹1,80,000 Goal
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* Bottom Widgets */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

          <h3 className="text-xl font-semibold mb-5">
            Recent Transactions
          </h3>

          <div className="space-y-4">

            {dashboardData?.expenses?.length ? (
              dashboardData.expenses
                .slice(0, 5)
                .map((expense) => (
                  <div
                    key={expense._id}
                    className="flex justify-between"
                  >
                    <span>
                      {expense.note ||
                        expense.category}
                    </span>

                    <span className="text-red-400">
                      -₹{expense.amount}
                    </span>
                  </div>
                ))
            ) : (
              <p className="text-slate-400">
                No transactions found
              </p>
            )}

          </div>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

          <h3 className="text-xl font-semibold mb-5">
            Investment Snapshot
          </h3>

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

          <h3 className="text-xl font-semibold">
            🤖 AI Financial Coach
          </h3>

          <p className="text-slate-300 mt-4">
            You have spent ₹
            {totalExpenses.toLocaleString()}
            {" "}this month. Your remaining
            budget is ₹
            {remainingBudget.toLocaleString()}.
          </p>

          <p className="text-green-400 mt-4 font-medium">
            Savings Rate: {savingsRate}%
          </p>

        </div>

      </div>

    </DashboardLayout>
  );
}