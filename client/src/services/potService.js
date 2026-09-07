import api from "../config/api";

// Pots are stored in the wishlist collection - a goal and an emergency fund
// are the same container, so the existing endpoints were extended rather
// than duplicated.
export const getPotOverview = async (userId) => {
  const response = await api.get(`/wishlist/overview/${userId}`);

  return response.data;
};

export const getPots = async (userId) => {
  const response = await api.get(`/wishlist/user/${userId}`);

  return response.data;
};

export const createPot = async (data) => {
  const response = await api.post("/wishlist", data);

  return response.data;
};

export const updatePot = async (id, data) => {
  const response = await api.put(`/wishlist/${id}`, data);

  return response.data;
};

// Debits the chosen account and credits the pot.
export const fundPot = async (id, body) => {
  const response = await api.post(`/wishlist/${id}/fund`, body);

  return response.data;
};

export const withdrawFromPot = async (id, body) => {
  const response = await api.post(`/wishlist/${id}/withdraw`, body);

  return response.data;
};

export const getPotDeleteImpact = async (id) => {
  const response = await api.get(`/wishlist/${id}/delete-impact`);

  return response.data;
};

export const deletePot = async (id, refundAccountId) => {
  const response = await api.delete(`/wishlist/${id}`, {
    data: { refundAccountId },
  });

  return response.data;
};
