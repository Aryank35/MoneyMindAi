import mongoose from "mongoose";

const wishlistSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      itemName: {
        type: String,
        required: true,
      },

      targetAmount: {
        type: Number,
        required: true,
      },

      savedAmount: {
        type: Number,
        default: 0,
      },

      priority: {
        type: String,
        enum: [
          "High",
          "Medium",
          "Low",
        ],
        default: "Medium",
      },

      targetDate: Date,
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Wishlist",
  wishlistSchema
);