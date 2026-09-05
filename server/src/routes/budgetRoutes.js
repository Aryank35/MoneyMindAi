import express from "express";

import {
  createBudget,
  getBudgetByUser,
  updateBudget,
  deleteBudget,
  getBudgetPlanning,
  getBudgetDeleteImpact,
} from "../controllers/budgetController.js";

const budgetRoutes = express.Router();

budgetRoutes.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Budget Route Working",
  });
});

budgetRoutes.post("/", createBudget);

budgetRoutes.get("/user/:userId", getBudgetByUser);

budgetRoutes.get("/planning/:userId", getBudgetPlanning);

budgetRoutes.get("/:id/delete-impact", getBudgetDeleteImpact);

budgetRoutes.put("/:id", updateBudget);

budgetRoutes.delete("/:id", deleteBudget);

export default budgetRoutes;
