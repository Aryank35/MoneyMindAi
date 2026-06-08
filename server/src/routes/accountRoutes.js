import express from "express";

import {
  createAccount,
  getAccountsByUser,
  updateAccount,
  deleteAccount,
} from "../controllers/accountController.js";

const router = express.Router();

router.post("/", createAccount);

router.get("/user/:userId", getAccountsByUser);

app.use("/api/accounts", accountRoutes);

router.put("/:id", updateAccount);

router.delete("/:id", deleteAccount);

export default router;
