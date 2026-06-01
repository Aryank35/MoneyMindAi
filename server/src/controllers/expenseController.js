import Expense from "../models/Expense.js";

const validateExpense = ({ category, amount }) => {
  if (!category?.trim()) {
    return "Category is required";
  }

  if (Number(amount) <= 0) {
    return "Amount must be greater than 0";
  }

  return null;
};

export const createExpense = async (req, res) => {
  try {

    const expense = await Expense.create(req.body);

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Expense Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getExpensesByUser = async (req, res) => {
  try {
    const expenses = await Expense.find({
      userId: req.params.userId,
    }).sort({
      expenseDate: -1,
    });

    res.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { category, amount } = req.body;

    const validationError = validateExpense({
      category,
      amount,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,

        category: category.trim(),

        amount: Number(amount),

        note: req.body.note?.trim() || "",
      },
      {
        new: true,
      },
    );

    res.json({
      success: true,
      data: updatedExpense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
