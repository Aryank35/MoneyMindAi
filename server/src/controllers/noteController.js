import Note from "../models/Note.js";

// =========================================================================
// NOTES AND TO-DOS
// =========================================================================

const clean = (body = {}) => {
  const next = {};

  if (body.kind === "note" || body.kind === "todo") next.kind = body.kind;

  if (typeof body.title === "string") next.title = body.title.trim();

  if (typeof body.body === "string") next.body = body.body;

  if (typeof body.group === "string") next.group = body.group.trim();

  if (typeof body.pinned === "boolean") next.pinned = body.pinned;

  if (body.dueDate === null || body.dueDate) {
    next.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }

  // `doneAt` is never taken from the client - it is set here so the record of
  // when something was finished cannot be back-dated by a stale page.
  if (typeof body.done === "boolean") {
    next.done = body.done;
    next.doneAt = body.done ? new Date() : null;
  }

  if (body.displayOrder !== undefined) {
    next.displayOrder = Number(body.displayOrder) || 0;
  }

  return next;
};

export const getNotes = async (req, res) => {
  try {
    const { userId } = req.params;

    const notes = await Note.find({ userId }).sort({
      pinned: -1,
      displayOrder: 1,
      createdAt: -1,
    });

    // Group names come from the notes themselves, so an emptied group stops
    // being offered without anyone having to tidy it up.
    const groups = [
      ...new Set(notes.map((note) => note.group).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));

    const todos = notes.filter((note) => note.kind === "todo");

    res.json({
      success: true,
      data: {
        notes,
        groups,
        counts: {
          total: notes.length,
          notes: notes.filter((note) => note.kind === "note").length,
          todos: todos.length,
          open: todos.filter((note) => !note.done).length,
          done: todos.filter((note) => note.done).length,
          overdue: todos.filter(
            (note) =>
              !note.done && note.dueDate && new Date(note.dueDate) < new Date(),
          ).length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNote = async (req, res) => {
  try {
    const { userId } = req.body;

    const payload = clean(req.body);

    if (!userId || !payload.title) {
      return res.status(400).json({
        success: false,
        message: "A title is required",
      });
    }

    // New items go to the top of their group rather than the bottom: the
    // thing just written down is the thing being thought about.
    const first = await Note.findOne({ userId, group: payload.group || "" })
      .sort({ displayOrder: 1 })
      .select("displayOrder");

    const note = await Note.create({
      ...payload,
      userId,
      displayOrder: (first?.displayOrder ?? 0) - 1,
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateNote = async (req, res) => {
  try {
    const payload = clean(req.body);

    if (payload.title !== undefined && !payload.title) {
      return res.status(400).json({
        success: false,
        message: "A title is required",
      });
    }

    const note = await Note.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: "after",
    });

    if (!note) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clearing finished to-dos. Declared before "/:id" in the routes so "done"
// is not read as an id.
export const clearDone = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Send the user id",
      });
    }

    const result = await Note.deleteMany({ userId, kind: "todo", done: true });

    res.json({
      success: true,
      data: { removed: result.deletedCount || 0 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// The whole list in its new order, so a partial one cannot interleave with
// the old positions - the same rule the account reorder follows.
export const reorderNotes = async (req, res) => {
  try {
    const { userId, order } = req.body;

    if (!userId || !Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        message: "Send the note ids in their new order",
      });
    }

    const owned = await Note.find({ userId }).select("_id");

    const ownedIds = new Set(owned.map((note) => String(note._id)));

    const foreign = order.filter((id) => !ownedIds.has(String(id)));

    if (foreign.length > 0) {
      return res.status(403).json({
        success: false,
        message: "That note does not belong to this user",
      });
    }

    await Note.bulkWrite(
      order.map((id, index) => ({
        updateOne: {
          filter: { _id: id, userId },
          update: { $set: { displayOrder: index } },
        },
      })),
    );

    res.json({ success: true, message: "Reordered" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
