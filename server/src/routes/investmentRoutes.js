import express from "express";

import {
  createInvestment,
  getInvestmentsByUser,
  getInvestmentTypeCatalog,
  getPortfolio,
  updateInvestment,
  updateInvestmentValue,
  getInvestmentDeleteImpact,
  deleteInvestment,
  getDueAutoDebits,
  postAutoDebits,
} from "../controllers/investmentController.js";

const router = express.Router();

// Declared before "/:id" so these are not read as investment ids.
router.get("/auto-debits/:userId", getDueAutoDebits);

router.post("/auto-debits/post", postAutoDebits);

// Static routes first so "types" and "portfolio" are not read as ids.
router.get("/types", getInvestmentTypeCatalog);

router.get("/portfolio/:userId", getPortfolio);

router.get("/user/:userId", getInvestmentsByUser);

router.post("/", createInvestment);

router.get("/:id/delete-impact", getInvestmentDeleteImpact);

router.patch("/:id/value", updateInvestmentValue);

router.put("/:id", updateInvestment);

router.delete("/:id", deleteInvestment);

export default router;
