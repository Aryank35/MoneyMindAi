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

// Applies the user's own ordering. Every list and dropdown reads accounts
// from the same endpoint, so this order shows up everywhere.
export const reorderAccounts = async (userId, order) => {
  const response = await api.put("/accounts/reorder", { userId, order });

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

// The cash side of "money left to spend": what the selected accounts hold,
// and what is already promised out of it. The budget side is combined by the
// caller, which already knows what counts as spending.
export const getSpendableSummary = async (userId) => {
  const response = await api.get(`/accounts/spendable/${userId}`);

  return response.data;
};

// Sent as the whole selection, so dropping an account actually turns it off.
export const setSpendableAccounts = async (userId, accountIds) => {
  const response = await api.put("/accounts/spendable", { userId, accountIds });

  return response.data;
};
