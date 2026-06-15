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