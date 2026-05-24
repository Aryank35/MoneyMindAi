import Budget from "../models/Budget.js";

export const createBudget = async (req, res) => {
  try {
    const budget = await Budget.create(req.body);

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
    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
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