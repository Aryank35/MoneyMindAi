import api from "./api";

export const getPlansByUser = async (userId) => {
  const response = await api.get(`/plans/user/${userId}`);

  return response.data;
};

export const getPlanSummary = async (userId) => {
  const response = await api.get(`/plans/summary/${userId}`);

  return response.data;
};

export const createPlan = async (planData) => {
  const response = await api.post("/plans", planData);

  return response.data;
};

export const updatePlan = async (id, planData) => {
  const response = await api.put(`/plans/${id}`, planData);

  return response.data;
};

export const contributeToPlan = async (id, contributionData) => {
  const response = await api.patch(`/plans/${id}/contribute`, contributionData);

  return response.data;
};

export const completePlan = async (id) => {
  const response = await api.patch(`/plans/${id}/complete`);

  return response.data;
};

export const deletePlan = async (id) => {
  const response = await api.delete(`/plans/${id}`);

  return response.data;
};
