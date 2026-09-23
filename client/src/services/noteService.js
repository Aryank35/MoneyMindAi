import api from "../config/api";

// Notes and to-dos share one endpoint: they are one collection distinguished
// by `kind`, so an item can be flipped between the two without being deleted
// and retyped.
export const getNotes = async (userId) => {
  const response = await api.get(`/notes/user/${userId}`);

  return response.data;
};

export const createNote = async (data) => {
  const response = await api.post("/notes", data);

  return response.data;
};

export const updateNote = async (id, data) => {
  const response = await api.put(`/notes/${id}`, data);

  return response.data;
};

export const deleteNote = async (id) => {
  const response = await api.delete(`/notes/${id}`);

  return response.data;
};

// Removes every finished to-do in one go.
export const clearDoneNotes = async (userId) => {
  const response = await api.post("/notes/clear-done", { userId });

  return response.data;
};

// The whole list in its new order; a partial one would interleave with the
// positions it left behind.
export const reorderNotes = async (userId, order) => {
  const response = await api.put("/notes/reorder", { userId, order });

  return response.data;
};
