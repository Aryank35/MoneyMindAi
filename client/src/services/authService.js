import api from "../config/api";

import { API_ENDPOINTS } from "../config/endpoints";

export const loginUser = async (data) => {
  const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, data);

  return response.data;
};

export const registerUser = async (data) => {
  const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, data);

  return response.data;
};
