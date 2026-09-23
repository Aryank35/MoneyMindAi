import mongoose from "mongoose";

// =========================================================================
// NOTES AND TO-DOS
//
// One collection for both, because they are the same thing at different
// moments: a thought you jot down often turns into something you have to do,
// and forcing that to be a delete-and-retype is how notes stop getting
// written. `kind` decides which it behaves as, and it can be flipped.
//
// A "checklist" is not a third type - it is simply several to-dos sharing a
// `group`. That keeps one list to learn and lets any item join a group later
// without being converted into something else.
// =========================================================================

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    kind: {
      type: String,
      enum: ["note", "todo"],
      default: "todo",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    // The long form. A to-do rarely needs one; a note usually is one.
    body: {
      type: String,
      default: "",
    },

    // Free text rather than a reference to a group document: groups are
    // created by typing a name, and an empty one should disappear by itself
    // rather than linger as a row nobody deletes.
    group: {
      type: String,
      default: "",
      trim: true,
    },

    done: {
      type: Boolean,
      default: false,
    },

    // Kept so a finished list can still be read in the order it was worked,
    // and so "done today" is answerable.
    doneAt: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    pinned: {
      type: Boolean,
      default: false,
    },

    // Position within its group, for manual ordering. Matches the pattern
    // accounts and budget categories already use.
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// The list is always read per user, newest or hand-ordered within a group.
noteSchema.index({ userId: 1, done: 1, displayOrder: 1 });

export default mongoose.model("Note", noteSchema);
