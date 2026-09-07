import mongoose from "mongoose";

// =========================================================================
// OBLIGATION
//
// Money owed in either direction. One model rather than two, because "I lent
// Ravi 5,000" and "I borrowed 5,000 from Ravi" differ only in which way the
// money moved and who is waiting to be paid back.
//
//   lent      money went out; someone owes you
//   borrowed  money came in; you owe someone
//
// A settlement is a real balance movement: repayment of something you lent
// credits your account, repayment of something you borrowed debits it.
// =========================================================================

const obligationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    direction: {
      type: String,
      enum: ["lent", "borrowed"],
      required: true,
    },

    // Who the money is with.
    counterparty: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional context - "cousin", "colleague", "landlord".
    relationship: {
      type: String,
      default: "",
      trim: true,
    },

    principal: {
      type: Number,
      required: true,
      min: 0,
    },

    // Which account the money left from, or arrived into.
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    // The date it was agreed the money comes back. Optional, because plenty
    // of informal lending has no date - but the app nags about that, since
    // an undated loan is the kind that quietly never returns.
    promiseDate: {
      type: Date,
      default: null,
    },

    agreedOn: {
      type: Date,
      default: Date.now,
    },

    // Simple annual rate, if any was agreed. Most personal lending has none.
    interestRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Part-payments. Summing these gives what has been settled so far.
    settlements: [
      {
        _id: false,
        date: { type: Date, required: true },
        amount: { type: Number, required: true, min: 0 },
        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
          default: null,
        },
        note: { type: String, default: "" },
      },
    ],

    // Set when the balance reaches zero, or when the user writes it off.
    closedOn: {
      type: Date,
      default: null,
    },

    // A loan given up on, kept for the record rather than deleted.
    writtenOff: {
      type: Boolean,
      default: false,
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

obligationSchema.index({ userId: 1, direction: 1, promiseDate: 1 });

export default mongoose.model("Obligation", obligationSchema);
