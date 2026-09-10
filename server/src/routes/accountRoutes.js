import express from "express";

import {
  createAccount,
  getAccountsByUser,
  updateAccount,
  deleteAccount,
  getAccountDeleteImpact,
} from "../controllers/accountController.js";
import {
  getAccountStatement,
  getCardsOverview,
  getUserTransactions,
} from "../controllers/statementController.js";

const router = express.Router();

router.post("/", createAccount);

router.get("/user/:userId", getAccountsByUser);

// Declared before "/:id/..." so "cards" is not read as an account id.
router.get("/cards/:userId", getCardsOverview);

// Every movement across every account, for the transactions view.
router.get("/transactions/:userId", getUserTransactions);

router.get("/:id/statement", getAccountStatement);

router.get("/:id/delete-impact", getAccountDeleteImpact);

router.put("/:id", updateAccount);

router.delete("/:id", deleteAccount);

export default router;
