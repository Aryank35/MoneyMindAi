import Income from "../models/Income.js";
import Account from "../models/Account.js";

const validateIncome = ({ source, amount, accountId }) => {
  if (!source?.trim()) {
    return "Source is required";
  }

  if (Number(amount) <= 0) {
    return "Amount must be greater than 0";
  }

  if (!accountId) {
    return "Account is required";
  }

  return null;
};

export const createIncome = async (req, res) => {
  try {
    const validationError = validateIncome(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const account = await Account.findById(req.body.accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const income = await Income.create({
      ...req.body,
      source: req.body.source.trim(),
      amount: Number(req.body.amount),
      note: req.body.note?.trim() || "",
    });

    account.balance += Number(req.body.amount);

    await account.save();

    res.status(201).json({
      success: true,
      data: income,
    });
  } catch (error) {
    console.error("Income Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getIncomeByUser = async (req, res) => {
  try {
    const incomes = await Income.find({
      userId: req.params.userId,
    }).sort({
      incomeDate: -1,
    });

    res.json({
      success: true,
      data: incomes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateIncome = async (req, res) => {
  try {
    const { source, amount, accountId } = req.body;

    const validationError = validateIncome({
      source,
      amount,
      accountId,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const existingIncome = await Income.findById(req.params.id);

    if (!existingIncome) {
      return res.status(404).json({
        success: false,
        message: "Income not found",
      });
    }

    const newAccount = await Account.findById(accountId);

    if (!newAccount) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const oldAccountId = String(existingIncome.accountId);
    const newAccountId = String(accountId);
    const oldAmount = Number(existingIncome.amount || 0);
    const newAmount = Number(amount);

    if (oldAccountId === newAccountId) {
      newAccount.balance += newAmount - oldAmount;
      await newAccount.save();
    } else {
      const oldAccount = await Account.findById(existingIncome.accountId);

      if (oldAccount) {
        oldAccount.balance -= oldAmount;
        await oldAccount.save();
      }

      newAccount.balance += newAmount;
      await newAccount.save();
    }

    existingIncome.set({
      ...req.body,
      source: source.trim(),
      amount: newAmount,
      note: req.body.note?.trim() || "",
    });

    const updatedIncome = await existingIncome.save();

    res.json({
      success: true,
      data: updatedIncome,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteIncome = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: "Income not found",
      });
    }

    const account = await Account.findById(income.accountId);

    if (account) {
      account.balance -= income.amount;

      await account.save();
    }

    await income.deleteOne();

    res.json({
      success: true,
      message: "Income deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
