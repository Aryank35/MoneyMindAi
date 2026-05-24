import express from "express";

import {
  createWishlist,
  getWishlistByUser,
  updateWishlist,
  deleteWishlist,
} from "../controllers/wishlistController.js";

const router =
  express.Router();

router.post(
  "/",
  createWishlist
);

router.get(
  "/user/:userId",
  getWishlistByUser
);

router.put(
  "/:id",
  updateWishlist
);

router.delete(
  "/:id",
  deleteWishlist
);

export default router;