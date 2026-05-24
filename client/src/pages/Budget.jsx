import DashboardLayout from "../components/layout/DashboardLayout";
import {
  FiPlus,
  FiTarget,
  FiTrendingUp,
  FiAlertTriangle,
} from "react-icons/fi";

import { useEffect, useState } from "react";

import { USER_ID } from "../constants/user";

import {
  getBudgetByUser,
} from "../services/budgetService";

import {
  getExpensesByUser,
} from "../services/expenseService";

export default function Budget() {
  const [budget, setBudget] =
    useState(null);

  const [expenses, setExpenses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const budgetResponse =
        await getBudgetByUser(
          USER_ID
        );

      const expenseResponse =
        await getExpensesByUser(
          USER_ID
        );

      setBudget(
        budgetResponse.data?.[0]
      );

      setExpenses(
        expenseResponse.data || []
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[70vh]">
          <h2 className="text-2xl text-slate-400">
            Loading Budget...
          </h2>
        </div>
      </DashboardLayout>
    );
  }

  const totalBudget =
    budget?.totalBudget || 0;

  const totalSpent =
    expenses.reduce(
      (sum, expense) =>
        sum + expense.amount,
      0
    );

  const remaining =
    totalBudget - totalSpent;

  const utilization =
    totalBudget > 0
      ? Math.round(
          (totalSpent /
            totalBudget) *
            100
        )
      : 0;

  const categories = [
    {
      category: "Food",
      budget:
        budget?.foodBudget || 0,
    },
    {
      category: "Travel",
      budget:
        budget?.travelBudget || 0,
    },
    {
      category: "Shopping",
      budget:
        budget?.shoppingBudget ||
        0,
    },
    {
      category: "Bills",
      budget:
        budget?.billsBudget || 0,
    },
  ];

  const categoryData =
    categories.map((item) => {
      const spent =
        expenses
          .filter(
            (expense) =>
              expense.category?.toLowerCase() ===
              item.category.toLowerCase()
          )
          .reduce(
            (sum, expense) =>
              sum + expense.amount,
            0
          );

      return {
        ...item,
        spent,
      };
    });

  return (
    <DashboardLayout>

      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

        <div>

          <h1 className="text-4xl font-bold">
            Budget Planner
          </h1>

          <p className="text-slate-400 mt-2">
            Plan, track and optimize your monthly budget
          </p>

        </div>

        <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">

          <FiPlus />

          Update Budget

        </button>

      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-slate-400">
            Monthly Budget
          </p>

          <h3 className="text-3xl font-bold mt-2">
            ₹{totalBudget.toLocaleString()}
          </h3>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-slate-400">
            Total Spent
          </p>

          <h3 className="text-3xl font-bold text-red-400 mt-2">
            ₹{totalSpent.toLocaleString()}
          </h3>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-slate-400">
            Remaining
          </p>

          <h3 className="text-3xl font-bold text-green-400 mt-2">
            ₹{remaining.toLocaleString()}
          </h3>

        </div>

      </div>

      {/* Budget Health */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">

        <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">

          <div className="flex items-center gap-3 mb-5">

            <FiTrendingUp
              className="text-indigo-400"
              size={22}
            />

            <h3 className="text-xl font-semibold">
              Budget Health
            </h3>

          </div>

          <div className="flex justify-between mb-3">

            <span>
              Budget Utilization
            </span>

            <span className="font-semibold">
              {utilization}%
            </span>

          </div>

          <div className="w-full bg-slate-700 rounded-full h-4">

            <div
              className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
              style={{
                width: `${utilization}%`,
              }}
            />

          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">

            <div className="bg-white/5 rounded-xl p-4">

              <p className="text-slate-400 text-sm">
                Total Budget
              </p>

              <h4 className="text-xl font-bold mt-2">
                ₹{totalBudget.toLocaleString()}
              </h4>

            </div>

            <div className="bg-white/5 rounded-xl p-4">

              <p className="text-slate-400 text-sm">
                Total Spent
              </p>

              <h4 className="text-xl font-bold mt-2">
                ₹{totalSpent.toLocaleString()}
              </h4>

            </div>

            <div className="bg-white/5 rounded-xl p-4">

              <p className="text-slate-400 text-sm">
                Remaining
              </p>

              <h4 className="text-xl font-bold mt-2 text-green-400">
                ₹{remaining.toLocaleString()}
              </h4>

            </div>

          </div>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

          <h3 className="text-xl font-semibold mb-5">
            Budget Status
          </h3>

          <div className="space-y-4">

            {categoryData.map(
              (item) => (
                <div
                  key={
                    item.category
                  }
                  className="flex justify-between"
                >
                  <span>
                    {
                      item.category
                    }
                  </span>

                  <span className="text-cyan-400">
                    ₹
                    {item.spent.toLocaleString()}
                  </span>
                </div>
              )
            )}

          </div>

        </div>

      </div>

      {/* Category Budgets */}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

        <div className="flex items-center gap-3 mb-6">

          <FiTarget
            className="text-cyan-400"
            size={22}
          />

          <h3 className="text-xl font-semibold">
            Category Budgets
          </h3>

        </div>

        <div className="space-y-6">

          {categoryData.map(
            (item) => {
              const percentage =
                item.budget > 0
                  ? Math.round(
                      (item.spent /
                        item.budget) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={
                    item.category
                  }
                >
                  <div className="flex justify-between mb-2">

                    <span className="font-medium">
                      {
                        item.category
                      }
                    </span>

                    <span className="text-slate-400">
                      ₹
                      {item.spent.toLocaleString()}
                      {" / "}
                      ₹
                      {item.budget.toLocaleString()}
                    </span>

                  </div>

                  <div className="w-full bg-slate-700 rounded-full h-3">

                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />

                  </div>

                  <div className="flex justify-between mt-2 text-sm">

                    <span className="text-slate-400">
                      {percentage}% used
                    </span>

                    <span className="text-green-400">
                      ₹
                      {(
                        item.budget -
                        item.spent
                      ).toLocaleString()}
                      {" "}left
                    </span>

                  </div>

                </div>
              );
            }
          )}

        </div>

      </div>

      {/* AI Insight */}

      <div className="mt-8 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6">

        <div className="flex items-center gap-3">

          <FiAlertTriangle
            className="text-yellow-400"
            size={22}
          />

          <h3 className="text-xl font-semibold">
            AI Budget Suggestion
          </h3>

        </div>

        <p className="text-slate-300 mt-4">

          You have spent
          {" "}
          ₹{totalSpent.toLocaleString()}
          {" "}
          from your
          {" "}
          ₹{totalBudget.toLocaleString()}
          {" "}
          budget.

        </p>

        <p className="text-green-400 mt-4 font-medium">

          Remaining Budget:
          {" "}
          ₹{remaining.toLocaleString()}

        </p>

      </div>

    </DashboardLayout>
  );
}