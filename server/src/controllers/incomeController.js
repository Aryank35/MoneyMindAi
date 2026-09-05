import Income from "../models/Income.js";
import Account from "../models/Account.js";
import {
  INCOME_SOURCES,
  computeIncomeTotals,
  getIncomeSource,
} from "../config/incomeSources.js";

// =========================================================================
// HELPERS
// =========================================================================

const findFlaggedAccount = (userId, flag) =>
  Account.findOne({ userId, [flag]: true });

// Every balance change goes through here so credits and their reversals
// can never drift apart.
const applyBalanceDelta = async (accountId, delta) => {
  if (!accountId || !delta) return;

  await Account.findByIdAndUpdate(accountId, {
    $inc: { balance: delta },
  });
};

// Salary entries fall back to the user's designated salary account so the
// income page stays linked to it even when the form doesn't send one.
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

  if (body.sourceKey === "salary" && body.userId) {
    const salaryAccount = await findFlaggedAccount(
      body.userId,
      "isSalaryAccount",
    );

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

// Turns a request body into the stored shape. All money figures are derived
// from the registry here rather than taken from the client, so a tampered or
// stale form can't write a credit that doesn't match its own inputs.
const buildIncomePayload = (body, source) => {
  const totals = computeIncomeTotals(source, body.fields || {});

  const includeInBudget = source.canToggleBudget
    ? body.includeInBudget !== false
    : source.includeInBudgetDefault;

  const date = body.incomeDate ? new Date(body.incomeDate) : new Date();

  return {
    sourceKey: source.key,
    fields: totals.fields,
    creditedAmount: totals.creditedAmount,
    epfAmount: totals.epfAmount,
    includeInBudget,
    budgetableAmount: includeInBudget ? totals.budgetableAmount : 0,
    // Kept in step with creditedAmount for the Dashboard and Analytics pages.
    amount: totals.creditedAmount,
    incomeDate: date,
    periodMonth: Number(body.periodMonth) || date.getMonth() + 1,
    periodYear: Number(body.periodYear) || date.getFullYear(),
    paymentMode: body.paymentMode || "Bank Transfer",
    isRecurring: Boolean(body.isRecurring),
    recurringType: body.isRecurring ? body.recurringType : undefined,
    payer: body.payer?.trim() || "",
    note: body.note?.trim() || "",
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
  };
};

const validateIncomeBody = (body, source) => {
  if (!source) {
    return `Unknown income source: ${body.sourceKey}`;
  }

  for (const field of source.fields) {
    if (field.required && !(Number(body.fields?.[field.key]) > 0)) {
      return `${field.label} is required and must be greater than 0`;
    }
  }

  return null;
};

// =========================================================================
// SOURCE REGISTRY
// =========================================================================

// The client builds its entire income form from this, so a new source type
// needs no client-side change.
export const getIncomeSourceCatalog = (req, res) => {
  res.json({
    success: true,
    data: INCOME_SOURCES,
  });
};

// =========================================================================
// CRUD
// =========================================================================

export const createIncome = async (req, res) => {
  try {
    const source = getIncomeSource(req.body.sourceKey);

    const validationError = validateIncomeBody(req.body, source);

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

    const payload = buildIncomePayload(req.body, source);

    if (payload.creditedAmount <= 0 && payload.epfAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "This entry credits nothing - check the amounts entered",
      });
    }

    const epfAccount =
      payload.epfAmount > 0
        ? await findFlaggedAccount(req.body.userId, "isEpfAccount")
        : null;

    const income = await Income.create({
      ...payload,
      userId: req.body.userId,
      accountId: account._id,
      epfAccountId: epfAccount?._id || null,
    });

    await applyBalanceDelta(account._id, payload.creditedAmount);
    await applyBalanceDelta(epfAccount?._id, payload.epfAmount);

    res.status(201).json({
      success: true,
      data: income,
      // Surfaced so the client can nudge the user to link an EPF account
      // rather than silently dropping the contribution.
      warning:
        payload.epfAmount > 0 && !epfAccount
          ? "EPF was recorded on the entry but no EPF account is linked, so no balance was credited."
          : undefined,
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
    const existingIncome = await Income.findById(req.params.id);

    if (!existingIncome) {
      return res.status(404).json({
        success: false,
        message: "Income not found",
      });
    }

    const source = getIncomeSource(
      req.body.sourceKey || existingIncome.sourceKey,
    );

    const validationError = validateIncomeBody(req.body, source);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const userId = req.body.userId || existingIncome.userId;

    const {
      account: newAccount,
      error,
      status,
    } = await resolveIncomeAccount({ ...req.body, userId });

    if (error) {
      return res.status(status).json({
        success: false,
        message: error,
      });
    }

    const payload = buildIncomePayload(req.body, source);

    const epfAccount =
      payload.epfAmount > 0
        ? await findFlaggedAccount(userId, "isEpfAccount")
        : null;

    // Back out the old credits before applying the new ones. Doing it as two
    // independent deltas keeps the account-change case correct without
    // special-casing it.
    await applyBalanceDelta(
      existingIncome.accountId,
      -Number(existingIncome.creditedAmount || 0),
    );
    await applyBalanceDelta(
      existingIncome.epfAccountId,
      -Number(existingIncome.epfAmount || 0),
    );

    await applyBalanceDelta(newAccount._id, payload.creditedAmount);
    await applyBalanceDelta(epfAccount?._id, payload.epfAmount);

    existingIncome.set({
      ...payload,
      accountId: newAccount._id,
      epfAccountId: epfAccount?._id || null,
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

// Reports what deleting this entry will undo, so the confirmation can spell
// out the consequence instead of asking "are you sure?" about nothing.
export const getIncomeDeleteImpact = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: "Income not found",
      });
    }

    const [account, epfAccount] = await Promise.all([
      Account.findById(income.accountId),
      income.epfAccountId ? Account.findById(income.epfAccountId) : null,
    ]);

    const source = getIncomeSource(income.sourceKey);

    res.json({
      success: true,
      data: {
        sourceLabel: source?.label || income.sourceKey,
        creditedAmount: income.creditedAmount,
        epfAmount: income.epfAmount,
        budgetableAmount: income.budgetableAmount,
        account: account
          ? {
              name: account.name,
              balance: account.balance,
              balanceAfter:
                account.balance - Number(income.creditedAmount || 0),
            }
          : null,
        epfAccount: epfAccount
          ? {
              name: epfAccount.name,
              balance: epfAccount.balance,
              balanceAfter:
                epfAccount.balance - Number(income.epfAmount || 0),
            }
          : null,
      },
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

    await applyBalanceDelta(
      income.accountId,
      -Number(income.creditedAmount || 0),
    );
    await applyBalanceDelta(income.epfAccountId, -Number(income.epfAmount || 0));

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

// =========================================================================
// SUMMARY
// =========================================================================

// Budgetable income for one month. The budget planner is built on top of
// this, so it lives next to the rules that produce the figure.
export const sumBudgetableIncome = async (userId, month, year) => {
  const incomes = await Income.find({
    userId,
    includeInBudget: true,
    periodMonth: month,
    periodYear: year,
  });

  return incomes.reduce(
    (total, income) => total + Number(income.budgetableAmount || 0),
    0,
  );
};

export const getIncomeSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    const [incomes, accounts] = await Promise.all([
      Income.find({ userId }).sort({ incomeDate: -1 }),
      Account.find({ userId }),
    ]);

    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const inPeriod = (income) =>
      income.periodMonth === month && income.periodYear === year;

    const sum = (list, key) =>
      list.reduce((total, income) => total + Number(income[key] || 0), 0);

    const monthIncomes = incomes.filter(inPeriod);

    // One row per source that actually has entries, so the client never has
    // to know the registry to render a breakdown.
    const bySource = INCOME_SOURCES.map((source) => {
      const rows = incomes.filter((income) => income.sourceKey === source.key);
      const monthRows = rows.filter(inPeriod);

      return {
        key: source.key,
        label: source.label,
        icon: source.icon,
        count: rows.length,
        total: sum(rows, "creditedAmount"),
        monthTotal: sum(monthRows, "creditedAmount"),
        monthBudgetable: sum(monthRows, "budgetableAmount"),
      };
    }).filter((row) => row.count > 0);

    const byAccount = accounts.map((account) => {
      const rows = incomes.filter(
        (income) => String(income.accountId) === String(account._id),
      );

      return {
        accountId: account._id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        isSalaryAccount: account.isSalaryAccount,
        isEpfAccount: account.isEpfAccount,
        count: rows.length,
        total: sum(rows, "creditedAmount"),
      };
    });

    res.json({
      success: true,
      data: {
        period: { month, year },
        salaryAccount:
          accounts.find((account) => account.isSalaryAccount) || null,
        epfAccount: accounts.find((account) => account.isEpfAccount) || null,
        totals: {
          allTime: sum(incomes, "creditedAmount"),
          month: sum(monthIncomes, "creditedAmount"),
          // What the budget planner may spend against this month.
          monthBudgetable: sum(monthIncomes, "budgetableAmount"),
          monthExcluded:
            sum(monthIncomes, "creditedAmount") -
            sum(monthIncomes, "budgetableAmount"),
          epfAllTime: sum(incomes, "epfAmount"),
          epfMonth: sum(monthIncomes, "epfAmount"),
        },
        bySource,
        byAccount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Breakdown of one month's income for the budget planner: what came in, how
// much of it may be budgeted, and where it came from.
export const getBudgetableIncomeBreakdown = async (userId, month, year) => {
  const incomes = await Income.find({
    userId,
    periodMonth: month,
    periodYear: year,
  });

  const sum = (list, key) =>
    list.reduce((total, income) => total + Number(income[key] || 0), 0);

  return {
    received: sum(incomes, "creditedAmount"),
    budgetable: sum(incomes, "budgetableAmount"),
    excluded: sum(incomes, "creditedAmount") - sum(incomes, "budgetableAmount"),
    epf: sum(incomes, "epfAmount"),
    entryCount: incomes.length,
    bySource: INCOME_SOURCES.map((source) => {
      const rows = incomes.filter((income) => income.sourceKey === source.key);

      return {
        key: source.key,
        label: source.label,
        icon: source.icon,
        count: rows.length,
        received: sum(rows, "creditedAmount"),
        budgetable: sum(rows, "budgetableAmount"),
        // True when the user opted this source out of budget planning.
        excluded: rows.some((income) => !income.includeInBudget),
      };
    }).filter((row) => row.count > 0),
  };
};
