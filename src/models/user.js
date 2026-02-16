import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, minlength: 2 },
    lastName: { type: String, required: true, trim: true, minlength: 2 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true, // ✅ Keep this

    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

// Indexes for efficient queries
userSchema.index({ email: 1 }); // For email search
userSchema.index({ firstName: 1, lastName: 1 }); // For name-based queries
userSchema.index({ createdAt: -1 }); // For sorting by creation date

export default mongoose.model("User", userSchema);