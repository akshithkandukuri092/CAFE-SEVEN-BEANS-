/* models/Booking.js */
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    spaceLabel: {
      type: String,
      required: [true, "Space label is required"],
      trim: true,
    },
    unitLabel: {
      type: String,
      required: [true, "Unit/seat label is required"],
      trim: true,
    },
    date: {
      type: String,
      required: [true, "Booking date is required"],
      trim: true,
    },
    time: {
      type: String,
      required: [true, "Booking time is required"],
      trim: true,
    },
    guests: {
      type: Number,
      required: [true, "Number of guests is required"],
      min: [1, "At least 1 guest is required"],
    },
    total: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total cannot be negative"],
    },
    userEmail: {
      type: String,
      required: [true, "User email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    status: {
      type: String,
      enum: {
        values: ["Pending", "Confirmed", "Cancelled"],
        message: "Status must be Pending, Confirmed, or Cancelled",
      },
      default: "Pending",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
      
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Index for faster queries by email and status
bookingSchema.index({ userEmail: 1, createdAt: -1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index(
  { unitLabel: 1, date: 1, time: 1 },
  { unique: true }
);


module.exports = mongoose.model("Booking", bookingSchema);