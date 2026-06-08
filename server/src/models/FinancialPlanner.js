import mongoose from "mongoose";

const plannerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },

    title: String,

    amount: Number,

    frequency: {
      type: String,

      enum: ["monthly", "quarterly", "half_yearly", "yearly"],
    },

    nextDueDate: Date,

    category: String,

    accountId: String,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("FinancialPlanner", plannerSchema);
