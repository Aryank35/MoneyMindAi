import api from "../config/api";

export const getTransfersByUser = async (userId) => {
  const response = await api.get(`/transfers/user/${userId}`);

  return response.data;
};

export const createTransfer = async (transferData) => {
  const response = await api.post("/transfers", transferData);

  return response.data;
};

export const deleteTransfer = async (id) => {
  const response = await api.delete(`/transfers/${id}`);

  return response.data;
};
