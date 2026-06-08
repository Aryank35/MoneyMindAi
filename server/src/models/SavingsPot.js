import mongoose from "mongoose";

const savingsPotSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      name: {
        type: String,

        required: true,
      },

      targetAmount: {
        type: Number,

        required: true,
      },

      currentAmount: {
        type: Number,

        default: 0,
      },

      color: {
        type: String,

        default:
          "#10B981",
      },

      icon: {
        type: String,

        default: "🎯",
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "SavingsPot",
  savingsPotSchema
);