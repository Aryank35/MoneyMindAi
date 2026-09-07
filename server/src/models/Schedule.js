import mongoose from "mongoose";

// =========================================================================
// SCHEDULE
//
// One model for every dated money commitment, because they are the same
// object wearing different labels:
//
//   payment      rent, EMI, subscription, a one-off future bill
//   insurance    a premium, plus the policy it belongs to
//   contribution money someone else puts in on your behalf - a parent's
//                monthly FD, say - which may or may not count as budget
//
// `recurrence` null means a one-off future payment; otherwise it carries a
// cadence (see helpers/recurrence.js). Marking one paid writes a real
// Expense so the money actually leaves an account, rather than the schedule
// being a reminder that never touches a balance.
// =========================================================================

const scheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    kind: {
      type: String,
      enum: ["payment", "insurance", "contribution"],
      default: "payment",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // null for a one-off. Otherwise { every, unit }.
    recurrence: {
      _id: false,

      every: { type: Number, min: 1, default: 1 },

      unit: {
        type: String,
        enum: ["day", "week", "month", "year"],
        default: "month",
      },
    },

    // Distinguishes a genuine one-off from a monthly schedule, since the
    // nested recurrence object always materialises with its defaults.
    isRecurring: {
      type: Boolean,
      default: true,
    },

    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Optional: a loan that finishes, a policy that matures.
    endDate: {
      type: Date,
      default: null,
    },

    // Which account the money leaves from, or arrives into.
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    // Budget category to book a payment against, so marking it paid lands in
    // the right bucket.
    category: {
      type: String,
      default: "",
      trim: true,
    },

    // Contributions only: who is putting the money in.
    contributor: {
      type: String,
      default: "",
      trim: true,
    },

    // Whether the budget may plan around this. A parent's contribution is
    // real money but is not yours to spend, so it is opt-in.
    includeInBudget: {
      type: Boolean,
      default: true,
    },

    // Insurance only.
    policy: {
      _id: false,

      insurer: { type: String, default: "", trim: true },

      policyNumber: { type: String, default: "", trim: true },

      policyType: {
        type: String,
        enum: ["Life", "Term", "Health", "Motor", "Home", "Travel", "Other"],
        default: "Other",
      },

      coverAmount: { type: Number, default: 0, min: 0 },

      maturityDate: { type: Date, default: null },

      nominee: { type: String, default: "", trim: true },
    },

    // Set when marking paid creates an Expense, so the payment history can
    // point back at the real transaction.
    payments: [
      {
        _id: false,
        paidOn: { type: Date, required: true },
        amount: { type: Number, required: true, min: 0 },
        expenseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Expense",
          default: null,
        },
      },
    ],

    // Denormalised from `payments` so the next-due calculation does not have
    // to scan the array on every read.
    lastPaidDate: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

scheduleSchema.index({ userId: 1, isActive: 1, startDate: 1 });

export default mongoose.model("Schedule", scheduleSchema);
