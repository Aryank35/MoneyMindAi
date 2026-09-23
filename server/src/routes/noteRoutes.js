import express from "express";

import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  clearDone,
  reorderNotes,
} from "../controllers/noteController.js";

const router = express.Router();

router.post("/", createNote);

router.get("/user/:userId", getNotes);

// Declared before "/:id" so these are not read as note ids.
router.post("/clear-done", clearDone);

router.put("/reorder", reorderNotes);

router.put("/:id", updateNote);

router.delete("/:id", deleteNote);

export default router;
