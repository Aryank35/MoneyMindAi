import express from "express";

import {
  createBudget,
  getBudgetByUser,
  updateBudget,
  deleteBudget,
} from "../controllers/budgetController.js";

const budgetRoutes = express.Router();

budgetRoutes.post("/", createBudget);
budgetRoutes.get(
  "/test",
  (req, res) => {
    res.json({
      message:
        "Budget Route Working",
    });
  }
);

budgetRoutes.get("/user/:userId", getBudgetByUser);

budgetRoutes.put("/:id", updateBudget);

budgetRoutes.delete("/:id", deleteBudget);

export default budgetRoutes;
