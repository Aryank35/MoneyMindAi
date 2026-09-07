import api from "../config/api";

export const getObligationOverview = async (userId) => {
  const response = await api.get(`/obligations/overview/${userId}`);

  return response.data;
};

export const createObligation = async (data) => {
  const response = await api.post("/obligations", data);

  return response.data;
};

export const updateObligation = async (id, data) => {
  const response = await api.put(`/obligations/${id}`, data);

  return response.data;
};

// Records a repayment and moves the money the right way for the direction.
export const settleObligation = async (id, body = {}) => {
  const response = await api.post(`/obligations/${id}/settle`, body);

  return response.data;
};

export const undoSettlement = async (id) => {
  const response = await api.post(`/obligations/${id}/undo-settlement`, {});

  return response.data;
};

export const getObligationDeleteImpact = async (id) => {
  const response = await api.get(`/obligations/${id}/delete-impact`);

  return response.data;
};

export const deleteObligation = async (id) => {
  const response = await api.delete(`/obligations/${id}`);

  return response.data;
};
