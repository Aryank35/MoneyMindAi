import api from "../config/api";

// The portfolio form, its charts and the quick "update value" action are all
// built from this catalog, so a type added on the server needs no client change.
export const getInvestmentTypes = async () => {
  const response = await api.get("/investments/types");

  return response.data;
};

export const getPortfolio = async (userId) => {
  const response = await api.get(`/investments/portfolio/${userId}`);

  return response.data;
};

export const getInvestmentsByUser = async (userId) => {
  const response = await api.get(`/investments/user/${userId}`);

  return response.data;
};

export const createInvestment = async (data) => {
  const response = await api.post("/investments", data);

  return response.data;
};

export const updateInvestment = async (id, data) => {
  const response = await api.put(`/investments/${id}`, data);

  return response.data;
};

// Refreshing a price touches one field rather than the whole holding.
export const updateInvestmentValue = async (id, value) => {
  const response = await api.patch(`/investments/${id}/value`, { value });

  return response.data;
};

export const getInvestmentDeleteImpact = async (id) => {
  const response = await api.get(`/investments/${id}/delete-impact`);

  return response.data;
};

export const deleteInvestment = async (id) => {
  const response = await api.delete(`/investments/${id}`);

  return response.data;
};
