import api from "../config/api";

export const getSplitOptions = async () => {
  const response = await api.get("/splits/options");

  return response.data;
};

export const getSplitOverview = async (userId) => {
  const response = await api.get(`/splits/overview/${userId}`);

  return response.data;
};

export const createSplit = async (data) => {
  const response = await api.post("/splits", data);

  return response.data;
};

// Records a repayment. Moves the money and, when someone else fronted the
// bill, books the user's share as an expense at that point.
export const settleSplit = async (id, body) => {
  const response = await api.post(`/splits/${id}/settle`, body);

  return response.data;
};

// Re-applies the bill from scratch. Settlements already moved money, so
// they are kept and only re-checked against the new shares.
export const updateSplit = async (id, data) => {
  const response = await api.put(`/splits/${id}`, data);

  return response.data;
};

export const getSplitDeleteImpact = async (id) => {
  const response = await api.get(`/splits/${id}/delete-impact`);

  return response.data;
};

export const deleteSplit = async (id) => {
  const response = await api.delete(`/splits/${id}`);

  return response.data;
};
