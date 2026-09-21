import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    totalBudget: {
      type: Number,
      default: 0,
    },

    estimatedIncome: {
      type: Number,
      default: 0,
    },

    dailyLimit: {
      type: Number,
      default: 0,
    },

    weeklyLimit: {
      type: Number,
      default: 0,
    },

    categories: [
      {
        name: {
          type: String,
          required: true,
        },

        limit: {
          type: Number,
          default: 0,
        },

        spent: {
          type: Number,
          default: 0,
        },

        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
        },

        color: {
          type: String,
          default: "#6366F1",
        },

        icon: {
          type: String,
          default: "📦",
        },

        type: {
          type: String,
          enum: [
            "Expense",
            "Savings",
            "Investment",
            "Bill",
          ],
          default: "Expense",
        },

        // Which side of the 50/30/20 split this line sits on. Null until the
        // user says, and then derived from `type` - so an existing budget
        // gets a sensible split with no migration, and an explicit choice is
        // distinguishable from never having made one.
        group: {
          type: String,
          enum: ["need", "want", "save"],
          default: null,
        },
      },
    ],

    savingsPots: [
      {
        name: String,

        targetAmount: Number,

        currentAmount: {
          type: Number,
          default: 0,
        },

        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
        },
      },
    ],

    recurringBills: [
      {
        name: String,

        amount: Number,

        dueDate: Number,

        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
        },

        frequency: {
          type: String,
          enum: [
            "Monthly",
            "Quarterly",
            "Half-Yearly",
            "Yearly",
          ],
          default: "Monthly",
        },
      },
    ],

    // "2026-09". The label in `month` is for people; this is what queries
    // use, because "the latest budget by createdAt" is not the same thing as
    // "this month's budget" and picking the wrong one is silent.
    monthKey: {
      type: String,
      default: "",
      index: true,
    },

    // How the need/want/save targets are set. "rule" keeps them pinned to
    // the percentages below; "manual" leaves whatever the user typed.
    allocationMode: {
      type: String,
      enum: ["manual", "rule"],
      default: "manual",
    },

    // The classic 50/30/20, editable - some months are not classic.
    allocationRule: {
      _id: false,
      need: { type: Number, default: 50, min: 0, max: 100 },
      want: { type: Number, default: 30, min: 0, max: 100 },
      save: { type: Number, default: 20, min: 0, max: 100 },
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model(
  "Budget",
  budgetSchema
);