import mongoose from "mongoose";

import { INVESTMENT_TYPES } from "../config/investmentTypes.js";

// Per-type detail lives in `fields`, described by
// src/config/investmentTypes.js, so a new instrument never means a schema
// change. investedAmount/currentValue are the derived figures written at
// save time; time-sensitive holdings (FD, RD) are recomputed on read.
const investmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    typeKey: {
      type: String,
      required: true,
      enum: INVESTMENT_TYPES.map((type) => type.key),
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Broker, fund house, bank, exchange - whatever holds it.
    platform: {
      type: String,
      default: "",
      trim: true,
    },

    fields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    investedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
    },

    // Recurring contribution, for holdings that are fed monthly.
    isSip: {
      type: Boolean,
      default: false,
    },

    sipAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sipDay: {
      type: Number,
      min: 1,
      max: 31,
    },

    // Reference only - which account funds this. Balances are not touched,
    // so recording a holding never silently moves money.
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    goal: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
    },

    // When the user last refreshed the price / value.
    valuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

investmentSchema.index({ userId: 1, purchaseDate: -1 });

export default mongoose.model("Investment", investmentSchema);
