import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    month: String,

    totalBudget: {
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
        name: String,
        limit: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Budget",
  budgetSchema
);