import api from "../config/api";

// The income form is built from this catalog, so a source added on the
// server appears in the UI with no client change.
export const getIncomeSources = async () => {
  const response = await api.get("/income/sources");

  return response.data;
};

export const getIncomesByUser = async (userId) => {
  const response = await api.get(`/income/user/${userId}`);

  return response.data;
};

export const createIncome = async (incomeData) => {
  const response = await api.post("/income", incomeData);

  return response.data;
};

export const updateIncome = async (id, incomeData) => {
  const response = await api.put(`/income/${id}`, incomeData);

  return response.data;
};

export const getIncomeSummary = async (userId, { month, year } = {}) => {
  const query =
    month && year ? `?month=${month}&year=${year}` : "";

  const response = await api.get(`/income/summary/${userId}${query}`);

  return response.data;
};

// What deleting this entry will reverse - shown in the confirmation.
export const getIncomeDeleteImpact = async (id) => {
  const response = await api.get(`/income/${id}/delete-impact`);

  return response.data;
};

export const deleteIncome = async (id) => {
  const response = await api.delete(`/income/${id}`);

  return response.data;
};
