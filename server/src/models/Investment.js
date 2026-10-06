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

    // Which account funds this. Whether the money actually moves is decided
    // per record by `balanceApplied` below - this is only the link.
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    // Whether buying this actually took the money out of `accountId`.
    //
    // False for every holding recorded before this existed - those were
    // entered as a record of something already owned, and deducting them now
    // would empty accounts for purchases made months ago. Only a new entry
    // that asks for it moves a balance.
    balanceApplied: {
      type: Boolean,
      default: false,
    },

    // Which months this SIP has already been debited for. Keyed by month so
    // opening the app twice in a day cannot buy the same instalment twice -
    // the one failure that would quietly cost real money.
    sipHistory: [
      {
        _id: false,
        monthKey: { type: String, required: true },
        date: { type: Date, required: true },
        amount: { type: Number, required: true, min: 0 },
        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
          default: null,
        },
      },
    ],

    goal: {
      type: String,
      default: "",
      trim: true,
    },

    // Held for the user by someone else - a parent's FD in their name, or a
    // share of family property. Tracked because it is part of the picture,
    // but excluded from the portfolio's own returns by default since it is
    // not the user's capital at work.
    onBehalfOf: {
      type: String,
      default: "",
      trim: true,
    },

    isExternal: {
      type: Boolean,
      default: false,
    },

    includeInNetWorth: {
      type: Boolean,
      default: true,
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
