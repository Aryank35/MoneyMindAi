import express from "express";

import {
  createIncome,
  getIncomeByUser,
  updateIncome,
  deleteIncome,
  getIncomeSummary,
  getIncomeSourceCatalog,
  getIncomeDeleteImpact,
} from "../controllers/incomeController.js";

const router = express.Router();

// Static routes first - "/sources" must not be swallowed by "/:id".
router.get("/sources", getIncomeSourceCatalog);

router.post("/", createIncome);

router.get("/user/:userId", getIncomeByUser);

router.get("/summary/:userId", getIncomeSummary);

router.get("/:id/delete-impact", getIncomeDeleteImpact);

router.put("/:id", updateIncome);

router.delete("/:id", deleteIncome);

export default router;
