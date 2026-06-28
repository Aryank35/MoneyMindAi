import express from "express";

import {
  completePlan,
  contributeToPlan,
  createPlan,
  deletePlan,
  getPlansByUser,
  getPlanSummary,
  updatePlan,
} from "../controllers/planController.js";

const router = express.Router();

router.post("/", createPlan);

router.get("/user/:userId", getPlansByUser);

router.get("/summary/:userId", getPlanSummary);

router.put("/:id", updatePlan);

router.patch("/:id/contribute", contributeToPlan);

router.patch("/:id/complete", completePlan);

router.delete("/:id", deletePlan);

export default router;
