import mongoose from "mongoose";

const foodItemSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  name:  { type: String, required: true },
  qty:   { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const bookingSchema = new mongoose.Schema(
  {
    // ── Who booked ──────────────────────────────────────────────────
    userId:    { type: String, required: true, index: true }, // Firebase UID
    userName:  { type: String, default: "" },
    userEmail: { type: String, default: "" },

    // ── What was booked ─────────────────────────────────────────────
    spaceId:    { type: String, required: true },   // "workspace" | "birthday" | "conference" | …
    spaceLabel: { type: String, default: "" },
    spaceIcon:  { type: String, default: "" },
    unitId:     { type: String, default: "" },       // specific pod / room id
    unitLabel:  { type: String, default: "" },
    unitIcon:   { type: String, default: "" },

    // ── When ────────────────────────────────────────────────────────
    date:        { type: String, required: true },   // "YYYY-MM-DD"
    slot:        { type: String, default: "" },       // first slot "HH:MM"
    slots:       { type: [String], default: [] },     // all selected slots
    duration:    { type: String, default: "" },       // "2 hours"
    durationHrs: { type: Number, default: 1 },

    // ── Guests ──────────────────────────────────────────────────────
    guests: { type: Number, default: 1, min: 1 },

    // ── Pricing ─────────────────────────────────────────────────────
    spacePrice: { type: Number, default: 0 },
    foodTotal:  { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    foodItems:  { type: [foodItemSchema], default: [] },

    // ── Lifecycle ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    // Who cancelled: "user" or "admin" — helps frontend show distinct badge
    cancelledBy: { type: String, enum: ["user", "admin", null], default: null },
    cancelReason: { type: String, default: "" },
  },
  {
    timestamps: true,   // adds createdAt / updatedAt automatically
  }
);

// Compound index so availability checks are fast
bookingSchema.index({ spaceId: 1, unitId: 1, date: 1, status: 1 });

export default mongoose.model("Booking", bookingSchema);