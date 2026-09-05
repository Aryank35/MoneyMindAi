import Income from "../models/Income.js";
import Account from "../models/Account.js";

const isSalaryEntry = ({ source, category }) =>
  source === "Salary" || category === "Salary";

const validateIncome = ({ source, amount }) => {
  if (!source?.trim()) {
    return "Source is required";
  }

  if (Number(amount) <= 0) {
    return "Amount must be greater than 0";
  }

  return null;
};

export const findSalaryAccount = (userId) =>
  Account.findOne({
    userId,
    isSalaryAccount: true,
  });

// Salary entries fall back to the user's designated salary account so the
// income page stays linked to it even when the form doesn't send an account.
const resolveIncomeAccount = async (body) => {
  if (body.accountId) {
    const account = await Account.findById(body.accountId);

    if (!account) {
      return { error: "Account not found", status: 404 };
    }

    if (body.userId && String(account.userId) !== String(body.userId)) {
      return { error: "Account does not belong to this user", status: 403 };
    }

    return { account };
  }

  if (isSalaryEntry(body) && body.userId) {
    const salaryAccount = await findSalaryAccount(body.userId);

    if (salaryAccount) {
      return { account: salaryAccount };
    }

    return {
      error:
        "No salary account is linked yet. Set one from the Accounts page or pick an account.",
      status: 400,
    };
  }

  return { error: "Account is required", status: 400 };
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

    const { account, error, status } = await resolveIncomeAccount(req.body);

    if (error) {
      return res.status(status).json({
        success: false,
        message: error,
      });
    }

    const income = await Income.create({
      ...req.body,
      accountId: account._id,
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
    const { source, amount } = req.body;

    const validationError = validateIncome({
      source,
      amount,
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

    const {
      account: newAccount,
      error,
      status,
    } = await resolveIncomeAccount({
      ...req.body,
      userId: req.body.userId || existingIncome.userId,
    });

    if (error) {
      return res.status(status).json({
        success: false,
        message: error,
      });
    }

    const oldAccountId = String(existingIncome.accountId);
    const newAccountId = String(newAccount._id);
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
      accountId: newAccount._id,
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

// Per-account rollup used by the income page to show how the linked salary
// account is actually being fed. `amount` is the figure that hits the account
// balance, so the summary and the account cards can never disagree.
export const getIncomeSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    const [incomes, accounts] = await Promise.all([
      Income.find({ userId }).sort({ incomeDate: -1 }),
      Account.find({ userId }),
    ]);

    const now = new Date();
    const isThisMonth = (date) => {
      const value = new Date(date);

      return (
        value.getMonth() === now.getMonth() &&
        value.getFullYear() === now.getFullYear()
      );
    };

    const credited = (income) => Number(income.amount || 0);

    const salaryIncomes = incomes.filter(isSalaryEntry);

    const total = incomes.reduce((sum, income) => sum + credited(income), 0);
    const salaryTotal = salaryIncomes.reduce(
      (sum, income) => sum + credited(income),
      0,
    );

    const byAccount = accounts.map((account) => {
      const accountIncomes = incomes.filter(
        (income) => String(income.accountId) === String(account._id),
      );

      return {
        accountId: account._id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        isSalaryAccount: account.isSalaryAccount,
        count: accountIncomes.length,
        total: accountIncomes.reduce((sum, income) => sum + credited(income), 0),
        salaryTotal: accountIncomes
          .filter(isSalaryEntry)
          .reduce((sum, income) => sum + credited(income), 0),
      };
    });

    const salaryAccount = accounts.find((account) => account.isSalaryAccount);
    const lastSalary = salaryIncomes[0] || null;

    const nextExpectedSalaryDate = lastSalary?.incomeDate
      ? new Date(
          now.getFullYear(),
          now.getMonth() +
            (now.getDate() >= new Date(lastSalary.incomeDate).getDate() ? 1 : 0),
          new Date(lastSalary.incomeDate).getDate(),
        )
      : null;

    res.json({
      success: true,
      data: {
        salaryAccount: salaryAccount || null,
        totals: {
          total,
          salaryTotal,
          thisMonth: incomes
            .filter((income) => isThisMonth(income.incomeDate))
            .reduce((sum, income) => sum + credited(income), 0),
          salaryThisMonth: salaryIncomes
            .filter((income) => isThisMonth(income.incomeDate))
            .reduce((sum, income) => sum + credited(income), 0),
          salaryDependency: total ? Math.round((salaryTotal / total) * 100) : 0,
        },
        byAccount,
        lastSalary,
        nextExpectedSalaryDate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
