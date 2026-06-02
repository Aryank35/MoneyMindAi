import express from "express";

import {
  createIncome,
  getIncomeByUser,
  updateIncome,
  deleteIncome,
} from "../controllers/incomeController.js";

const router = express.Router();

router.post("/", createIncome);

router.get(
  "/user/:userId",
  getIncomeByUser,
);

router.put("/:id", updateIncome);

router.delete("/:id", deleteIncome);

export default router;