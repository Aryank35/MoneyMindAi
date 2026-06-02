import { getExpensesByUser } from "./expenseService";

import { getBudgetByUser } from "./budgetService";

export const getDashboardData = async (userId) => {
  const expenseResponse = await getExpensesByUser(userId);

  const budgetResponse = await getBudgetByUser(userId);

  const expenses = expenseResponse.data || [];

  const budget = budgetResponse.data?.[0] || null;

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const totalBudget = budget?.totalBudget || 0;

  const remainingBudget = totalBudget - totalExpenses;

  const totalIncome = incomes.reduce(
    (sum, income) =>
      sum + income.amount,
    0
  );

  return {
    totalBudget,

    totalExpenses,

    totalIncome,

    remainingBudget,

    dailyLimit:
      budget?.dailyLimit || 0,

    weeklyLimit:
      budget?.weeklyLimit || 0,

    expenses,

    budget,
  };
};
