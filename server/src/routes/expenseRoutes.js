import express from "express";

import {
  createExpense,
  getExpensesByUser,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";

const router = express.Router();

router.post("/", createExpense);

router.get("/user/:userId", getExpensesByUser);

router.put("/:id", updateExpense);

router.delete("/:id", deleteExpense);

export default router;