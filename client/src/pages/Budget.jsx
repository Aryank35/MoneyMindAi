import DashboardLayout from "../components/layout/DashboardLayout";
import {
  FiPlus,
  FiTarget,
  FiTrendingUp,
  FiAlertTriangle,
  FiArrowRight,
  FiTrash2,
  FiX,
  FiChevronUp,
  FiChevronDown,
  FiMenu,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import {
  getBudgetByUser,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetPlanning,
  getBudgetDeleteImpact,
} from "../services/budgetService";

import { getAccountsByUser } from "../services/accountService";
import { useEffect, useState } from "react";
import { getExpensesByUser } from "../services/expenseService";
import { getUserId } from "../utils/auth";

import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import Modal from "../components/common/Modal";
import { Skeleton } from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../components/common/Toast";
import CategoryProgressBar from "../components/common/CategoryProgressBar";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { moveItem } from "../utils/reorder";
import { useDragReorder } from "../utils/dragReorder";
import { money } from "../utils/incomeFormulas";

// =========================
// MONTH HELPERS
// =========================

const getDefaultMonth = () =>
  new Date().toLocaleString("default", { month: "long", year: "numeric" });

// Converts a "Month YYYY" label (e.g. "September 2026") into the
// "YYYY-MM" value an <input type="month"> expects.
const monthLabelToInputValue = (label) => {
  const parsed = new Date(`${label} 1`);

  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
};

// Converts an <input type="month"> value ("YYYY-MM") back into the
// "Month YYYY" label format the rest of this component/the API expects.
const inputValueToMonthLabel = (value) => {
  if (!value) return getDefaultMonth();

  const [year, month] = value.split("-").map(Number);
  const parsed = new Date(year, (month || 1) - 1, 1);

  return parsed.toLocaleString("default", { month: "long", year: "numeric" });
};

// Form rows need an identity of their own. Categories are stored as a plain
// array with no id, and keying rows by array index makes React reuse whatever
// node already sits at a position instead of following the row that moved -
// which drops focus and the caret the moment a row is dragged past another.
// The uid is form-local and never sent: the save payload maps named fields.
let categoryRowSeq = 0;

const nextCategoryRowId = () => {
  categoryRowSeq += 1;

  return `category-row-${categoryRowSeq}`;
};

const emptyCategory = () => ({
  uid: nextCategoryRowId(),
  name: "",
  limit: "",
  accountId: "",
  type: "Expense",
});

export default function Budget() {
  const toast = useToast();

  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(getUserId()));
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Budgetable income for the month, from the income page.
  const [planning, setPlanning] = useState(null);

  // One dialog drives every destructive action on this page - nothing is
  // removed without an explicit confirmation.
  const [confirmState, setConfirmState] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [budgetForm, setBudgetForm] = useState({
    month: getDefaultMonth(),
    totalBudget: "",
    categories: [emptyCategory()],
  });

  // =========================
  // CATEGORY HANDLERS
  // =========================

  // Category order is simply the array order - it is what the budget stores
  // and what every category picker reads - so moving one is a local swap
  // that saves with the rest of the form.
  const handleMoveCategory = (index, direction) =>
    setBudgetForm((prev) => ({
      ...prev,
      categories: moveItem(prev.categories, index, index + direction),
    }));

  const setCategoryOrder = (categories) =>
    setBudgetForm((prev) => ({ ...prev, categories }));

  // Dragging is the desktop gesture; the arrows on each row stay the way to
  // reorder by touch and keyboard, since HTML5 drag events never fire on a
  // touchscreen.
  const categoryDrag = useDragReorder({
    items: budgetForm.categories,
    onReorder: setCategoryOrder,
  });

  const handleAddCategory = () => {
    setBudgetForm((prev) => ({
      ...prev,
      categories: [...prev.categories, emptyCategory()],
    }));
  };

  const removeCategoryAt = (index) => {
    setBudgetForm((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  // Only asks when there is something to lose - blank rows just go.
  const handleRemoveCategory = (index) => {
    const category = budgetForm.categories[index];
    const isEmpty = !category?.name?.trim() && !Number(category?.limit);

    if (isEmpty) {
      removeCategoryAt(index);
      return;
    }

    setConfirmState({
      title: "Remove this category?",
      message: `"${category.name || "Untitled"}" with a limit of ${money(category.limit)} will be removed from the budget form. Nothing is saved until you save the budget.`,
      confirmLabel: "Remove",
      onConfirm: () => {
        removeCategoryAt(index);
        setConfirmState(null);
      },
    });
  };

  // Deleting the whole budget - the impact is fetched first so the dialog
  // can say exactly what goes.
  const requestDeleteBudget = async () => {
    if (!budget?._id) return;

    setConfirmState({
      title: "Delete this budget?",
      message: "Loading what this removes...",
      confirmLabel: "Delete budget",
      onConfirm: () => handleDeleteBudget(),
    });

    try {
      const response = await getBudgetDeleteImpact(budget._id);
      const impact = response.data;

      setConfirmState({
        title: `Delete the ${impact.month} budget?`,
        message: `This removes the plan of ${money(impact.totalBudget)} across ${impact.categoryCount} categor${impact.categoryCount === 1 ? "y" : "ies"}. Your recorded expenses and income are not touched - only the plan is deleted. This cannot be undone.`,
        confirmLabel: "Delete budget",
        onConfirm: () => handleDeleteBudget(),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteBudget = async () => {
    try {
      setConfirmBusy(true);
      await deleteBudget(budget._id);
      toast.success("Budget deleted");
      setConfirmState(null);
      setBudget(null);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to delete budget");
    } finally {
      setConfirmBusy(false);
    }
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

  // Fetches the raw budget/expense/account records for a user. Pure I/O,
  // no setState — shared by the mount-time load below and by
  // handleSaveBudget's post-save refresh.
  async function fetchBudgetData(userId) {
    return Promise.all([
      getBudgetByUser(userId),
      getExpensesByUser(userId),
      getAccountsByUser(userId),
      getBudgetPlanning(userId),
    ]);
  }

  // Applies a fetchBudgetData() result to state.
  function applyBudgetData([
    budgetResponse,
    expenseResponse,
    accountResponse,
    planningResponse,
  ]) {
    setAccounts(accountResponse?.data || []);
    setExpenses(expenseResponse?.data || []);
    setPlanning(planningResponse?.data || null);

    const currentBudget = budgetResponse?.data?.[0] || null;

    setBudget(currentBudget);

    if (currentBudget) {
      setBudgetForm({
        month: currentBudget.month || getDefaultMonth(),
        totalBudget: currentBudget.totalBudget || "",
        categories:
          currentBudget.categories?.length > 0
            ? currentBudget.categories.map((item) => ({
                uid: nextCategoryRowId(),
                name: item.name || "",
                limit: item.limit || "",
                accountId: item.accountId || "",
                type: item.type || "Expense",
              }))
            : [emptyCategory()],
      });
    }
  }

  // Reusable, awaitable reload — called after a successful create/update
  // from handleSaveBudget (not from the mount effect, so it always runs
  // in response to a user action rather than as a render side effect).
  async function loadData() {
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
      applyBudgetData(await fetchBudgetData(userId));
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
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
        const data = await fetchBudgetData(userId);

        if (!cancelled) applyBudgetData(data);
      } catch (error) {
        console.error("Error loading budget data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================
  // OPEN MODAL
  // =========================

  const openBudgetModal = () => {
    setBudgetForm({
      month: budget?.month || getDefaultMonth(),
      // A new budget starts from what income actually supports; an existing
      // one keeps whatever the user already set.
      totalBudget:
        budget?.totalBudget || planning?.suggestedTotalBudget || "",
      categories:
        budget?.categories?.length > 0
          ? budget.categories.map((item) => ({
              uid: nextCategoryRowId(),
              name: item.name || "",
              limit: item.limit || "",
              accountId: item.accountId || "",
              type: item.type || "Expense",
            }))
          : [emptyCategory()],
    });

    setShowModal(true);
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
        toast.error("Unable to identify the logged-in user. Please login again.");
        return;
      }

      // -------------------------
      // TOTAL BUDGET VALIDATION
      // -------------------------

      const totalBudgetValue = Number(budgetForm.totalBudget);

      if (!Number.isFinite(totalBudgetValue) || totalBudgetValue <= 0) {
        toast.error("Please enter a valid total budget greater than 0.");
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
        toast.error("Please add at least one category with a valid budget.");
        return;
      }

      // -------------------------
      // ACCOUNT VALIDATION
      // -------------------------

      const invalidAccount = cleanedCategories.some((item) => !item.accountId);

      if (invalidAccount) {
        toast.error("Every category must have an account assigned.");
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
        toast.error("Category budgets exceed the total budget.");
        return;
      }

      // -------------------------
      // DAYS IN SELECTED MONTH
      // -------------------------

      const monthDate = new Date(`${budgetForm.month || getDefaultMonth()} 1`);

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
        month: budgetForm.month?.trim() || getDefaultMonth(),
        totalBudget: totalBudgetValue,
        dailyLimit,
        weeklyLimit,
        categories: cleanedCategories,
      };

      // -------------------------
      // START SAVING
      // -------------------------

      setSaving(true);

      // -------------------------
      // UPDATE EXISTING BUDGET
      // -------------------------

      if (budget?._id) {
        await updateBudget(budget._id, payload);

        toast.success("Budget updated successfully.");
      }

      // -------------------------
      // CREATE NEW BUDGET
      // -------------------------
      else {
        await createBudget(payload);

        toast.success("Budget created successfully.");
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

      toast.error(`Unable to save budget: ${errorMessage}`);
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
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-3" />
          <Skeleton className="h-5 w-80" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>

        <Skeleton className="h-36 mb-8" />
        <Skeleton className="h-72" />
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

    return {
      ...item,
      spent,
      accountName: account?.name || "Unassigned",
      accountIcon: account?.icon || "🏦",
    };
  });

  const budgetableIncome = Number(planning?.income?.budgetable || 0);

  // Over-allocation is a warning, not a block: planning ahead of recorded
  // income is legitimate.
  const isOverIncome = budgetableIncome > 0 && totalBudget > budgetableIncome;

  const incomeCoverage =
    totalBudget > 0
      ? Math.round((budgetableIncome / totalBudget) * 100)
      : 0;

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

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold">Budget Planner</h1>

          <p className="text-slate-400 mt-2">
            Plan, track and optimize your monthly budget
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon={FiPlus} onClick={openBudgetModal}>
            {budget?._id ? "Update Budget" : "Create Budget"}
          </Button>

          {budget?._id && (
            <Button
              variant="danger"
              icon={FiTrash2}
              onClick={requestDeleteBudget}
            >
              Delete
            </Button>
          )}
        </div>
      </motion.div>

      {/* Income -> Budget: the plan is built on recorded income */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        {budgetableIncome > 0 ? (
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Income received
              </p>
              <p className="text-xl font-bold">
                {money(planning?.income?.received)}
              </p>
            </div>

            <FiArrowRight className="text-slate-600" />

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Available to budget
              </p>
              <p className="text-xl font-bold text-green-400">
                {money(budgetableIncome)}
              </p>
            </div>

            {planning?.income?.excluded > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Excluded by you
                </p>
                <p className="text-xl font-bold text-slate-400">
                  {money(planning.income.excluded)}
                </p>
              </div>
            )}

            <div className="ml-auto flex flex-wrap gap-2">
              {(planning?.income?.bySource || []).map((row) => (
                <span
                  key={row.key}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs"
                  title={`${row.label}: ${money(row.received)} received`}
                >
                  {row.icon} {row.label} {money(row.budgetable)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-start gap-2 text-sm text-amber-200">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              No budgetable income recorded for this month yet. Budgets are
              planned against income, so start there.
            </p>
            <Link
              to="/income"
              className="rounded-xl bg-green-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-green-400"
            >
              Add income first
            </Link>
          </div>
        )}

        {isOverIncome && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            This budget of {money(totalBudget)} is {money(totalBudget - budgetableIncome)}{" "}
            more than the {money(budgetableIncome)} of income recorded for this
            month ({incomeCoverage}% covered). That is allowed - just make sure
            the rest is actually coming.
          </p>
        )}
      </motion.div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        {[
          {
            label: "Monthly Budget",
            value: totalBudget,
            className: "bg-white/5 border border-white/10",
            valueClassName: "",
          },
          {
            label: "Budgetable Income",
            value: budgetableIncome,
            className: "bg-green-500/10 border border-green-500/20",
            valueClassName: "text-green-400",
          },
          {
            label: "Total Spent",
            value: totalSpent,
            className: "bg-white/5 border border-white/10",
            valueClassName: "text-red-400",
          },
          {
            label: "Remaining",
            value: remaining,
            className: "bg-white/5 border border-white/10",
            valueClassName: "text-green-400",
          },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            className={`rounded-2xl p-5 ${card.className}`}
          >
            <p className="text-slate-400">{card.label}</p>

            <h3 className={`text-3xl font-bold mt-2 ${card.valueClassName}`}>
              ₹{Number(card.value).toLocaleString()}
            </h3>
          </motion.div>
        ))}
      </div>

      {/* Budget Health */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="mb-8"
      >
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
      </motion.div>

      {/* Category Budgets */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FiTarget className="text-cyan-400" size={22} />

          <h3 className="text-xl font-semibold">Category Budgets</h3>
        </div>

        {categoryData.length === 0 ? (
          <EmptyState
            icon={FiTarget}
            title="No categories yet"
            message="Create a budget with categories to start tracking your spending."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={FiPlus}
                onClick={openBudgetModal}
              >
                Add Category Budget
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {categoryData.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
              >
                <CategoryProgressBar
                  name={item.name}
                  spent={item.spent}
                  limit={item.limit}
                  accountName={item.accountName}
                  accountIcon={item.accountIcon}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* AI Insight */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="mt-8 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6"
      >
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
      </motion.div>

      {/* =========================
          BUDGET MODAL
      ========================= */}

      <Modal
        isOpen={showModal}
        onClose={() => {
          if (!saving) setShowModal(false);
        }}
        title={budget?._id ? "Update Budget" : "Create Budget"}
        maxWidth="max-w-6xl"
      >
        {/* Month + Total Budget */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            type="month"
            label="Budget Month"
            id="budget-month"
            value={monthLabelToInputValue(budgetForm.month)}
            onChange={(e) =>
              setBudgetForm((prev) => ({
                ...prev,
                month: inputValueToMonthLabel(e.target.value),
              }))
            }
          />

          <div>
            <Input
              type="number"
              label="Total Budget"
              id="budget-total"
              placeholder="Total Budget"
              value={budgetForm.totalBudget}
              onChange={(e) =>
                setBudgetForm((prev) => ({
                  ...prev,
                  totalBudget: e.target.value,
                }))
              }
            />

            {budgetableIncome > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">
                  {money(budgetableIncome)} of income available.
                </span>
                {Number(budgetForm.totalBudget || 0) !== budgetableIncome && (
                  <button
                    type="button"
                    onClick={() =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        totalBudget: budgetableIncome,
                      }))
                    }
                    className="rounded-lg bg-green-500/15 px-2 py-1 font-semibold text-green-300 transition hover:bg-green-500/25"
                  >
                    Match income
                  </button>
                )}
              </div>
            )}

            {budgetableIncome > 0 &&
              Number(budgetForm.totalBudget || 0) > budgetableIncome && (
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                  <FiAlertTriangle className="mt-0.5 shrink-0" />
                  {money(
                    Number(budgetForm.totalBudget) - budgetableIncome,
                  )}{" "}
                  more than your recorded income. You can still save this.
                </p>
              )}
          </div>
        </div>

        {/* Categories */}

        <div className="space-y-4">
          {budgetForm.categories.map((category, index) => (
            <div
              key={category.uid}
              {...categoryDrag.rowProps(index)}
              className={`flex items-start gap-2 rounded-2xl border bg-slate-800/40 p-4 transition ${
                categoryDrag.isDragging(index)
                  ? "border-indigo-400/50 opacity-50"
                  : categoryDrag.isOver(index)
                    ? "border-indigo-400/50"
                    : "border-white/5"
              }`}
            >
              {/* Grip. Hidden on a phone, where drag events never fire and
                  the arrows below are the way to reorder. */}
              <span
                {...categoryDrag.handleProps(index)}
                title="Drag to reorder"
                aria-hidden="true"
                className="hidden shrink-0 cursor-grab pt-3 text-slate-500 active:cursor-grabbing sm:block"
              >
                <FiMenu />
              </span>

              <div className="grid min-w-0 flex-1 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {/* Category */}

                <Input
                  type="text"
                  aria-label="Category name"
                  placeholder="Category"
                  value={category.name}
                  onChange={(e) =>
                    handleCategoryChange(index, "name", e.target.value)
                  }
                />

                {/* Limit */}

                <Input
                  type="number"
                  aria-label="Category budget limit"
                  placeholder="Budget"
                  value={category.limit}
                  onChange={(e) =>
                    handleCategoryChange(index, "limit", e.target.value)
                  }
                />

                {/* Account */}

                <Select
                  aria-label="Category account"
                  value={category.accountId}
                  onChange={(e) =>
                    handleCategoryChange(index, "accountId", e.target.value)
                  }
                >
                  <option value="">Select Account</option>

                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.icon} {account.name} (₹
                      {Number(account.balance).toLocaleString()})
                    </option>
                  ))}
                </Select>

                {/* Type + Remove */}

                <div className="flex gap-3">
                  <Select
                    aria-label="Category type"
                    className="flex-1"
                    value={category.type}
                    onChange={(e) =>
                      handleCategoryChange(index, "type", e.target.value)
                    }
                  >
                    <option value="Expense">Expense</option>

                    <option value="Savings">Savings</option>

                    <option value="Investment">Investment</option>

                    <option value="Bill">Bill</option>
                  </Select>

                  <div className="flex shrink-0 gap-1 self-start">
                    <button
                      type="button"
                      onClick={() => handleMoveCategory(index, -1)}
                      disabled={index === 0}
                      aria-label="Move category up"
                      className="rounded-lg border border-white/10 p-2 text-slate-300 transition active:scale-95 disabled:opacity-30"
                    >
                      <FiChevronUp />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveCategory(index, 1)}
                      disabled={index === budgetForm.categories.length - 1}
                      aria-label="Move category down"
                      className="rounded-lg border border-white/10 p-2 text-slate-300 transition active:scale-95 disabled:opacity-30"
                    >
                      <FiChevronDown />
                    </button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      icon={FiX}
                      aria-label="Remove category"
                      onClick={() => handleRemoveCategory(index)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Category */}

          <button
            type="button"
            onClick={handleAddCategory}
            className="w-full py-3 rounded-xl border border-dashed border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
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
                    ? (totalCategoryLimit / Number(budgetForm.totalBudget)) *
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSaveBudget}
            disabled={isBudgetExceeded}
            loading={saving}
          >
            {budget?._id ? "Update Budget" : "Create Budget"}
          </Button>
        </div>
      </Modal>

      {/* Savings Health */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.25 }}
        className="mt-8 bg-green-500/10 border border-green-500/20 rounded-2xl p-6"
      >
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
      </motion.div>

      <ConfirmDialog
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm?.()}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel || "Remove"}
        loading={confirmBusy}
      />
    </DashboardLayout>
  );
}
