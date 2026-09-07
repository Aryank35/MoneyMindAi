import express from "express";

import {
  createSchedule,
  getSchedulesByUser,
  getScheduleOptions,
  getScheduleOverview,
  updateSchedule,
  markSchedulePaid,
  undoLastPayment,
  getScheduleDeleteImpact,
  deleteSchedule,
} from "../controllers/scheduleController.js";

const router = express.Router();

// Static segments before "/:id" so they are not read as ids.
router.get("/options", getScheduleOptions);

router.get("/overview/:userId", getScheduleOverview);

router.get("/user/:userId", getSchedulesByUser);

router.post("/", createSchedule);

router.get("/:id/delete-impact", getScheduleDeleteImpact);

router.post("/:id/pay", markSchedulePaid);

router.post("/:id/undo-payment", undoLastPayment);

router.put("/:id", updateSchedule);

router.delete("/:id", deleteSchedule);

export default router;
