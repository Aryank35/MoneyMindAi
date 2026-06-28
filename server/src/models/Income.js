import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    source: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Salary",
        "Freelancing",
        "Business",
        "Rental",
        "Interest",
        "Dividend",
        "Bonus",
        "Gift",
        "Refund",
        "Investment",
        "Investments",
        "Other",
      ],
      default: "Salary",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    incomeDate: {
      type: Date,
      default: Date.now,
    },

    paymentMode: {
      type: String,
      enum: ["Bank Transfer", "Cash", "UPI", "Cheque", "Card"],
      default: "Bank Transfer",
    },

    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurringType: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"],
    },

    employer: String,

    salaryMonth: Number,

    salaryYear: Number,

    grossSalary: {
      type: Number,
      default: 0,
    },

    basic: {
      type: Number,
      default: 0,
    },

    hra: {
      type: Number,
      default: 0,
    },

    specialAllowance: {
      type: Number,
      default: 0,
    },

    variablePay: {
      type: Number,
      default: 0,
    },

    netSalary: {
      type: Number,
      default: 0,
    },

    bonus: {
      type: Number,
      default: 0,
    },

    pf: {
      type: Number,
      default: 0,
    },

    professionalTax: {
      type: Number,
      default: 0,
    },

    incomeTax: {
      type: Number,
      default: 0,
    },

    insurance: {
      type: Number,
      default: 0,
    },

    tds: {
      type: Number,
      default: 0,
    },

    attachments: {
      type: [String],
      default: [],
    },

    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Income", incomeSchema);
