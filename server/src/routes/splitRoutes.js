import express from "express";

import {
  createSplit,
  getSplitsByUser,
  getSplitOptions,
  getSplitOverview,
  settleSplit,
  getSplitDeleteImpact,
  deleteSplit,
} from "../controllers/splitController.js";

const router = express.Router();

router.get("/options", getSplitOptions);

router.get("/overview/:userId", getSplitOverview);

router.get("/user/:userId", getSplitsByUser);

router.post("/", createSplit);

router.get("/:id/delete-impact", getSplitDeleteImpact);

router.post("/:id/settle", settleSplit);

router.delete("/:id", deleteSplit);

export default router;
