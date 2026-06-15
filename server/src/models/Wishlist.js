import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Goal Name
    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    // Total Goal Amount
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Amount Saved Till Now
    savedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Remaining Amount
    remainingAmount: {
      type: Number,
      default: 0,
    },

    // Progress %
    progressPercentage: {
      type: Number,
      default: 0,
    },

    // Goal Priority
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },

    // Goal Deadline
    targetDate: {
      type: Date,
      required: true,
    },

    // Days Left
    daysRemaining: {
      type: Number,
      default: 0,
    },

    // Required Savings
    requiredPerDay: {
      type: Number,
      default: 0,
    },

    requiredPerWeek: {
      type: Number,
      default: 0,
    },

    requiredPerMonth: {
      type: Number,
      default: 0,
    },

    // Goal Status
    status: {
      type: String,
      enum: ["Not Started", "On Track", "Behind", "Urgent", "Completed"],
      default: "Not Started",
    },

    // Pot Design
    potIcon: {
      type: String,
      default: "🎯",
    },

    potColor: {
      type: String,
      default: "#6366F1",
    },

    description: {
      type: String,
      default: "",
    },

    // Linked Account
    linkedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    // Auto Save
    autoSaveEnabled: {
      type: Boolean,
      default: false,
    },

    autoSaveAmount: {
      type: Number,
      default: 0,
    },

    autoSaveFrequency: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      default: "Monthly",
    },

    // Milestones
    milestones: [
      {
        title: String,
        amount: Number,
        achieved: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Savings History
    savingsHistory: [
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

wishlistSchema.pre("save", function (next) {
  const target = Number(this.targetAmount);

  const saved = Number(this.savedAmount);

  this.remainingAmount = Math.max(target - saved, 0);

  this.progressPercentage = target > 0 ? Math.round((saved / target) * 100) : 0;

  if (this.targetDate) {
    const today = new Date();

    const targetDate = new Date(this.targetDate);

    const days = Math.max(
      1,
      Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24)),
    );

    this.daysRemaining = days;

    this.requiredPerDay = Math.ceil(this.remainingAmount / days);

    this.requiredPerWeek = Math.ceil(this.requiredPerDay * 7);

    this.requiredPerMonth = Math.ceil(this.requiredPerDay * 30);
  }

  if (this.progressPercentage >= 100) {
    this.status = "Completed";
  } else if (this.daysRemaining <= 30) {
    this.status = "Urgent";
  } else if (this.progressPercentage >= 50) {
    this.status = "On Track";
  } else {
    this.status = "Behind";
  }

  next();
});

export default mongoose.model("Wishlist", wishlistSchema);
