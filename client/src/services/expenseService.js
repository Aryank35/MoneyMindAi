import api from "./api";

export const getExpenses = (
  userId
) => api.get(
  `/expenses/user/${userId}`
);

export const createExpense = (
  data
) => api.post(
  "/expenses",
  data
);

export const deleteExpense = (
  id
) => api.delete(
  `/expenses/${id}`
);