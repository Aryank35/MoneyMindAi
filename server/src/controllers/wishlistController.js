import Wishlist from "../models/Wishlist.js";

export const createWishlist =
  async (req, res) => {
    try {
      const wishlist =
        await Wishlist.create(
          req.body
        );

      res.status(201).json({
        success: true,
        data: wishlist,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

export const getWishlistByUser =
  async (req, res) => {
    try {
      const wishlist =
        await Wishlist.find({
          userId:
            req.params.userId,
        });

      res.json({
        success: true,
        data: wishlist,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

export const updateWishlist =
  async (req, res) => {
    try {
      const wishlist =
        await Wishlist.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,
          }
        );

      res.json({
        success: true,
        data: wishlist,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

export const deleteWishlist =
  async (req, res) => {
    try {
      await Wishlist.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true,
        message:
          "Wishlist item deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };