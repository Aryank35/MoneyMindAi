import express from "express";

import {
  createWishlist,
  getWishlistByUser,
  getWishlistOverview,
  updateWishlist,
  fundWishlist,
  withdrawFromWishlist,
  getWishlistDeleteImpact,
  deleteWishlist,
} from "../controllers/wishlistController.js";

const router = express.Router();

router.get("/overview/:userId", getWishlistOverview);

router.get("/user/:userId", getWishlistByUser);

router.post("/", createWishlist);

router.get("/:id/delete-impact", getWishlistDeleteImpact);

// Real money movements: fund debits an account, withdraw credits one.
router.post("/:id/fund", fundWishlist);

router.post("/:id/withdraw", withdrawFromWishlist);

router.put("/:id", updateWishlist);

router.delete("/:id", deleteWishlist);

export default router;
