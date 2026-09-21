import api from "../config/api";

export const getEventOptions = async () => {
  const response = await api.get("/events/options");

  return response.data;
};

export const getEventOverview = async (userId) => {
  const response = await api.get(`/events/overview/${userId}`);

  return response.data;
};

export const getEventsByUser = async (userId) => {
  const response = await api.get(`/events/user/${userId}`);

  return response.data;
};

// Returns the event with its plan, tasks, notes, links, expenses, attachment
// metadata and the user's accounts - everything the detail page draws, in one
// request, so opening an event is a single round trip on a cold server.
export const getEvent = async (id) => {
  const response = await api.get(`/events/${id}`);

  return response.data;
};

export const createEvent = async (data) => {
  const response = await api.post("/events", data);

  return response.data;
};

export const updateEvent = async (id, data) => {
  const response = await api.put(`/events/${id}`, data);

  return response.data;
};

export const getEventDeleteImpact = async (id) => {
  const response = await api.get(`/events/${id}/delete-impact`);

  return response.data;
};

export const deleteEvent = async (id) => {
  const response = await api.delete(`/events/${id}`);

  return response.data;
};

// =========================================================================
// LISTS ON AN EVENT
//
// Plan lines, tasks, notes, links and the roster all go through the same
// three calls. Every one of them returns the whole recomputed event, so the
// page never has to guess what a change did to the totals.
// =========================================================================

export const addEventItem = async (eventId, collection, item) => {
  const response = await api.post(`/events/${eventId}/${collection}`, item);

  return response.data;
};

export const updateEventItem = async (eventId, collection, itemId, patch) => {
  const response = await api.put(
    `/events/${eventId}/${collection}/${itemId}`,
    patch,
  );

  return response.data;
};

export const removeEventItem = async (eventId, collection, itemId) => {
  const response = await api.delete(
    `/events/${eventId}/${collection}/${itemId}`,
  );

  return response.data;
};

export const seedEventChecklist = async (eventId, type) => {
  const response = await api.post(`/events/${eventId}/seed-checklist`, { type });

  return response.data;
};

// =========================================================================
// ATTACHMENTS
// =========================================================================

export const addEventAttachment = async (eventId, payload) => {
  const response = await api.post(`/events/${eventId}/attachments`, payload);

  return response.data;
};

// The list only ever carries thumbnails; this fetches the full-size copy for
// the lightbox, one file at a time.
export const getEventAttachment = async (attachmentId) => {
  const response = await api.get(`/events/attachments/${attachmentId}`);

  return response.data;
};

export const updateEventAttachment = async (attachmentId, patch) => {
  const response = await api.put(`/events/attachments/${attachmentId}`, patch);

  return response.data;
};

export const deleteEventAttachment = async (attachmentId) => {
  const response = await api.delete(`/events/attachments/${attachmentId}`);

  return response.data;
};
