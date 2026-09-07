import Expense from "../models/Expense.js";
import Account from "../models/Account.js";
import { deductBalance, addBalance } from "../helpers/accountBalance.js";

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
    const validationError = validateExpense(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const expense = await Expense.create({
      ...req.body,
      amount: Number(req.body.amount),
    });

    if (req.body.accountId) {
      await deductBalance(req.body.accountId, req.body.amount);
    }

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

    const existingExpense = await Expense.findById(req.params.id);

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Reverse the old charge and apply the new one as two independent
    // movements. Adjusting the old account in place was wrong the moment the
    // account changed: it refunded and re-charged the same account while the
    // newly chosen one was never debited at all.
    const nextAccountId = req.body.accountId ?? existingExpense.accountId;

    await addBalance(existingExpense.accountId, existingExpense.amount);

    await deductBalance(nextAccountId, amount);

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        accountId: nextAccountId,
        amount: Number(amount),
      },
      { returnDocument: "after" },
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
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (expense.accountId) {
      const account = await Account.findById(expense.accountId);

      if (account) {
        account.balance += Number(expense.amount);

        await account.save();
      }
    }

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
