import express from "express";

import {
  createObligation,
  getObligationsByUser,
  getObligationOverview,
  updateObligation,
  settleObligation,
  undoSettlement,
  getObligationDeleteImpact,
  deleteObligation,
  getPeopleBalances,
} from "../controllers/obligationController.js";

const router = express.Router();

// Loans and split shares netted per person. Declared early so "people" is
// never read as an obligation id.
router.get("/people/:userId", getPeopleBalances);

router.get("/overview/:userId", getObligationOverview);

router.get("/user/:userId", getObligationsByUser);

router.post("/", createObligation);

router.get("/:id/delete-impact", getObligationDeleteImpact);

router.post("/:id/settle", settleObligation);

router.post("/:id/undo-settlement", undoSettlement);

router.put("/:id", updateObligation);

router.delete("/:id", deleteObligation);

export default router;
