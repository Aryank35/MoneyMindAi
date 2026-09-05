import express from "express";

import {
  createAccount,
  getAccountsByUser,
  updateAccount,
  deleteAccount,
  getAccountDeleteImpact,
} from "../controllers/accountController.js";

const router = express.Router();

router.post("/", createAccount);

router.get("/user/:userId", getAccountsByUser);

router.get("/:id/delete-impact", getAccountDeleteImpact);

router.put("/:id", updateAccount);

router.delete("/:id", deleteAccount);

export default router;
