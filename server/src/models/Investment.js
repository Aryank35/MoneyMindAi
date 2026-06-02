import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        type: {
            type: String,
            required: true,
        },

        //Amount invested
        amount: {
            type: Number,
            required: true,
        },

        currentValue: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model(
    "Investment",
    investmentSchema
);