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

    // Where this account sits in the user's own ordering. Every list and
    // dropdown in the app reads accounts from one endpoint, so sorting on
    // this here is what makes the chosen order apply everywhere.
    displayOrder: {
      type: Number,
      default: 0,
    },

    // Only meaningful when type is "Credit Card". A card is modelled as an
    // account rather than its own entity: expenses already point at accounts
    // and paying a bill is already a transfer, so splitting it out would fork
    // both flows. `balance` goes negative as the card is spent on.
    card: {
      _id: false,

      last4: {
        type: String,
        default: "",
        trim: true,
      },

      network: {
        type: String,
        enum: ["Visa", "Mastercard", "RuPay", "Amex", "Diners", "Other"],
        default: "Other",
      },

      issuer: {
        type: String,
        default: "",
        trim: true,
      },

      creditLimit: {
        type: Number,
        default: 0,
        min: 0,
      },

      // Debt already carried on the card when it was first set up, before
      // any expense was tracked here. Held as a positive figure - the way a
      // statement quotes it - while `balance` stays negative. Kept as its own
      // field so it can be corrected later by delta, without disturbing the
      // spends and payments recorded since.
      openingOutstanding: {
        type: Number,
        default: 0,
        min: 0,
      },

      // Day of month the statement is generated, and the day payment is due.
      // Clamped to the real month length when a cycle is computed.
      statementDay: {
        type: Number,
        min: 1,
        max: 31,
        default: 1,
      },

      dueDay: {
        type: Number,
        min: 1,
        max: 31,
        default: 20,
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Account", accountSchema);
