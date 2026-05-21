/* routes/bookingRoutes.js */
const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// ─────────────────────────────────────────
// POST /api/bookings/create
// Create a new booking
// ─────────────────────────────────────────
router.post("/create", async (req, res) => {
  try {
    const {
      spaceLabel,
      unitLabel,
      date,
      time,
      guests,
      total,
      userEmail,
      notes
    } = req.body;

    // ✅ 1. VALIDATION
    if (!spaceLabel || !unitLabel || !date || !time || !guests || total === undefined || !userEmail) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // ❌ 2. PREVENT DOUBLE BOOKING
    const existing = await Booking.findOne({
      unitLabel,
      date,
      time,
      status: { $ne: "Cancelled" } // allow rebooking if cancelled
    });

    if (existing) {
      return res.status(400).json({ error: "This slot is already booked." });
    }

    // ✅ 3. CREATE BOOKING
    const booking = new Booking({
      spaceLabel,
      unitLabel,
      date,
      time,
      guests,
      total,
      userEmail,
      notes: notes || "",
      status: "Pending" // ✅ ensure status is set
    });

    await booking.save();

    console.log(`📌 New booking created for ${userEmail} — ${spaceLabel}`);

    res.status(201).json({ success: true, booking });

  } catch (err) {

    // ✅ 4. CLEAN VALIDATION ERROR
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }

    console.error("Create booking error:", err.message);

    res.status(500).json({ error: "Server error. Could not create booking." });
  }
});

// ─────────────────────────────────────────
// GET /api/bookings
// Get all bookings (with optional filters)
// Query params: ?status=Pending&email=user@example.com
// ─────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      const validStatuses = ["Pending", "Confirmed", "Cancelled"];
      if (!validStatuses.includes(req.query.status)) {
        return res.status(400).json({ error: "Invalid status filter." });
      }
      filter.status = req.query.status;
    }

    if (req.query.email) {
      filter.userEmail = req.query.email.toLowerCase().trim();
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 });
    res.json(bookings);

  } catch (err) {
    console.error("Fetch bookings error:", err.message);
    res.status(500).json({ error: "Server error. Could not fetch bookings." });
  }
});

// ─────────────────────────────────────────
// GET /api/bookings/:id
// Get a single booking by ID
// ─────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }
    res.json(booking);

  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid booking ID." });
    }
    console.error("Fetch single booking error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

// ─────────────────────────────────────────
// PUT /api/bookings/:id/status
// Update booking status (Pending → Confirmed / Cancelled)
// ─────────────────────────────────────────
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Pending", "Confirmed", "Cancelled"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of: ${validStatuses.join(", ")}`,
      });
      if (!req.body.date || !req.body.guests) {
        return res.status(400).json({ error: "Invalid booking data" });
      }

    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    console.log(`✅ Booking ${req.params.id} status → ${status}`);
    res.json({ success: true, booking });

  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid booking ID." });
    }
    console.error("Update status error:", err.message);
    res.status(500).json({ error: "Server error. Could not update status." });
  }
});

// ─────────────────────────────────────────
// PUT /api/bookings/:id
// Update booking details (date, time, guests, notes)
// ─────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const allowedUpdates = ["date", "time", "guests", "notes", "total"];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields provided to update." });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    console.log(`✏️  Booking ${req.params.id} updated.`);
    res.json({ success: true, booking });

  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid booking ID." });
    }
    console.error("Update booking error:", err.message);
    res.status(500).json({ error: "Server error. Could not update booking." });
  }
});

// ─────────────────────────────────────────
// DELETE /api/bookings/:id
// Delete (cancel) a booking
// ─────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    // ✅ Already cancelled check
    if (booking.status === "Cancelled") {
      return res.status(400).json({ error: "Booking already cancelled." });
    }

    // 🔥 UPDATE STATUS INSTEAD OF DELETE
    booking.status = "Cancelled";
    await booking.save();

    console.log(`❌ Booking ${req.params.id} cancelled (${booking.userEmail})`);

    res.json({ success: true, message: "Booking cancelled successfully." });

  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid booking ID." });
    }

    console.error("Cancel booking error:", err.message);

    res.status(500).json({ error: "Server error. Could not cancel booking." });
  }
});
// ─────────────────────────────────────────
// GET /api/bookings/stats/summary
// Get summary stats for admin dashboard
// ─────────────────────────────────────────
router.get("/stats/summary", async (req, res) => {
  try {
    const [total, pending, confirmed, cancelled, revenueData] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: "Pending" }),
      Booking.countDocuments({ status: "Confirmed" }),
      Booking.countDocuments({ status: "Cancelled" }),
      Booking.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),
    ]);

    res.json({
      total,
      pending,
      confirmed,
      cancelled,
      totalRevenue: revenueData[0]?.totalRevenue || 0,
    });

  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ error: "Server error. Could not fetch stats." });
  }
});

module.exports = router;