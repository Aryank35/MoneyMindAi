import mongoose from "mongoose";

import { INCOME_SOURCES } from "../config/incomeSources.js";

// Per-source detail lives in `fields` as a free-form bag rather than as
// dedicated columns, so adding an income type never means a schema change.
// The shape of that bag is described by src/config/incomeSources.js.
const incomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sourceKey: {
      type: String,
      required: true,
      enum: INCOME_SOURCES.map((source) => source.key),
      default: "salary",
    },

    // Raw inputs plus every derived value, keyed exactly as the registry
    // names them (e.g. { revenue, expenditure, tax, netProfit, loss }).
    fields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // What actually reached the bank account. Computed server-side from the
    // source's creditFormula - never trusted from the client.
    creditedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // The slice of this entry the budget is allowed to plan against. Zero
    // when includeInBudget is false.
    budgetableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Withheld into the EPF account instead of the bank. Never budgetable.
    epfAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    includeInBudget: {
      type: Boolean,
      default: true,
    },

    // Mirror of creditedAmount. The Dashboard and Analytics pages read
    // `amount` directly, so it stays populated as the credited figure.
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    // Set only when epfAmount > 0 and an EPF account was linked, so the
    // credit can be reversed on edit or delete.
    epfAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    incomeDate: {
      type: Date,
      default: Date.now,
    },

    paymentMode: {
      type: String,
      enum: ["Bank Transfer", "Cash", "UPI", "Cheque", "Card"],
      default: "Bank Transfer",
    },

    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurringType: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"],
    },

    // Employer, client, tenant, business name - whoever paid. The label is
    // per-source (see payerLabel in the registry).
    payer: {
      type: String,
      default: "",
      trim: true,
    },

    // Which month this entry belongs to for budgeting, independent of the
    // date it was recorded.
    periodMonth: {
      type: Number,
      min: 1,
      max: 12,
    },

    periodYear: {
      type: Number,
    },

    attachments: {
      type: [String],
      default: [],
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

incomeSchema.index({ userId: 1, incomeDate: -1 });

export default mongoose.model("Income", incomeSchema);
