import Budget from "../models/Budget.js";
import {
  sumBudgetableIncome,
  getBudgetableIncomeBreakdown,
} from "./incomeController.js";

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
