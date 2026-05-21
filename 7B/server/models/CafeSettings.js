import mongoose from "mongoose";

/**
 * CafeSettings — singleton document (always one doc with key "global")
 * Stores admin-controlled switches and announcements.
 */
const closurePeriodSchema = new mongoose.Schema({
  from: { type: String, required: true }, // "YYYY-MM-DD"
  to: { type: String, required: true }, // "YYYY-MM-DD"
  reason: { type: String, default: "Cafe closed" },
}, { _id: false });

const cafeSettingsSchema = new mongoose.Schema({
  key: { type: String, default: "global", unique: true },

  // ── Booking freeze ──────────────────────────────────────────────
  bookingsFrozen: { type: Boolean, default: false },
  bookingsFrozenMsg: { type: String, default: "Bookings are temporarily paused. Please check back soon." },

  // ── Closure periods ─────────────────────────────────────────────
  closurePeriods: { type: [closurePeriodSchema], default: [] },

  // ── Site-wide announcement banner ───────────────────────────────
  announcementActive: { type: Boolean, default: false },
  announcementText: { type: String, default: "" },
  announcementType: { type: String, enum: ["info", "warning", "success"], default: "info" },
  announcementExpiry: { type: String, default: "" }, // "YYYY-MM-DD" — blank = no expiry

  // ── Operating hours ─────────────────────────────────────────────
  openTime: { type: String, default: "10:00" },
  closeTime: { type: String, default: "21:00" },
  closedDays: { type: [Number], default: [] }, // 0=Sun, 1=Mon … 6=Sat

}, { timestamps: true });

export default mongoose.model("CafeSettings", cafeSettingsSchema);