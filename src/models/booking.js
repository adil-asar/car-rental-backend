import mongoose from "mongoose";
import { z } from "zod";

const bookingSchema = new mongoose.Schema(
    {
        car: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Car",
            required: [true, "Car is required for booking"],
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required for booking"],
        },
        startDate: {
            type: Date,
            required: [true, "Start date is required"],
        },
        endDate: {
            type: Date,
            required: [true, "End date is required"],
        },
        totalAmount: {
            type: Number,
            required: [true, "Total amount is required"],
            min: [0, "Total amount cannot be negative"],
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "cancelled", "completed"],
            default: "pending",
        },

    },
    {
        timestamps: true,
    }
);

// Indexes
bookingSchema.index({ user: 1 });
bookingSchema.index({ car: 1 });
bookingSchema.index({ status: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);

// Zod Validation Schema
export const bookingValidationSchema = z.object({
    car: z.string().min(1, "Car ID is required"),
    startDate: z.string().or(z.date()).transform((val) => new Date(val)),
    endDate: z.string().or(z.date()).transform((val) => new Date(val)),
    totalAmount: z.number().min(0),
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),

});
