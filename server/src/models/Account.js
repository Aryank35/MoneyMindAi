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
        "Credit Card",
        "EPF",
      ],
      default: "Bank",
    },

    balance: {
      type: Number,
      default: 0,
    },

    openingBalance: {
      type: Number,
      default: 0,
    },

    accountNumber: {
      type: String,
      default: "",
    },

    icon: {
      type: String,
      default: "🏦",
    },

    color: {
      type: String,
      default: "#CFAF66",
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

    isSalaryAccount: {
      type: Boolean,
      default: false,
    },

    // Receives the EPF slice of salary entries. Held separately from the
    // salary account because that money never touches the bank.
    isEpfAccount: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Account", accountSchema);
