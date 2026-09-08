import mongoose from "mongoose";

// =========================================================================
// SPLIT
//
// A shared bill. The record is a ledger of who owes whom; cash only moves at
// two points, which is what keeps balances and expenses honest:
//
//   I paid the bill    the full amount leaves my account. An Expense is
//                      written for MY SHARE only - booking the whole bill
//                      would overstate my spending by whatever the others
//                      owe - and the remainder is recorded as an advance,
//                      which is real money out but not a expense.
//
//   Someone else paid  nothing moves yet. When I settle my share, that is
//                      when cash leaves and the Expense is written, the same
//                      way a scheduled payment works.
//
// Total cash out when I pay = my share (expense) + advance = the whole bill.
// =========================================================================

const participantSchema = new mongoose.Schema(
  {
    _id: false,

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

    // What this person owes, worked out from the split method.
    share: {
      type: Number,
      default: 0,
      min: 0,
    },

    // The raw figure the user typed for exact / shares / percentage splits.
    shareInput: {
      type: Number,
      default: 0,
    },

    // How much of their share has changed hands.
    settledAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const splitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    // Optional label to keep trips, flatmates and one-offs apart.
    groupName: {
      type: String,
      default: "",
      trim: true,
    },

    paidByMe: {
      type: Boolean,
      default: true,
    },

    // Who fronted it, when that was not the user.
    payerName: {
      type: String,
      default: "",
      trim: true,
    },

    // The account the bill was paid from. Only meaningful when paidByMe.
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    splitMethod: {
      type: String,
      enum: ["equal", "exact", "shares", "percentage"],
      default: "equal",
    },

    participants: {
      type: [participantSchema],
      default: [],
    },

    // The Expense written for the user's own share, so it can be kept in
    // step and removed with the split.
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
    },

    // Money advanced on everyone else's behalf. Real cash out, tracked apart
    // from the expense so spending is not overstated.
    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    settlements: [
      {
        _id: false,
        date: { type: Date, required: true },
        participantName: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
          default: null,
        },
        note: { type: String, default: "" },
      },
    ],

    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

splitSchema.index({ userId: 1, date: -1 });

export default mongoose.model("Split", splitSchema);
