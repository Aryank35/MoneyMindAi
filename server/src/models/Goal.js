import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        title: {
            type: String,
            required: true,
        },

        targetAmount: {
            type: Number,
            required: true,
        },

        savedAmount: {
            type: Number,
            required: true,
        },

        targetDate: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model(
    "Goal",
    goalSchema
);