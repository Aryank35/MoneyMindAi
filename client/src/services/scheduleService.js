import api from "../config/api";

// Cadence presets, schedule kinds and policy types all come from the server,
// so adding a cadence needs no client change.
export const getScheduleOptions = async () => {
  const response = await api.get("/schedules/options");

  return response.data;
};

export const getScheduleOverview = async (userId, days) => {
  const query = days ? `?days=${days}` : "";

  const response = await api.get(`/schedules/overview/${userId}${query}`);

  return response.data;
};

export const createSchedule = async (data) => {
  const response = await api.post("/schedules", data);

  return response.data;
};

export const updateSchedule = async (id, data) => {
  const response = await api.put(`/schedules/${id}`, data);

  return response.data;
};

// Writes a real expense and debits the linked account.
export const markSchedulePaid = async (id, body = {}) => {
  const response = await api.post(`/schedules/${id}/pay`, body);

  return response.data;
};

export const undoSchedulePayment = async (id) => {
  const response = await api.post(`/schedules/${id}/undo-payment`, {});

  return response.data;
};

export const getScheduleDeleteImpact = async (id) => {
  const response = await api.get(`/schedules/${id}/delete-impact`);

  return response.data;
};

export const deleteSchedule = async (id) => {
  const response = await api.delete(`/schedules/${id}`);

  return response.data;
};
