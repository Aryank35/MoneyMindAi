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
} from "../controllers/obligationController.js";

const router = express.Router();

router.get("/overview/:userId", getObligationOverview);

router.get("/user/:userId", getObligationsByUser);

router.post("/", createObligation);

router.get("/:id/delete-impact", getObligationDeleteImpact);

router.post("/:id/settle", settleObligation);

router.post("/:id/undo-settlement", undoSettlement);

router.put("/:id", updateObligation);

router.delete("/:id", deleteObligation);

export default router;
