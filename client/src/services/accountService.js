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

// Claims or releases an exclusive role ("isSalaryAccount" / "isEpfAccount").
// Claiming one another account already holds is refused by the server.
export const setAccountRole = async (id, role, value) => {
  const response = await api.put(`/accounts/${id}`, {
    [role]: value,
  });

  return response.data;
};

// Every credit card with its dues, cycle and utilisation worked out.
export const getCardsOverview = async (userId) => {
  const response = await api.get(`/accounts/cards/${userId}`);

  return response.data;
};

// Ledger for one account over a period, with a running balance.
export const getAccountStatement = async (id, { from, to } = {}) => {
  const query = from && to ? `?from=${from}&to=${to}` : "";

  const response = await api.get(`/accounts/${id}/statement${query}`);

  return response.data;
};

// Every movement across every account - what the transactions view shows.
export const getUserTransactions = async (userId, { from, to } = {}) => {
  const query = from && to ? `?from=${from}&to=${to}` : "";

  const response = await api.get(`/accounts/transactions/${userId}${query}`);

  return response.data;
};

// What deleting this account leaves behind - shown in the confirmation.
export const getAccountDeleteImpact = async (id) => {
  const response = await api.get(`/accounts/${id}/delete-impact`);

  return response.data;
};

export const deleteAccount = async (id) => {
  const response = await api.delete(`/accounts/${id}`);

  return response.data;
};
