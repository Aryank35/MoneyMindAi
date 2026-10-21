import api from "../config/api";

// Everything dated for today or already past, across to-dos, the planner,
// lending and plans. There is no background job and nothing pushes, so this
// is read once when the app is opened.
export const getTodayAlerts = async (userId) => {
  const response = await api.get(`/alerts/today/${userId}`);

  return response.data;
};
