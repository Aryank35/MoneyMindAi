import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      default: "Bank",
    },

    balance: {
      type: Number,
      default: 0,
    },

    icon: {
      type: String,
      default: "💳",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Account", accountSchema);
