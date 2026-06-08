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
      enum: [
        "Bank",
        "Cash",
        "UPI",
        "Wallet",
        "Investment",
      ],
      default: "Bank",
    },

    balance: {
      type: Number,
      default: 0,
    },

    icon: {
      type: String,
      default: "🏦",
    },

    color: {
      type: String,
      default: "#6366F1",
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Account",
  accountSchema
);