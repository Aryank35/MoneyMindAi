import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    limit: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

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
      min: 0,
    },

    categories: [categorySchema],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Budget", budgetSchema);
