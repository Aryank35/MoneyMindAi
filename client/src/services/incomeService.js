import api from "../config/api";

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

export const getIncomeSummary = async (userId) => {
  return api.get(`/income/summary/${userId}`);
};

export const deleteIncome = async (id) => {
  const response = await api.delete(`/income/${id}`);

  return response.data;
};
