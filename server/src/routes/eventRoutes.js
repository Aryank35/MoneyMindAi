import express from "express";

import {
  getEventOptions,
  getEventOverview,
  createEvent,
  getEventsByUser,
  getEvent,
  updateEvent,
  getEventDeleteImpact,
  deleteEvent,
  addCollectionItem,
  updateCollectionItem,
  removeCollectionItem,
  seedChecklist,
  getPlanGaps,
  addAttachment,
  getAttachment,
  updateAttachment,
  deleteAttachment,
} from "../controllers/eventController.js";

const router = express.Router();

// Fixed segments come before "/:id", or "options" would be read as an id.
router.get("/options", getEventOptions);

router.get("/overview/:userId", getEventOverview);

router.get("/user/:userId", getEventsByUser);

router.post("/", createEvent);

// Attachments are addressed on their own so a bill can be fetched or removed
// without naming the event it hangs off.
router.get("/attachments/:attachmentId", getAttachment);

router.put("/attachments/:attachmentId", updateAttachment);

router.delete("/attachments/:attachmentId", deleteAttachment);

router.get("/:id/delete-impact", getEventDeleteImpact);

router.get("/:id/plan-gaps", getPlanGaps);

router.post("/:id/attachments", addAttachment);

router.post("/:id/seed-checklist", seedChecklist);

// One set of handlers for every list on an event - plan lines, tasks, notes,
// links and the roster. The collection name is validated in the controller
// against a whitelist, so an unknown one is a 404 rather than a way to write
// arbitrary fields.
router.post("/:id/:collection", addCollectionItem);

router.put("/:id/:collection/:itemId", updateCollectionItem);

router.delete("/:id/:collection/:itemId", removeCollectionItem);

router.get("/:id", getEvent);

router.put("/:id", updateEvent);

router.delete("/:id", deleteEvent);

export default router;
