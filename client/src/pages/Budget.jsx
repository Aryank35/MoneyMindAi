import DashboardLayout from "../components/layout/DashboardLayout";
import {
  FiPlus,
  FiTarget,
  FiTrendingUp,
  FiAlertTriangle,
} from "react-icons/fi";

import {
  getBudgetByUser,
  createBudget,
  updateBudget,
} from "../services/budgetService";

import { getAccountsByUser } from "../services/accountService";
import { useEffect, useState } from "react";
import { getExpensesByUser } from "../services/expenseService";
import { getUserId } from "../utils/auth";

export default function Budget() {
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [budgetForm, setBudgetForm] = useState({
    month: "May 2026",
    totalBudget: "",
    categories: [
      {
        name: "",
        limit: "",
        accountId: "",
        type: "Expense",
      },
    ],
  });

  // =========================
  // CATEGORY HANDLERS
  // =========================

  const handleAddCategory = () => {
    setBudgetForm((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        {
          name: "",
          limit: "",
          accountId: "",
          type: "Expense",
        },
      ],
    }));
  };

  const handleRemoveCategory = (index) => {
    setBudgetForm((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const handleCategoryChange = (index, field, value) => {
    setBudgetForm((prev) => {
      const updatedCategories = [...prev.categories];

      updatedCategories[index] = {
        ...updatedCategories[index],
        [field]: value,
      };

      return {
        ...prev,
        categories: updatedCategories,
      };
    });
  };

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = getUserId();

      if (!userId) {
        setLoading(false);
        return;
      }

      const [budgetResponse, expenseResponse, accountResponse] =
        await Promise.all([
          getBudgetByUser(userId),
          getExpensesByUser(userId),
          getAccountsByUser(userId),
        ]);

      setAccounts(accountResponse?.data || []);
      setExpenses(expenseResponse?.data || []);

      const currentBudget = budgetResponse?.data?.[0] || null;

      setBudget(currentBudget);

      if (currentBudget) {
        setBudgetForm({
          month: currentBudget.month || "May 2026",
          totalBudget: currentBudget.totalBudget || "",
          categories:
            currentBudget.categories?.length > 0
              ? currentBudget.categories.map((item) => ({
                  name: item.name || "",
                  limit: item.limit || "",
                  accountId: item.accountId || "",
                  type: item.type || "Expense",
                }))
              : [
                  {
                    name: "",
                    limit: "",
                    accountId: "",
                    type: "Expense",
                  },
                ],
        });
      }
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SAVE / CREATE / UPDATE
  // =========================

  const handleSaveBudget = async () => {
    // Prevent double click
    if (saving) return;

    try {
      // -------------------------
      // USER VALIDATION
      // -------------------------

      const userId = getUserId();

      if (!userId) {
        alert("Unable to identify the logged-in user. Please login again.");
        return;
      }

      // -------------------------
      // TOTAL BUDGET VALIDATION
      // -------------------------

      const totalBudgetValue = Number(budgetForm.totalBudget);

      if (!Number.isFinite(totalBudgetValue) || totalBudgetValue <= 0) {
        alert("Please enter a valid total budget greater than 0.");
        return;
      }

      // -------------------------
      // CLEAN CATEGORIES
      // -------------------------

      const cleanedCategories = budgetForm.categories
        .filter((item) => item?.name?.trim() && Number(item.limit) > 0)
        .map((item) => ({
          name: item.name.trim(),
          limit: Number(item.limit),
          accountId: item.accountId,
          type: item.type || "Expense",
        }));

      // -------------------------
      // CATEGORY VALIDATION
      // -------------------------

      if (cleanedCategories.length === 0) {
        alert("Please add at least one category with a valid budget.");
        return;
      }

      // -------------------------
      // ACCOUNT VALIDATION
      // -------------------------

      const invalidAccount = cleanedCategories.some((item) => !item.accountId);

      if (invalidAccount) {
        alert("Every category must have an account assigned.");
        return;
      }

      // -------------------------
      // CATEGORY TOTAL
      // -------------------------

      const totalCategoryLimit = cleanedCategories.reduce(
        (sum, item) => sum + Number(item.limit || 0),
        0,
      );

      if (totalCategoryLimit > totalBudgetValue) {
        alert("Category budgets exceed the total budget.");
        return;
      }

      // -------------------------
      // DAYS IN SELECTED MONTH
      // -------------------------

      const monthDate = new Date(`${budgetForm.month || "May 2026"} 1`);

      let daysInMonth;

      if (Number.isNaN(monthDate.getTime())) {
        daysInMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        ).getDate();
      } else {
        daysInMonth = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() + 1,
          0,
        ).getDate();
      }

      const dailyLimit = Math.round(totalBudgetValue / daysInMonth);

      const weeklyLimit = Math.round(totalBudgetValue / 4);

      // -------------------------
      // API PAYLOAD
      // -------------------------

      const payload = {
        userId,
        month: budgetForm.month?.trim() || "May 2026",
        totalBudget: totalBudgetValue,
        dailyLimit,
        weeklyLimit,
        categories: cleanedCategories,
      };

      console.log("Budget Payload:", payload);

      // -------------------------
      // START SAVING
      // -------------------------

      setSaving(true);

      // -------------------------
      // UPDATE EXISTING BUDGET
      // -------------------------

      if (budget?._id) {
        console.log("Updating existing budget:", budget._id);

        await updateBudget(budget._id, payload);

        alert("Budget updated successfully.");
      }

      // -------------------------
      // CREATE NEW BUDGET
      // -------------------------
      else {
        console.log("Creating new budget:", payload);

        await createBudget(payload);

        alert("Budget created successfully.");
      }

      // -------------------------
      // REFRESH DATA
      // -------------------------

      await loadData();

      // Close modal only after successful API call
      setShowModal(false);
    } catch (error) {
      console.error("Budget save failed:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to save budget. Please try again.";

      alert(`Unable to save budget:\n${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[70vh]">
          <h2 className="text-2xl text-slate-400">Loading Budget...</h2>
        </div>
      </DashboardLayout>
    );
  }

  // =========================
  // CALCULATIONS
  // =========================

  const totalBudget = budget?.totalBudget || 0;

  const totalSpent = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );

  const remaining = Math.max(0, totalBudget - totalSpent);

  const totalAssets = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0,
  );

  const budgetGap = totalAssets - totalBudget;

  const utilization =
    totalBudget > 0
      ? Math.min(100, Math.max(0, Math.round((totalSpent / totalBudget) * 100)))
      : 0;

  const categoryData = (budget?.categories || []).map((item) => {
    const spent = expenses
      .filter(
        (expense) =>
          expense.category?.toLowerCase().trim() ===
          item.name?.toLowerCase().trim(),
      )
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const account = accounts.find(
      (acc) => String(acc._id) === String(item.accountId),
    );

    const percentage =
      item.limit > 0
        ? Math.min(100, Math.max(0, Math.round((spent / item.limit) * 100)))
        : 0;

    return {
      ...item,
      spent,
      percentage,
      remaining: Math.max(0, item.limit - spent),
      isOverBudget: spent > item.limit,
      accountName: account?.name || "Unassigned",
      accountIcon: account?.icon || "🏦",
    };
  });

  const sourceCategories = budget?.categories || [];

  const accountBudgetSummary = accounts.map((account) => {
    const allocated = sourceCategories
      .filter((category) => String(category.accountId) === String(account._id))
      .reduce((sum, category) => sum + Number(category.limit || 0), 0);

    return {
      ...account,
      allocated,
      difference: Number(account.balance || 0) - allocated,
    };
  });

  const totalCategoryLimit = budgetForm.categories.reduce(
    (sum, item) => sum + Number(item.limit || 0),
    0,
  );

  const isBudgetExceeded =
    totalCategoryLimit > Number(budgetForm.totalBudget || 0);

  // =========================
  // UI
  // =========================

  return (
    <DashboardLayout>
      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold">Budget Planner</h1>

          <p className="text-slate-400 mt-2">
            Plan, track and optimize your monthly budget
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setBudgetForm({
              month: budget?.month || "May 2026",

              totalBudget: budget?.totalBudget || "",

              categories:
                budget?.categories?.length > 0
                  ? budget.categories.map((item) => ({
                      name: item.name || "",
                      limit: item.limit || "",
                      accountId: item.accountId || "",
                      type: item.type || "Expense",
                    }))
                  : [
                      {
                        name: "",
                        limit: "",
                        accountId: "",
                        type: "Expense",
                      },
                    ],
            });

            setShowModal(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
        >
          <FiPlus />
          {budget?._id ? "Update Budget" : "Create Budget"}
        </button>
      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">Monthly Budget</p>

          <h3 className="text-3xl font-bold mt-2">
            ₹{Number(totalBudget).toLocaleString()}
          </h3>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-5">
          <p className="text-slate-400">Total Assets</p>

          <h3 className="text-3xl font-bold text-cyan-400 mt-2">
            ₹{totalAssets.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">Total Spent</p>

          <h3 className="text-3xl font-bold text-red-400 mt-2">
            ₹{totalSpent.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">Remaining</p>

          <h3 className="text-3xl font-bold text-green-400 mt-2">
            ₹{remaining.toLocaleString()}
          </h3>
        </div>
      </div>

      {/* Budget Health */}

      <div className="mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <FiTrendingUp className="text-indigo-400" size={22} />

            <h3 className="text-xl font-semibold">Budget Health</h3>
          </div>

          <div className="flex justify-between mb-3">
            <span>Budget Utilization</span>

            <span className="font-semibold">{utilization}%</span>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-4">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
              style={{
                width: `${utilization}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Budgets */}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <FiTarget className="text-cyan-400" size={22} />

          <h3 className="text-xl font-semibold">Category Budgets</h3>
        </div>

        <div className="space-y-6">
          {categoryData.map((item) => {
            const percentage =
              item.limit > 0
                ? Math.min(100, Math.round((item.spent / item.limit) * 100))
                : 0;

            return (
              <div key={item.name}>
                <div className="flex flex-col md:flex-row md:justify-between mb-2">
                  <span className="font-medium">{item.name}</span>

                  <span className="text-slate-400">
                    ₹{item.spent.toLocaleString()}
                    {" / "}₹{Number(item.limit).toLocaleString()}
                  </span>
                </div>

                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      item.isOverBudget
                        ? "bg-red-500"
                        : "bg-gradient-to-r from-cyan-500 to-indigo-500"
                    }`}
                    style={{
                      width: `${item.percentage}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-slate-400">{percentage}% used</span>

                  <span className="text-green-400">
                    {item.isOverBudget
                      ? `Over by ₹${(item.spent - item.limit).toLocaleString()}`
                      : `₹${item.remaining.toLocaleString()} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insight */}

      <div className="mt-8 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <FiAlertTriangle className="text-yellow-400" size={22} />

          <h3 className="text-xl font-semibold">AI Budget Suggestion</h3>
        </div>

        <p className="text-slate-300 mt-4">
          You have spent ₹{totalSpent.toLocaleString()} from your ₹
          {totalBudget.toLocaleString()} budget.
        </p>

        <p className="text-green-400 mt-4 font-medium">
          Remaining Budget: ₹{remaining.toLocaleString()}
        </p>
      </div>

      {/* =========================
          BUDGET MODAL
      ========================= */}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-slate-700">
            <h2 className="text-2xl font-bold mb-5">
              {budget?._id ? "Update Budget" : "Create Budget"}
            </h2>

            {/* Total Budget */}

            <input
              type="number"
              placeholder="Total Budget"
              value={budgetForm.totalBudget}
              onChange={(e) =>
                setBudgetForm((prev) => ({
                  ...prev,
                  totalBudget: e.target.value,
                }))
              }
              className="w-full bg-slate-800 p-3 rounded-xl mb-4"
            />

            {/* Categories */}

            <div className="space-y-4">
              {budgetForm.categories.map((category, index) => (
                <div
                  key={index}
                  className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3"
                >
                  {/* Category */}

                  <input
                    type="text"
                    placeholder="Category"
                    value={category.name}
                    onChange={(e) =>
                      handleCategoryChange(index, "name", e.target.value)
                    }
                    className="bg-slate-800 p-3 rounded-xl"
                  />

                  {/* Limit */}

                  <input
                    type="number"
                    placeholder="Budget"
                    value={category.limit}
                    onChange={(e) =>
                      handleCategoryChange(index, "limit", e.target.value)
                    }
                    className="bg-slate-800 p-3 rounded-xl"
                  />

                  {/* Account */}

                  <select
                    value={category.accountId}
                    onChange={(e) =>
                      handleCategoryChange(index, "accountId", e.target.value)
                    }
                    className="bg-slate-800 p-3 rounded-xl"
                  >
                    <option value="">Select Account</option>

                    {accounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.icon} {account.name} (₹
                        {Number(account.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>

                  {/* Type */}

                  <select
                    value={category.type}
                    onChange={(e) =>
                      handleCategoryChange(index, "type", e.target.value)
                    }
                    className="bg-slate-800 p-3 rounded-xl"
                  >
                    <option value="Expense">Expense</option>

                    <option value="Savings">Savings</option>

                    <option value="Investment">Investment</option>

                    <option value="Bill">Bill</option>
                  </select>

                  {/* Remove */}

                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(index)}
                    className="bg-red-500/20 text-red-400 rounded-xl"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Add Category */}

              <button
                type="button"
                onClick={handleAddCategory}
                className="w-full py-3 rounded-xl border border-dashed border-indigo-500 text-indigo-400"
              >
                + Add Category
              </button>
            </div>

            {/* Budget Allocation */}

            <div className="mt-6">
              <div className="flex justify-between text-sm">
                <span>Budget Allocated</span>

                <span>
                  ₹{totalCategoryLimit.toLocaleString()}
                  {" / "}₹{Number(budgetForm.totalBudget || 0).toLocaleString()}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-700 rounded-full mt-2">
                <div
                  className={`h-3 rounded-full ${
                    isBudgetExceeded ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Number(budgetForm.totalBudget) > 0
                        ? (totalCategoryLimit /
                            Number(budgetForm.totalBudget)) *
                            100
                        : 0,
                    )}%`,
                  }}
                />
              </div>

              {isBudgetExceeded && (
                <p className="text-red-400 text-sm mt-2">
                  Category limits exceed total monthly budget.
                </p>
              )}
            </div>

            {/* Buttons */}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveBudget}
                disabled={isBudgetExceeded || saving}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  isBudgetExceeded || saving
                    ? "bg-slate-600 cursor-not-allowed opacity-70"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105"
                }`}
              >
                {saving
                  ? "Saving..."
                  : budget?._id
                    ? "Update Budget"
                    : "Create Budget"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Savings Health */}

      <div className="mt-8 bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4">Savings Health</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-slate-400">Budget Remaining</p>

            <h4 className="text-2xl font-bold text-green-400">
              ₹{remaining.toLocaleString()}
            </h4>
          </div>

          <div>
            <p className="text-slate-400">Assets</p>

            <h4 className="text-2xl font-bold text-cyan-400">
              ₹{totalAssets.toLocaleString()}
            </h4>
          </div>

          <div>
            <p className="text-slate-400">Savings Rate</p>

            <h4 className="text-2xl font-bold text-indigo-400">
              {totalBudget > 0
                ? ((remaining / totalBudget) * 100).toFixed(1)
                : 0}
              %
            </h4>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
