import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "Other",
      trim: true,
    },

    estimatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    savedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingAmount: {
      type: Number,
      default: 0,
    },

    targetDate: {
      type: Date,
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Upcoming", "On Track", "Behind", "Completed", "Cancelled", "Urgent"],
      default: "Upcoming",
    },

    linkedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    linkedWishlistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wishlist",
      default: null,
    },

    linkedBudgetCategory: {
      type: String,
      default: "",
    },

    monthlySaving: {
      type: Number,
      default: 0,
    },

    weeklySaving: {
      type: Number,
      default: 0,
    },

    dailySaving: {
      type: Number,
      default: 0,
    },

    daysRemaining: {
      type: Number,
      default: 0,
    },

    monthsRemaining: {
      type: Number,
      default: 0,
    },

    completionPercentage: {
      type: Number,
      default: 0,
    },

    autoSave: {
      type: Boolean,
      default: false,
    },

    repeat: {
      type: Boolean,
      default: false,
    },

    repeatFrequency: {
      type: String,
      enum: ["None", "Weekly", "Monthly", "Quarterly", "Yearly"],
      default: "None",
    },

    inflationRate: {
      type: Number,
      default: 0,
    },

    expectedAmountAfterInflation: {
      type: Number,
      default: 0,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    icon: {
      type: String,
      default: "FiTarget",
    },

    color: {
      type: String,
      default: "#6366F1",
    },

    notes: {
      type: String,
      default: "",
    },

    attachments: {
      type: [String],
      default: [],
    },

    contributions: [
      {
        amount: Number,
        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
        },
        note: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

const calculatePlanFields = (plan) => {
  const estimatedAmount = Number(plan.estimatedAmount || 0);
  const savedAmount = Number(plan.savedAmount || 0);
  const remainingAmount = Math.max(estimatedAmount - savedAmount, 0);
  const today = new Date();
  const targetDate = plan.targetDate ? new Date(plan.targetDate) : today;
  const millisecondsRemaining = targetDate - today;
  const daysRemaining = Math.max(
    0,
    Math.ceil(millisecondsRemaining / (1000 * 60 * 60 * 24)),
  );
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));
  const yearsRemaining = Math.max(daysRemaining / 365, 0);
  const completionPercentage =
    estimatedAmount > 0
      ? Math.min(100, Math.round((savedAmount / estimatedAmount) * 100))
      : 0;
  const inflationRate = Number(plan.inflationRate || 0);
  const expectedAmountAfterInflation = Math.round(
    estimatedAmount * Math.pow(1 + inflationRate / 100, yearsRemaining),
  );

  plan.remainingAmount = remainingAmount;
  plan.daysRemaining = daysRemaining;
  plan.monthsRemaining = monthsRemaining;
  plan.dailySaving = daysRemaining > 0 ? Math.ceil(remainingAmount / daysRemaining) : remainingAmount;
  plan.weeklySaving = Math.ceil(plan.dailySaving * 7);
  plan.monthlySaving = Math.ceil(remainingAmount / monthsRemaining);
  plan.expectedAmountAfterInflation = expectedAmountAfterInflation;
  plan.completionPercentage = completionPercentage;
  plan.completed = completionPercentage >= 100 || plan.completed;

  if (plan.status === "Cancelled") {
    return;
  }

  if (plan.completed || completionPercentage >= 100) {
    plan.status = "Completed";
  } else if (daysRemaining <= 7) {
    plan.status = "Urgent";
  } else if (completionPercentage === 0 && daysRemaining > 30) {
    plan.status = "Upcoming";
  } else if (completionPercentage >= Math.min(90, Math.max(20, 100 - daysRemaining))) {
    plan.status = "On Track";
  } else {
    plan.status = "Behind";
  }
};

planSchema.pre("validate", function () {
  calculatePlanFields(this);
});

planSchema.pre("save", function () {
  calculatePlanFields(this);
});

export { calculatePlanFields };

export default mongoose.model("Plan", planSchema);
