import mongoose from "mongoose";

const allocationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },

    category: String,

    plannedAmount: Number,

    accountId: String,

    color: String,

    icon: String,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("BudgetAllocation", allocationSchema);
