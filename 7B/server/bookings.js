import express from "express";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import CafeSettings from "../models/CafeSettings.js";
import { verifyToken } from "../middleware/auth.js";
import { sendBookingConfirmation, sendBookingCancellation } from "../utils/emailService.js";

// Helper: get or create settings singleton
async function getSettings() {
  let s = await CafeSettings.findOne({ key: "global" });
  if (!s) s = await CafeSettings.create({ key: "global" });
  return s;
}

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────
// IMPORTANT: Static sub-routes (like /reviews/all, /check-availability/…)
// MUST be declared BEFORE the dynamic /:id route. Otherwise Express will
// match them as { id: "reviews" } and return 404.
// ─────────────────────────────────────────────────────────────────────────

// ── GET /api/bookings/reviews/all  — public reviews feed ─────────────────
router.get("/reviews/all", async (req, res) => {
  try {
    const reviews = await Review.find({}).sort({ createdAt: -1 }).limit(50).lean();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// ── GET /api/bookings/availability?spaceId=&date= ────────────────────────
// Returns { [unitId]: { [slot]: "booked"|"free" } } for the whole space+date
// Used by the seat map to show live availability without auth
router.get("/availability", async (req, res) => {
  try {
    const { spaceId, date } = req.query;
    if (!spaceId || !date) {
      return res.status(400).json({ error: "spaceId and date are required" });
    }

    // All active bookings for this space+date
    const bookings = await Booking.find({
      spaceId,
      date,
      status: { $ne: "cancelled" },
    }).lean();

    // Unit definitions (same as frontend UNITS_FOR_TYPE)
    const UNITS = {
      workspace: ["pod1", "pod2", "pod3", "pod4", "pod5", "pod6"],
      birthday: ["hall1", "hall2"],
      conference: ["room1", "room2"],
      cafe: ["seat1", "seat2", "seat3", "seat4", "seat5", "seat6"],
    };

    const SLOTS = {
      workspace: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"],
      birthday: ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
      conference: ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
      cafe: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"],
    };

    const units = UNITS[spaceId] || [];
    const slots = SLOTS[spaceId] || [];
    const map = {};

    for (const unitId of units) {
      map[unitId] = {};
      for (const slot of slots) {
        const taken = bookings.some(
          b => b.unitId === unitId && (b.slots || [b.slot]).includes(slot)
        );
        map[unitId][slot] = taken ? "booked" : "free";
      }
    }

    res.json(map);
  } catch (err) {
    console.error("Availability map error:", err);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// ── GET /api/bookings/check-availability/:date/:unitId/:slot ─────────────
router.get("/check-availability/:date/:unitId/:slot", async (req, res) => {
  try {
    const { date, unitId, slot } = req.params;
    const spaceId = req.query.spaceId;

    const query = {
      unitId,
      date,
      status: { $ne: "cancelled" },
      slots: slot,
    };
    if (spaceId) query.spaceId = spaceId;

    const conflict = await Booking.findOne(query).lean();
    res.json({ available: !conflict });
  } catch (err) {
    console.error("Availability check error:", err);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

// ── POST /api/bookings  — create a new booking ───────────────────────────
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      spaceId, spaceLabel, spaceIcon,
      unitId, unitLabel, unitIcon,
      date, slot, slots, duration, durationHrs,
      guests, spacePrice, foodItems, foodTotal, grandTotal,
      userName, userEmail,
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!spaceId || !date) {
      return res.status(400).json({ error: "spaceId and date are required" });
    }

    // ── Fetch admin settings and enforce rules ────────────────────────────
    const settings = await getSettings();

    // 1. Booking freeze check
    if (settings.bookingsFrozen) {
      return res.status(403).json({
        error: "BOOKINGS_FROZEN",
        message: settings.bookingsFrozenMsg || "Bookings are temporarily paused.",
      });
    }

    // 2. Closure period check
    for (const cp of settings.closurePeriods) {
      if (date >= cp.from && date <= cp.to) {
        return res.status(403).json({
          error: "CAFE_CLOSED",
          message: `Café is closed from ${cp.from} to ${cp.to}: ${cp.reason}`,
        });
      }
    }

    // 3. Closed day check
    const bookingDayOfWeek = new Date(date + "T00:00:00").getDay();
    if (settings.closedDays.includes(bookingDayOfWeek)) {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return res.status(403).json({
        error: "DAY_CLOSED",
        message: `Café is closed on ${dayNames[bookingDayOfWeek]}s.`,
      });
    }

    // 4. Operating hours check
    if (slots && slots.length > 0 && settings.openTime && settings.closeTime) {
      const outOfHours = slots.filter(s => s < settings.openTime || s >= settings.closeTime);
      if (outOfHours.length === slots.length) {
        return res.status(400).json({
          error: "OUTSIDE_HOURS",
          message: `Café operates from ${settings.openTime} to ${settings.closeTime}.`,
        });
      }
    }

    // ── Slot conflict check (skip for "cafe" which has no seat map) ───────
    if (unitId && slots && slots.length > 0 && spaceId !== "cafe") {
      const conflict = await Booking.findOne({
        spaceId,
        unitId,
        date,
        status: { $ne: "cancelled" },
        slots: { $in: slots },
      });
      if (conflict) {
        return res.status(409).json({ error: "SLOT_UNAVAILABLE" });
      }
    }

    const booking = await Booking.create({
      userId: req.user.uid,
      userName: userName || req.user.name || req.user.email?.split("@")[0] || "",
      userEmail: userEmail || req.user.email || "",
      spaceId, spaceLabel, spaceIcon,
      unitId, unitLabel, unitIcon,
      date,
      slot: slot || (slots?.[0] ?? ""),
      slots: slots || (slot ? [slot] : []),
      duration,
      durationHrs: durationHrs || 1,
      guests: guests || 1,
      spacePrice: spacePrice || 0,
      foodItems: foodItems || [],
      foodTotal: foodTotal || 0,
      grandTotal: grandTotal || 0,
      status: "confirmed",
    });

    console.log("✅ Booking created:", booking._id, "for user:", req.user.uid);

    // Send confirmation email
    try {
      await sendBookingConfirmation(booking);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the booking if email fails
    }

    res.status(201).json(booking);
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ── GET /api/bookings  — fetch all bookings for the logged-in user ────────
router.get("/", verifyToken, async (req, res) => {
  try {
    const bookings = await Booking
      .find({ userId: req.user.uid })
      .sort({ createdAt: -1 })
      .lean();

    // Attach hasReviewed flag
    const bookingIds = bookings.map(b => String(b._id));
    const reviews = await Review.find({ bookingId: { $in: bookingIds } }).lean();
    const reviewedSet = new Set(reviews.map(r => r.bookingId));

    const result = bookings.map(b => ({
      ...b,
      hasReviewed: reviewedSet.has(String(b._id)),
    }));

    res.json(result);
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ── GET /api/bookings/:id  — single booking ───────────────────────────────
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user.uid,
    }).lean();

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(booking);
  } catch (err) {
    console.error("Get booking error:", err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// ── PUT /api/bookings/:id/cancel  — cancel a booking ─────────────────────
router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user.uid,
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    // 10-minute cutoff: can't cancel if slot is within 10 min (same day)
    if (booking.slot && booking.date) {
      const today = new Date().toISOString().split("T")[0];
      if (booking.date === today) {
        const [h, m] = booking.slot.split(":").map(Number);
        const slotMs = new Date().setHours(h, m, 0, 0);
        const nowMs = Date.now();
        if (slotMs - nowMs <= 10 * 60 * 1000) {
          return res.status(400).json({
            error: "Cancellations are not allowed within 10 minutes of your booking time",
          });
        }
      }
    }

    booking.status = "cancelled";
    booking.cancelledBy = "user";
    await booking.save();

    // Send cancellation email with refund
    try {
      await sendBookingCancellation(booking, "user");
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }

    res.json(booking);
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// ── POST /api/bookings/:id/review  — submit a review ─────────────────────
router.post("/:id/review", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user.uid,
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const {
      stars, text, userName, userEmail, userInit,
      spaceId, spaceLabel, spaceIcon,
    } = req.body;

    // Upsert — one review per booking
    const review = await Review.findOneAndUpdate(
      { bookingId: String(booking._id) },
      {
        bookingId: String(booking._id),
        userId: req.user.uid,
        userEmail: userEmail || req.user.email || "",
        userName: userName || req.user.name || "",
        userInit: userInit || (userName?.[0] ?? "?").toUpperCase(),
        spaceId: spaceId || booking.spaceId,
        spaceLabel: spaceLabel || booking.spaceLabel,
        spaceIcon: spaceIcon || booking.spaceIcon,
        stars,
        text,
      },
      { upsert: true, new: true }
    );

    res.status(201).json(review);
  } catch (err) {
    console.error("Review error:", err);
    res.status(500).json({ error: "Failed to save review" });
  }
});

export default router;
//d