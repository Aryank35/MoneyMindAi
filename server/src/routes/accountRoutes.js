import express from "express";

import {
  createAccount,
  getAccountsByUser,
  updateAccount,
  deleteAccount,
} from "../controllers/accountController.js";

const router = express.Router();

router.post("/", createAccount);

router.get(
  "/user/:userId",
  getAccountsByUser
);

router.put(
  "/:id",
  updateAccount
);

router.delete(
  "/:id",
  deleteAccount
);

export default router;