import api from "./api";

export const getBudgetByUser = async (userId) => {
  const response = await api.get(
    `/budget/user/${userId}`
  );

  return response.data;
};

export const createBudget = async (budgetData) => {
  const response = await api.post(
    "/budget",
    budgetData
  );

  return response.data;
};

export const updateBudget = async (id, budgetData) => {
  const response = await api.put(
    `/budget/${id}`,
    budgetData
  );

  return response.data;
};

// Budgetable income for a month - the figure the planner builds on.
export const getBudgetPlanning = async (userId, { month, year } = {}) => {
  const query = month && year ? `?month=${month}&year=${year}` : "";

  const response = await api.get(`/budget/planning/${userId}${query}`);

  return response.data;
};

export const getBudgetDeleteImpact = async (id) => {
  const response = await api.get(`/budget/${id}/delete-impact`);

  return response.data;
};

export const deleteBudget = async (id) => {
  const response = await api.delete(
    `/budget/${id}`
  );

  return response.data;
};
// This month's plan measured against what actually happened: per-category
// spend and overspend, anything spent outside the plan, the need/want/save
// split, and whether the plan is backed by real cash.
export const getBudgetOverview = async (userId, monthKey) => {
  const query = monthKey ? `?month=${monthKey}` : "";

  const response = await api.get(`/budget/overview/${userId}${query}`);

  return response.data;
};

// Months that have a plan, plus the current and next month so planning ahead
// is always one tap away.
export const getBudgetMonths = async (userId) => {
  const response = await api.get(`/budget/months/${userId}`);

  return response.data;
};
