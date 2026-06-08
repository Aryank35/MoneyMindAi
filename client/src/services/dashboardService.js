import { getBudgetByUser } from "./budgetService";
import { getExpensesByUser } from "./expenseService";
import { getIncomesByUser } from "./incomeService";
import { getAccountsByUser } from "./accountService";

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

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  const totalIncome = incomes.reduce(
    (sum, income) => sum + Number(income.amount),
    0,
  );

  const totalBudget = budget?.totalBudget || 0;

  const remainingBudget = totalBudget - totalExpenses;

  return {
    totalBudget,
    totalExpenses,
    totalIncome,
    remainingBudget,

    dailyLimit: budget?.dailyLimit || 0,
    weeklyLimit: budget?.weeklyLimit || 0,

    expenses,
    incomes,
    accounts,

    budget,
  };
};
