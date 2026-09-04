import express from "express";

import {
  createTransfer,
  getTransfersByUser,
  deleteTransfer,
} from "../controllers/transferController.js";

const router = express.Router();

router.post("/", createTransfer);

router.get("/user/:userId", getTransfersByUser);

router.delete("/:id", deleteTransfer);

export default router;
