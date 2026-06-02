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
        },

        amount: {
            type: Number,
            required: true,
        },

        incomeDate: {
            type: Date,
            default: Date.now,
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

export default mongoose.model(
    "Income",
    incomeSchema
);