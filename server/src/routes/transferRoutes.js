import express from "express";

import {
  createTransfer,
  getTransfersByUser,
  updateTransfer,
  deleteTransfer,
} from "../controllers/transferController.js";

const router = express.Router();

router.post("/", createTransfer);

router.get("/user/:userId", getTransfersByUser);

router.put("/:id", updateTransfer);

router.delete("/:id", deleteTransfer);

export default router;
