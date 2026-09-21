import mongoose from "mongoose";

import { EVENT_STATUS_KEYS, EVENT_TYPE_KEYS } from "../config/eventTypes.js";

// =========================================================================
// EVENT
//
// A trip, a party, a picnic, a renovation - anything you plan, spend on,
// and then want an honest account of afterwards.
//
// The event holds the PLAN: what you expect to spend, what has to get
// done, and everything you jotted down or saved along the way.
//
// It deliberately does NOT hold the money. Actual spending lives in Split
// documents carrying this event's id, because a real event expense is
// already a shared bill - someone paid, some of it was yours, some of it
// you fronted for other people. Reusing Split means event spending lands
// in the bank statement, the Expenses page and the settle-up flow without
// a second, subtly different implementation of the same maths.
//
//   estimate  = sum of planItems below
//   actual    = sum of the Splits pointing at this event
//
// Attachments live in their own collection. A dozen bill photos inlined
// here would push the document towards Mongo's 16MB ceiling and make every
// read of the plan drag the images along with it.
// =========================================================================

// Someone taking part. The roster is seeded into each new expense so you
// are not retyping the same six names for every bill.
const participantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Exactly one participant is the app user.
    isMe: {
      type: Boolean,
      default: false,
    },

    // "Driving", "veg", "joining on day 2" - whatever you need to remember.
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

// One line of the estimate: "Stay, 2 nights, 8000".
const planItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },

    // Matched against expense categories to produce planned-vs-actual per
    // head, so it is worth keeping to the type's category list.
    category: {
      type: String,
      default: "",
      trim: true,
    },

    estimatedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Some costs scale with heads ("1200 a head"), some do not ("one cab").
    // Storing which lets the estimate re-price itself when the roster grows.
    perHead: {
      type: Boolean,
      default: false,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    done: {
      type: Boolean,
      default: false,
    },

    doneAt: {
      type: Date,
      default: null,
    },

    // A free-text name, matched loosely against the roster. Not a reference,
    // because you will want to assign something to a person who never
    // becomes a participant.
    assignedTo: {
      type: String,
      default: "",
      trim: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
    },

    body: {
      type: String,
      default: "",
    },

    pinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// A pasted link - a booking confirmation, a maps pin, a menu, a reel.
const linkSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: EVENT_TYPE_KEYS,
      default: "trip",
    },

    // Overrides the type's emoji when the user picks their own.
    emoji: {
      type: String,
      default: "",
      trim: true,
    },

    destination: {
      type: String,
      default: "",
      trim: true,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: EVENT_STATUS_KEYS,
      default: "planning",
    },

    // A cap the user sets up front. Kept apart from the sum of planItems:
    // one is "what I am willing to spend", the other is "what I have
    // itemised so far", and the gap between them is the useful bit.
    budgetCap: {
      type: Number,
      default: 0,
      min: 0,
    },

    participants: {
      type: [participantSchema],
      default: [],
    },

    planItems: {
      type: [planItemSchema],
      default: [],
    },

    tasks: {
      type: [taskSchema],
      default: [],
    },

    notes: {
      type: [noteSchema],
      default: [],
    },

    links: {
      type: [linkSchema],
      default: [],
    },

    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

eventSchema.index({ userId: 1, startDate: -1 });

export default mongoose.model("Event", eventSchema);
