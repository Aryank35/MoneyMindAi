import api from "../config/api";

import { API_ENDPOINTS } from "../config/endpoints";

export const getExpensesByUser = async (userId) => {
  const response = await api.get(
    `${API_ENDPOINTS.EXPENSE.GET_BY_USER}/${userId}`,
  );

  return response.data;
};

export const createExpense = async (expenseData) => {
  const response = await api.post(API_ENDPOINTS.EXPENSE.CREATE, expenseData);

  return response.data;
};

export const updateExpense = async (id, expenseData) => {
  const response = await api.put(
    `${API_ENDPOINTS.EXPENSE.UPDATE}/${id}`,
    expenseData,
  );

  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await api.delete(`${API_ENDPOINTS.EXPENSE.DELETE}/${id}`);

  return response.data;
};
