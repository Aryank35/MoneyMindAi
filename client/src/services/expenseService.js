import api from "./api";

export const getExpensesByUser = async (
  userId
) => {
  const response = await api.get(
    `/expenses/user/${userId}`
  );

  return response.data;
};

export const createExpense = async (
  expenseData
) => {
  const response = await api.post(
    "/expenses",
    expenseData
  );

  return response.data;
};

export const updateExpense = async (
  id,
  expenseData
) => {
  const response = await api.put(
    `/expenses/${id}`,
    expenseData
  );

  return response.data;
};

export const deleteExpense = async (
  id
) => {
  const response = await api.delete(
    `/expenses/${id}`
  );

  return response.data;
};