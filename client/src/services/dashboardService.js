import { getBudgetByUser } from "./budgetService";
import { getExpensesByUser } from "./expenseService";
import { getIncomesByUser } from "./incomeService";
import { getAccountsByUser, getUserTransactions } from "./accountService";
import { getPotOverview } from "./potService";
import { getPortfolio } from "./investmentService";

// =========================================================================
// DASHBOARD DATA
//
// Two entry points on purpose:
//
//   getDashboardData     feeds the health score in the app shell, which every
//                        page mounts. Deliberately kept to four requests -
//                        making this heavier would slow down the whole app.
//   getDashboardOverview everything the Dashboard page itself draws. Built on
//                        the unified ledger (/accounts/transactions) so every
//                        kind of movement counts - card spends, transfers,
//                        pot funding, lending, splits - rather than only rows
//                        in the Expense collection.
// =========================================================================

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const isSameMonth = (value, reference) => {
  const date = new Date(value);

  return (
    date.getMonth() === reference.getMonth() &&
    date.getFullYear() === reference.getFullYear()
  );
};

const sum = (list, pick) =>
  list.reduce((total, item) => total + Number(pick(item) || 0), 0);

// A card balance runs negative as it is spent on, so net worth is the plain
// sum while assets and debt are its two sides stated separately.
const splitWorth = (accounts) => {
  const assets = accounts.filter((account) => Number(account.balance || 0) > 0);

  const debts = accounts.filter((account) => Number(account.balance || 0) < 0);

  return {
    netWorth: sum(accounts, (account) => account.balance),
    totalAssets: sum(assets, (account) => account.balance),
    totalDebt: Math.abs(sum(debts, (account) => account.balance)),
  };
};

export const getDashboardData = async (userId) => {
  const [expenseResponse, budgetResponse, incomeResponse, accountResponse] =
    await Promise.all([
      getExpensesByUser(userId),
      getBudgetByUser(userId),
      getIncomesByUser(userId),
      getAccountsByUser(userId),
    ]);

  const expenses = expenseResponse.data || [];
  const incomes = incomeResponse.data || [];
  const budget = budgetResponse.data?.[0] || null;
  const accounts = accountResponse.data || [];

  const now = new Date();

  // Month-scoped. These were all-time sums measured against a monthly budget,
  // so the health score sank for good months purely because history grew.
  const monthExpenses = expenses.filter((expense) =>
    isSameMonth(expense.expenseDate, now),
  );

  const monthIncomes = incomes.filter((income) =>
    isSameMonth(income.incomeDate, now),
  );

  const totalExpenses = sum(monthExpenses, (expense) => expense.amount);
  const totalIncome = sum(monthIncomes, (income) => income.amount);

  const totalBudget = budget?.totalBudget || 0;

  const { netWorth, totalAssets, totalDebt } = splitWorth(accounts);

  return {
    totalBudget,
    totalExpenses,
    totalIncome,
    remainingBudget: totalBudget - totalExpenses,

    // Both were read by the health score but never set, so it scored every
    // user as though they held nothing and saved nothing.
    totalAssets,
    totalDebt,
    netWorth,

    savingsRate:
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
        : 0,

    dailyLimit: budget?.dailyLimit || 0,
    weeklyLimit: budget?.weeklyLimit || 0,

    expenses,
    incomes,
    accounts,
    budget,
  };
};

export const getDashboardOverview = async (userId) => {
  const now = new Date();

  const from = startOfMonth(now).toISOString();
  const to = endOfMonth(now).toISOString();

  // Each source is allowed to fail on its own: a dashboard showing four of
  // five panels beats one showing an error because the portfolio was slow.
  const [
    accountsResult,
    budgetResult,
    ledgerResult,
    potsResult,
    portfolioResult,
  ] = await Promise.allSettled([
    getAccountsByUser(userId),
    getBudgetByUser(userId),
    getUserTransactions(userId, { from, to }),
    getPotOverview(userId),
    getPortfolio(userId),
  ]);

  const value = (result, fallback) =>
    result.status === "fulfilled" ? (result.value?.data ?? fallback) : fallback;

  const accounts = value(accountsResult, []) || [];
  const budget = (value(budgetResult, []) || [])[0] || null;
  const ledger = value(ledgerResult, null);
  const pots = value(potsResult, null)?.pots || [];
  const portfolio = value(portfolioResult, null);

  const transactions = ledger?.transactions || [];
  const totals = ledger?.totals || {};

  // Spending is money spent, not merely moved. The ledger already draws that
  // line: pot funding and lending leave an account without being spending,
  // and counting them would overstate every budget.
  const spending = Number(totals.spending || 0);

  const totalBudget = budget?.totalBudget || 0;

  const todayKey = new Date().toDateString();

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const spendRows = transactions.filter(
    (row) => row.kind === "expense" || row.kind === "split",
  );

  const todaySpent = Math.abs(
    sum(
      spendRows.filter((row) => new Date(row.date).toDateString() === todayKey),
      (row) => row.amount,
    ),
  );

  const weekSpent = Math.abs(
    sum(
      spendRows.filter((row) => new Date(row.date) >= weekStart),
      (row) => row.amount,
    ),
  );

  // Daily trend across the month so far, zero-filled: a gap in a bar chart
  // reads as missing data rather than as a day nothing was spent.
  const dayTotals = new Map();

  for (const row of spendRows) {
    const day = new Date(row.date).getDate();

    dayTotals.set(day, (dayTotals.get(day) || 0) + Math.abs(row.amount));
  }

  const spendByDay = Array.from(
    { length: now.getDate() },
    (_, index) => index + 1,
  ).map((day) => ({ day: String(day), amount: dayTotals.get(day) || 0 }));

  // An expense entry carries its category as the ledger label.
  const categoryTotals = new Map();

  for (const row of spendRows) {
    const key = row.label || "Other";

    categoryTotals.set(
      key,
      (categoryTotals.get(key) || 0) + Math.abs(row.amount),
    );
  }

  const spendByCategory = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // The real plan with what has actually gone through each line, replacing
  // the invented figures the allocation panel used to show.
  const budgetCategories = (budget?.categories || []).map((category) => {
    const spent = categoryTotals.get(category.name) || 0;

    const limit = Number(category.limit || 0);

    return {
      name: category.name,
      limit,
      spent,
      percent: limit > 0 ? Math.round((spent / limit) * 100) : 0,
    };
  });

  const inflow = Number(totals.inflow || 0);

  return {
    accounts,
    budget,
    pots,
    portfolio,

    ...splitWorth(accounts),

    month: {
      from,
      to,
      inflow,
      outflow: Number(totals.outflow || 0),
      net: Number(totals.net || 0),
      spending,
      count: Number(totals.count || 0),
      byKind: ledger?.byKind || [],
    },

    // Newest first already, straight off the ledger.
    transactions,
    recent: transactions.slice(0, 8),

    spendByDay,
    spendByCategory,
    budgetCategories,

    todaySpent,
    weekSpent,
    dailyLimit: budget?.dailyLimit || 0,
    weeklyLimit: budget?.weeklyLimit || 0,

    totalBudget,
    remainingBudget: totalBudget - spending,
    budgetUsed: totalBudget > 0 ? Math.round((spending / totalBudget) * 100) : 0,

    // Named for computeFinancialHealth, which reads the same shape from the
    // shell. Feeding it ledger figures means the score finally counts a card
    // spend or a split share the same way the rest of the page does.
    totalExpenses: spending,
    totalIncome: inflow,

    savingsRate:
      inflow > 0 ? Math.round(((inflow - spending) / inflow) * 100) : 0,

    // False means the ledger itself failed: the page may still show balances
    // but must not claim the month was empty.
    ledgerReady: ledgerResult.status === "fulfilled",
  };
};
