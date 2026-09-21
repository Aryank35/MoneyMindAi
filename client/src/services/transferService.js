import api from "../config/api";

export const getTransfersByUser = async (userId) => {
  const response = await api.get(`/transfers/user/${userId}`);

  return response.data;
};

export const createTransfer = async (transferData) => {
  const response = await api.post("/transfers", transferData);

  return response.data;
};

// Reverses the original movement in full and applies the new one, so
// changing the accounts - not just the amount - lands correctly.
export const updateTransfer = async (id, data) => {
  const response = await api.put(`/transfers/${id}`, data);

  return response.data;
};

export const deleteTransfer = async (id) => {
  const response = await api.delete(`/transfers/${id}`);

  return response.data;
};
