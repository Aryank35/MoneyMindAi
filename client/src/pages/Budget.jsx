import DashboardLayout from "../components/layout/DashboardLayout";
import AmountInput from "../components/common/AmountInput";
import { amountOf } from "../utils/calc";
import {
  FiPlus,
  FiAlertTriangle,
  FiArrowRight,
  FiTrash2,
  FiX,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";
import { motion, Reorder } from "framer-motion";
import { Link } from "react-router-dom";

import {
  getBudgetByUser,
  createBudget,
  updateBudget,
  getBudgetOverview,
  getBudgetMonths,
  deleteBudget,
  getBudgetPlanning,
  getBudgetDeleteImpact,
} from "../services/budgetService";

import { getAccountsByUser } from "../services/accountService";
import { useEffect, useState } from "react";
import { getExpensesByUser } from "../services/expenseService";
import { getUserId } from "../utils/auth";
import { createTransfer } from "../services/transferService";

import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import Modal from "../components/common/Modal";
import { Skeleton } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { moveItem } from "../utils/reorder";
import BudgetOverview from "../components/common/BudgetOverview";
import SortableRow from "../components/common/SortableRow";
import BudgetSummaryDialog from "../components/common/BudgetSummaryDialog";
import MonthNavigator from "../components/common/MonthNavigator";
import AllocationRuleEditor from "../components/common/AllocationRuleEditor";
import BankFundingPanel, {
  FundBankDialog,
} from "../components/common/BankFundingPanel";
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
  group: null,
});

export default function Budget() {
  const toast = useToast();

  const [budget, setBudget] = useState(null);

  // This month's plan measured against what actually happened. Loaded from
  // the server so the spending definition matches the rest of the app.
  const [overview, setOverview] = useState(null);
  const [applying, setApplying] = useState(false);

  // Which month is on screen. Null until the first load names it, so the
  // page never guesses a month the server might disagree about.
  // The bank whose shortfall is being funded, if any.
  const [fundingBank, setFundingBank] = useState(null);

  // Shown once after a save, so the plan can be read back the way it will be
  // lived: account by account rather than category by category.
  const [showSummary, setShowSummary] = useState(false);

  const [monthKey, setMonthKey] = useState(null);
  const [months, setMonths] = useState([]);
  const [currentKey, setCurrentKey] = useState(null);
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

  // Dragging now runs through SortableRow (pointer events, live reorder), so
  // it works on touch too. The arrows on each row stay as the keyboard and
  // precise-nudge path.

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
    const isEmpty = !category?.name?.trim() && !amountOf(category?.limit);

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
                group: item.group || null,
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

    await loadOverview(userId);
  }

  // Kept separate from the form data: the analysis is derived server-side and
  // has to be re-read after every change that could move a figure.
  async function loadOverview(userId, key) {
    const id = userId || getUserId();

    try {
      const [overviewResponse, monthsResponse] = await Promise.all([
        getBudgetOverview(id, key ?? monthKey ?? undefined),
        getBudgetMonths(id),
      ]);

      setOverview(overviewResponse.data);
      setMonthKey(overviewResponse.data?.monthKey || null);

      setMonths(monthsResponse.data?.months || []);
      setCurrentKey(monthsResponse.data?.currentKey || null);
    } catch (error) {
      console.error("Error loading budget overview:", error);
    }
  }

  const selectMonth = async (key) => {
    setMonthKey(key);

    await loadOverview(undefined, key);
  };

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

      // The analysis is loaded here too: this effect - not loadData - is what
      // runs on mount, so leaving it out meant the overview only ever
      // appeared after an edit.
      if (!cancelled) await loadOverview(userId);
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================
  // OPEN MODAL
  // =========================

  // Seeded from the month on screen. `budget` holds whichever budget was
  // created most recently, which is not the same month - editing while
  // viewing October would otherwise open September's plan and save over it.
  const openBudgetModal = () => {
    const lines = overview?.hasBudget ? overview.categories : [];

    setBudgetForm({
      month: overview?.month || budget?.month || getDefaultMonth(),

      // A new plan starts from what income actually supports; an existing one
      // keeps whatever the user already set.
      totalBudget:
        overview?.totalBudget || planning?.suggestedTotalBudget || "",

      categories:
        lines.length > 0
          ? lines.map((item) => ({
              uid: nextCategoryRowId(),
              name: item.name || "",
              limit: item.limit || "",
              accountId: item.accountId || "",
              type: item.type || "Expense",
              group: item.group || null,
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

      const totalBudgetValue = amountOf(budgetForm.totalBudget);

      if (!Number.isFinite(totalBudgetValue) || totalBudgetValue <= 0) {
        toast.error("Please enter a valid total budget greater than 0.");
        return;
      }

      // -------------------------
      // CLEAN CATEGORIES
      // -------------------------

      const cleanedCategories = budgetForm.categories
        .filter((item) => item?.name?.trim() && amountOf(item.limit) > 0)
        .map((item) => ({
          name: item.name.trim(),
          limit: amountOf(item.limit),
          accountId: item.accountId,
          type: item.type || "Expense",
          group: item.group || null,
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
        (sum, item) => sum + amountOf(item.limit),
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

      // The id for the month on screen. Falling back to `budget._id` would
      // update a different month whenever the navigator had moved.
      const editingId = overview?.hasBudget ? overview.budgetId : null;

      if (editingId) {
        await updateBudget(editingId, payload);

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

      setShowSummary(true);
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

  // `utilization` and `categoryData` lived here and derived per-category
  // spend from Expense rows alone. The server-side overview does it from
  // the ledger instead, so a split share counts and both figures agree.

  const budgetableIncome = Number(planning?.income?.budgetable || 0);

  // Over-allocation is a warning, not a block: planning ahead of recorded
  // income is legitimate.
  const isOverIncome = budgetableIncome > 0 && totalBudget > budgetableIncome;

  const incomeCoverage =
    totalBudget > 0 ? Math.round((budgetableIncome / totalBudget) * 100) : 0;

  // Drives the live warning inside the edit form, so it reads the form state
  // rather than the saved budget.
  const totalCategoryLimit = budgetForm.categories.reduce(
    (sum, item) => sum + amountOf(item.limit),
    0,
  );

  const isBudgetExceeded =
    totalCategoryLimit > amountOf(budgetForm.totalBudget);

  // =========================
  // PLAN ADJUSTMENTS
  //
  // All three write the same way: take the saved budget, change the limits,
  // and save it back. Nothing here moves money - it moves the plan.
  // =========================

  const saveAdjustedCategories = async (nextCategories, successMessage) => {
    if (!overview?.budgetId) return;

    try {
      setApplying(true);

      await updateBudget(overview.budgetId, {
        month: overview.month,
        totalBudget: overview.totalBudget,
        categories: nextCategories,
      });

      toast.success(successMessage);

      await loadData();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || "Could not update the plan",
      );
    } finally {
      setApplying(false);
    }
  };

  const handleSaveRule = async (rule) => {
    if (!overview?.budgetId) return;

    try {
      setApplying(true);

      await updateBudget(overview.budgetId, {
        month: overview.month,
        totalBudget: overview.totalBudget,
        categories: overview?.categories || [],
        allocationRule: rule,
      });

      toast.success("Split updated");

      await loadOverview(undefined, monthKey);
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not save the split");
    } finally {
      setApplying(false);
    }
  };

  // Starting a month from the one before it, rather than from a blank form.
  const startFromPreviousMonth = () => {
    const previous = overview?.previousMonth;

    if (!previous) return;

    setBudgetForm({
      month: overview.month,
      totalBudget: previous.totalBudget || "",
      categories: previous.categories.map((item) => ({
        uid: nextCategoryRowId(),
        name: item.name,
        limit: item.limit,
        accountId: item.accountId || "",
        type: item.type || "Expense",
        group: item.group || null,
      })),
    });

    setShowModal(true);
  };

  // Moving money into a bank that is short of what its budget lines need.
  // This is a real transfer: both balances move, and it lands in the ledger
  // as "moved, not spent" rather than as spending.
  const handleFundBank = async ({ fromAccountId, toAccountId, amount }) => {
    try {
      setApplying(true);

      await createTransfer({
        userId: getUserId(),
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        note: `Funding ${overview?.month || "this month"} budget`,
        transferDate: new Date(),
      });

      toast.success(`${money(amount)} moved into ${fundingBank?.name}`);

      setFundingBank(null);

      await loadOverview(undefined, monthKey);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || "Could not move the money",
      );
    } finally {
      setApplying(false);
    }
  };

  const handleApplyProposal = (proposal) => {
    const cuts = new Map(
      (proposal.changes || []).map((change) => [change.name, change.to]),
    );

    saveAdjustedCategories(
      (overview?.categories || []).map((category) =>
        cuts.has(category.name)
          ? { ...category, limit: cuts.get(category.name) }
          : category,
      ),
      "Plan fitted to your available cash",
    );
  };

  const handleCoverOverspend = ({ target, source, amount }) => {
    saveAdjustedCategories(
      (overview?.categories || []).map((category) => {
        if (category.name === target) {
          return { ...category, limit: Number(category.limit || 0) + amount };
        }

        // Unallocated money needs no donor line - the total already covers
        // it, so only a category source gives anything up.
        if (source.kind === "category" && category.name === source.name) {
          return { ...category, limit: Number(category.limit || 0) - amount };
        }

        return category;
      }),
      `${money(amount)} moved into ${target}`,
    );
  };

  // Folding an off-plan category in. Its limit starts at what has already
  // been spent, which is the smallest honest number: anything less would
  // create an overspend the moment it is added.
  const handleAdoptCategory = (item) => {
    saveAdjustedCategories(
      [
        ...(overview?.categories || []),
        {
          name: item.name,
          limit: Math.ceil(item.spent),
          type: "Expense",
          group: null,
          accountId: null,
        },
      ],
      `${item.name} added to your plan`,
    );
  };

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

      {/* Which month is on screen, and what kind of month it is. */}
      {monthKey && (
        <div className="mb-6">
          <MonthNavigator
            monthKey={monthKey}
            months={months}
            currentKey={currentKey}
            onSelect={selectMonth}
          />
        </div>
      )}

      {/* The month measured against the plan. Leads the page: what actually
          happened matters more than the form that set it up.

          A past month is history - its actions are withheld rather than
          disabled, because rebalancing a finished month is meaningless. */}
      {overview?.hasBudget && (
        <div className="mb-8 space-y-5">
          <BudgetOverview
            overview={overview}
            busy={applying}
            onApplyProposal={overview.isPast ? undefined : handleApplyProposal}
            onCoverOverspend={overview.isPast ? undefined : handleCoverOverspend}
            onAdoptCategory={overview.isPast ? undefined : handleAdoptCategory}
            onEditPlan={overview.isPast ? undefined : openBudgetModal}
          />

          {/* What each account must be holding for the plan to work, and a
              way to move money into one that is short. */}
          <BankFundingPanel
            funding={overview.bankFunding}
            busy={applying}
            onFund={overview.isPast ? undefined : setFundingBank}
          />

          <AllocationRuleEditor
            // Remounts per month, so switching months re-seeds the draft
            // without an effect that could clobber an edit in progress.
            key={monthKey}
            rule={overview.rule}
            totalBudget={overview.totalBudget}
            readOnly={overview.isPast}
            busy={applying}
            onSave={handleSaveRule}
          />
        </div>
      )}

      {/* A month with no plan yet. Offering last month's is the difference
          between "set a budget every month" being a chore and a tap. */}
      {overview && !overview.hasBudget && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 text-center">
          <p className="text-lg font-semibold">
            No plan for {overview.month} yet
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {overview.isPast
              ? "This month finished without a budget, so there is nothing to measure against."
              : overview.isFuture
                ? "Plan ahead — you can set this up before the month starts."
                : "Set one up to start tracking this month."}
          </p>

          {!overview.isPast && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {overview.previousMonth && (
                <Button variant="primary" onClick={startFromPreviousMonth}>
                  Start from {overview.previousMonth.month}
                </Button>
              )}

              <Button
                variant={overview.previousMonth ? "secondary" : "primary"}
                icon={FiPlus}
                onClick={openBudgetModal}
              >
                Build from scratch
              </Button>
            </div>
          )}
        </div>
      )}

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

      {/* The summary cards, health bar and category list that used to sit
          here are gone: BudgetOverview above supersedes all three, and
          theirs counted Expense rows only - so they quoted a smaller
          "total spent" than the overview directly above them. */}

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

        {/* Reads the same ledger totals as the overview above. It used to
            sum Expense rows on its own, which is why it could claim a
            smaller spend than the panel a few inches higher. */}
        <p className="text-slate-300 mt-4">
          You have spent {money(overview?.totals?.totalSpent ?? totalSpent)} of
          your {money(totalBudget)} budget
          {overview?.totals?.unbudgetedTotal > 0 && (
            <>
              , including{" "}
              <span className="text-amber-300">
                {money(overview.totals.unbudgetedTotal)}
              </span>{" "}
              on categories your plan does not have
            </>
          )}
          .
        </p>

        <p
          className={`mt-4 font-medium ${
            (overview?.totals?.net ?? remaining) < 0
              ? "text-red-400"
              : "text-green-400"
          }`}
        >
          {(overview?.totals?.net ?? remaining) < 0
            ? `Over budget by ${money(Math.abs(overview?.totals?.net ?? remaining))}`
            : `Remaining budget: ${money(overview?.totals?.remaining ?? remaining)}`}
        </p>
      </motion.div>

      <Modal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        title="Your plan, account by account"
        maxWidth="max-w-lg"
      >
        <BudgetSummaryDialog
          overview={overview}
          onClose={() => setShowSummary(false)}
          onFixFunding={() => {
            // Straight to the account that needs money most.
            const worst = overview?.bankFunding?.banks?.find(
              (bank) => bank.shortfall > 0,
            );

            setShowSummary(false);

            if (worst) setFundingBank(worst);
          }}
        />
      </Modal>

      <Modal
        isOpen={Boolean(fundingBank)}
        onClose={() => (applying ? null : setFundingBank(null))}
        title="Move money in"
        maxWidth="max-w-md"
      >
        <FundBankDialog
          bank={fundingBank}
          donors={overview?.bankFunding?.donors || []}
          busy={applying}
          onClose={() => setFundingBank(null)}
          onConfirm={handleFundBank}
        />
      </Modal>

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
            <AmountInput
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
                {amountOf(budgetForm.totalBudget) !== budgetableIncome && (
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
              amountOf(budgetForm.totalBudget) > budgetableIncome && (
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                  <FiAlertTriangle className="mt-0.5 shrink-0" />
                  {money(
                    amountOf(budgetForm.totalBudget) - budgetableIncome,
                  )}{" "}
                  more than your recorded income. You can still save this.
                </p>
              )}
          </div>
        </div>

        {/* Categories */}

        {/* Reorder.Group reports the new order continuously while dragging,
            not once on drop, which is what lets the other rows move out of
            the way as you go. */}
        <Reorder.Group
          axis="y"
          as="div"
          values={budgetForm.categories}
          onReorder={setCategoryOrder}
          className="space-y-4"
        >
          {budgetForm.categories.map((category, index) => (
            <SortableRow
              key={category.uid}
              value={category}
              className="flex items-start gap-2 rounded-2xl border border-white/5 bg-slate-800/40 p-4"
              handleClassName="pt-3"
            >
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

                <AmountInput
                  label=""
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

                {/* Need / want / save + Remove */}

                <div className="flex gap-3">
                  <Select
                    aria-label="Category group"
                    className="flex-1"
                    value={category.group || ""}
                    onChange={(e) =>
                      handleCategoryChange(
                        index,
                        "group",
                        e.target.value || null,
                      )
                    }
                  >
                    {/* Blank means "not chosen", and the plan falls back to a
                        sensible group rather than forcing a decision here. */}
                    <option value="">Auto</option>

                    <option value="need">Need</option>

                    <option value="want">Want</option>

                    <option value="save">Save / invest</option>
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
            </SortableRow>
          ))}
        </Reorder.Group>

        <div className="mt-4">
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
              {" / "}₹{amountOf(budgetForm.totalBudget).toLocaleString()}
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
                  amountOf(budgetForm.totalBudget) > 0
                    ? (totalCategoryLimit / amountOf(budgetForm.totalBudget)) *
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
