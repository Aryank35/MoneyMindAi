import api from "../config/api";

export const getAccountsByUser = async (userId) => {
  const response = await api.get(`/accounts/user/${userId}`);

  return response.data;
};

export const createAccount = async (accountData) => {
  const response = await api.post("/accounts", accountData);

  return response.data;
};

export const updateAccount = async (id, data) => {
  const response = await api.put(`/accounts/${id}`, data);

  return response.data;
};

export const deleteAccount = async (id) => {
  const response = await api.delete(`/accounts/${id}`);

  return response.data;
};
