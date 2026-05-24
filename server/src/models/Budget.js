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
      required: true,
    },

    foodBudget: Number,
    travelBudget: Number,
    shoppingBudget: Number,
    billsBudget: Number,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Budget",
  budgetSchema
);