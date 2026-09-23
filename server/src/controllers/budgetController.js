import Budget from "../models/Budget.js";
import Account from "../models/Account.js";
import Obligation from "../models/Obligation.js";
import {
  sumBudgetableIncome,
  getBudgetableIncomeBreakdown,
} from "./incomeController.js";
import { collectEntries, SPEND_KINDS } from "./statementController.js";
import {
  collectUpcomingSchedules,
  loadDecoratedSchedules,
} from "./scheduleController.js";
import { decorateObligation } from "./obligationController.js";
import { buildSpendable, isCashType } from "../helpers/spendable.js";
import { startOfDay } from "../helpers/dates.js";
import {
  buildAccountRequirements,
  buildBudgetPlan,
  keyForBudget,
  monthKeyOf,
  monthLabelOf,
  proposeFitToCash,
} from "../helpers/budgetPlan.js";

const monthKeyFromParts = ({ month, year }) =>
  `${year}-${String(month).padStart(2, "0")}`;

// Budgets are keyed by a "September 2026" label; income is keyed by numeric
// month/year. This is the seam between the two.
const parseMonthLabel = (label) => {
  const parsed = new Date(`${label} 1`);

  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();

    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  return { month: parsed.getMonth() + 1, year: parsed.getFullYear() };
};

const validateCategories = (totalBudget, categories) => {
  let totalCategoryLimit = 0;

  const uniqueNames = new Set();

  for (const category of categories) {
    const name = category.name?.trim()?.toLowerCase();

    const limit = Number(category.limit);

    if (!name) {
      return "Category name is required";
    }

    if (limit < 0) {
      return "Category limit cannot be negative";
    }

    if (uniqueNames.has(name)) {
      return `Duplicate category: ${category.name}`;
    }

    uniqueNames.add(name);

    totalCategoryLimit += limit;
  }

  if (totalCategoryLimit > totalBudget) {
    return "Category limits exceed total budget";
  }

  return null;
};

const calculateLimits = (totalBudget) => {
  const now = new Date();

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  return {
    dailyLimit: Math.round(totalBudget / daysInMonth),

    weeklyLimit: Math.round(totalBudget / 4),
  };
};

export const createBudget = async (req, res) => {
  try {
    const { userId, month, totalBudget, categories } = req.body;

    const validationError = validateCategories(
      Number(totalBudget),
      categories || [],
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const cleanedCategories = categories.map((category) => ({
      name: category.name.trim(),

      limit: Number(category.limit),

      accountId: category.accountId || null,

      type: category.type || "Expense",

      // Null is meaningful: it means "not chosen", and the plan derives a
      // starting group from `type` rather than guessing here.
      group: category.group || null,

      icon: category.icon || "📦",

      color: category.color || "#6366F1",

      spent: Number(category.spent || 0),
    }));

    const { dailyLimit, weeklyLimit } = calculateLimits(Number(totalBudget));

    // The budget is planned against income that has actually been recorded,
    // so this is derived here rather than accepted from the client.
    const period = parseMonthLabel(month);

    const estimatedIncome = await sumBudgetableIncome(
      userId,
      period.month,
      period.year,
    );

    const budget = await Budget.create({
      userId,
      month,

      // Stamped so the month can be queried directly. Picking "the newest
      // budget" was never the same question as "this month's budget".
      monthKey: monthKeyFromParts(period),

      allocationMode: req.body.allocationMode || "manual",
      allocationRule: req.body.allocationRule || undefined,

      totalBudget: Number(totalBudget),

      estimatedIncome,

      dailyLimit,
      weeklyLimit,

      categories: cleanedCategories,
    });

    res.status(201).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBudgetByUser = async (req, res) => {
  try {
    const budgets = await Budget.find({
      userId: req.params.userId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: budgets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBudget = async (req, res) => {
  try {
    const { totalBudget, categories } = req.body;

    const validationError = validateCategories(
      Number(totalBudget),
      categories || [],
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const cleanedCategories = categories.map((category) => ({
      name: category.name.trim(),

      limit: Number(category.limit),

      accountId: category.accountId || null,

      type: category.type || "Expense",

      // Null is meaningful: it means "not chosen", and the plan derives a
      // starting group from `type` rather than guessing here.
      group: category.group || null,

      icon: category.icon || "📦",

      color: category.color || "#6366F1",

      spent: Number(category.spent || 0),
    }));

    const existingBudget = await Budget.findById(req.params.id);

    if (!existingBudget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const period = parseMonthLabel(req.body.month || existingBudget.month);

    const estimatedIncome = await sumBudgetableIncome(
      existingBudget.userId,
      period.month,
      period.year,
    );

    const updatedBudget = await Budget.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        monthKey: monthKeyFromParts(period),
        totalBudget: Number(totalBudget),
        estimatedIncome,
        categories: cleanedCategories,
      },
      {
        new: true,
      },
    );

    res.json({
      success: true,
      data: updatedBudget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    await Budget.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// What the budget for a given month may be planned against. The client uses
// this to prefill the total and to warn when allocations run past income.
export const getBudgetPlanning = async (req, res) => {
  try {
    const { userId } = req.params;

    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const income = await getBudgetableIncomeBreakdown(userId, month, year);

    res.json({
      success: true,
      data: {
        period: { month, year },
        income,
        // Suggested, not enforced - planning ahead of recorded income is
        // legitimate, so the client warns rather than blocks.
        suggestedTotalBudget: income.budgetable,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Spells out what a budget deletion removes so the confirmation can be
// specific about it.
export const getBudgetDeleteImpact = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    res.json({
      success: true,
      data: {
        month: budget.month,
        totalBudget: budget.totalBudget,
        categoryCount: budget.categories?.length || 0,
        categories: (budget.categories || []).map((category) => ({
          name: category.name,
          limit: category.limit,
          spent: category.spent,
        })),
        // Expenses are their own records - deleting a budget only removes
        // the plan, never the spending history.
        spentTracked: (budget.categories || []).reduce(
          (total, category) => total + Number(category.spent || 0),
          0,
        ),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================================================
// CURRENT MONTH
// =========================================================================

// The budget for a given month, not merely the newest one. Budgets carry a
// monthKey now; older rows do not, so the label is parsed as a fallback and
// the key backfilled on the way past.
export const findBudgetForMonth = async (userId, key) => {
  const direct = await Budget.findOne({ userId, monthKey: key });

  if (direct) return direct;

  const all = await Budget.find({ userId }).sort({ createdAt: -1 });

  const match = all.find((budget) => keyForBudget(budget) === key);

  if (match && !match.monthKey) {
    match.monthKey = key;

    await match.save();
  }

  return match || null;
};

export const getBudgetOverview = async (req, res) => {
  try {
    const { userId } = req.params;

    const now = new Date();

    const key = req.query.month || monthKeyOf(now);

    const [year, month] = key.split("-").map(Number);

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const budget = await findBudgetForMonth(userId, key);

    const accounts = await Account.find({ userId });

    // Spending comes from the ledger, so a split share counts and a card
    // payment does not - settling a card moves money to clear a purchase
    // that was already counted when it was made.
    const entries = (
      await Promise.all(accounts.map((account) => collectEntries(account)))
    ).flat();

    const spendRows = entries.filter((entry) => {
      const date = new Date(entry.date);

      return SPEND_KINDS.has(entry.kind) && date >= from && date <= to;
    });

    // Only this month's plan can be measured against this month's cash: a
    // past month's balances are gone, and a future month's have not happened.
    const currentKey = monthKeyOf(now);

    const isCurrentMonth = key === currentKey;
    const isPast = key < currentKey;
    const isFuture = key > currentKey;

    let safeToSpend = null;

    if (isCurrentMonth) {
      const [obligations, decoratedSchedules] = await Promise.all([
        Obligation.find({ userId }),
        loadDecoratedSchedules(userId, startOfDay(now)),
      ]);

      const cash = buildSpendable({
        accounts,
        upcomingBills: collectUpcomingSchedules(
          decoratedSchedules.filter((item) => item.isActive),
          startOfDay(now),
          to,
        ),
        obligations: obligations.map((item) => decorateObligation(item, now)),
        horizon: to,
      });

      safeToSpend = cash.safeToSpend;
    }

    const plan = buildBudgetPlan({ budget, spendRows, safeToSpend });

    // The month before this one, so a month with no plan yet can be started
    // from the last one rather than from an empty form.
    const previousKey = monthKeyOf(new Date(year, month - 2, 1));

    const previous = await findBudgetForMonth(userId, previousKey);

    res.json({
      success: true,
      data: {
        ...plan,
        monthKey: key,
        month: budget?.month || monthLabelOf(from),
        isCurrentMonth,
        isPast,
        isFuture,
        hasBudget: Boolean(budget),

        previousMonth: previous
          ? {
              monthKey: previousKey,
              month: previous.month,
              totalBudget: Number(previous.totalBudget || 0),
              allocationRule: previous.allocationRule || undefined,
              categories: (previous.categories || []).map((category) => ({
                name: category.name,
                limit: Number(category.limit || 0),
                group: category.group || null,
                type: category.type || "Expense",
                accountId: category.accountId || null,
              })),
            }
          : null,
        budgetId: budget?._id || null,
        estimatedIncome: budget?.estimatedIncome || 0,
        dailyLimit: budget?.dailyLimit || 0,
        weeklyLimit: budget?.weeklyLimit || 0,
        proposal: proposeFitToCash(plan),

        // What each account has to hold for the plan to be fundable, and
        // where a shortfall could come from. Only meaningful for a month
        // still to be spent - a finished month's balances have moved on.
        bankFunding: isPast
          ? null
          : buildAccountRequirements({
              categories: plan.categories,
              accounts,
              isCashType,
            }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Every month that has a plan, newest first, plus the current month and the
// next one so the navigator can always offer "this month" and "plan ahead"
// even before a budget exists for them.
export const getBudgetMonths = async (req, res) => {
  try {
    const { userId } = req.params;

    const budgets = await Budget.find({ userId }).sort({ createdAt: -1 });

    const now = new Date();

    const currentKey = monthKeyOf(now);

    const nextKey = monthKeyOf(
      new Date(now.getFullYear(), now.getMonth() + 1, 1),
    );

    const seen = new Map();

    for (const budget of budgets) {
      const key = keyForBudget(budget);

      // A budget whose month cannot be read is not silently filed under some
      // other month; it is simply not offered as one.
      if (!key || seen.has(key)) continue;

      seen.set(key, {
        monthKey: key,
        month: budget.month,
        totalBudget: Number(budget.totalBudget || 0),
        categoryCount: (budget.categories || []).length,
        hasBudget: true,
      });
    }

    for (const key of [currentKey, nextKey]) {
      if (seen.has(key)) continue;

      const [year, month] = key.split("-").map(Number);

      seen.set(key, {
        monthKey: key,
        month: monthLabelOf(new Date(year, month - 1, 1)),
        totalBudget: 0,
        categoryCount: 0,
        hasBudget: false,
      });
    }

    const months = [...seen.values()].sort((a, b) =>
      a.monthKey < b.monthKey ? 1 : -1,
    );

    res.json({
      success: true,
      data: { months, currentKey, nextKey },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
