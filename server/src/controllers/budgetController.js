import Budget from "../models/Budget.js";

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
    }));

    const budget = await Budget.create({
      userId,
      month,
      totalBudget: Number(totalBudget),
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
    }));

    const updatedBudget = await Budget.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        totalBudget: Number(totalBudget),
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
