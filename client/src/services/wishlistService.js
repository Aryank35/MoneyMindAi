import api from "./api";

export const getWishlistByUser =
  async (userId) => {
    const response =
      await api.get(
        `/wishlist/user/${userId}`
      );

    return response.data;
  };

export const createWishlist =
  async (data) => {
    const response =
      await api.post(
        "/wishlist",
        data
      );

    return response.data;
  };

export const updateWishlist =
  async (id, data) => {
    const response =
      await api.put(
        `/wishlist/${id}`,
        data
      );

    return response.data;
  };

export const deleteWishlist =
  async (id) => {
    const response =
      await api.delete(
        `/wishlist/${id}`
      );

    return response.data;
  };