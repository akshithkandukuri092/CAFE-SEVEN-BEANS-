import express from "express";
import Booking      from "../models/Booking.js";
import Review       from "../models/Review.js";
import CafeSettings from "../models/CafeSettings.js";
import { verifyToken } from "../middleware/auth.js";
import { sendBookingConfirmation, sendBookingCancellation, sendBookingCompletion } from "../utils/emailService.js";

const router = express.Router();

// ── Admin guard ───────────────────────────────────────────────────
function adminOnly(req, res, next) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const userEmail  = (req.user?.email || "").toLowerCase().trim();
  if (!adminEmail) return res.status(500).json({ error: "ADMIN_EMAIL not configured" });
  if (userEmail !== adminEmail) return res.status(403).json({ error: "Forbidden: admin access only" });
  next();
}

// ── Helper: get or create settings singleton ──────────────────────
async function getSettings() {
  let s = await CafeSettings.findOne({ key: "global" });
  if (!s) s = await CafeSettings.create({ key: "global" });
  return s;
}

// All admin routes require auth + admin role
router.use(verifyToken, adminOnly);

// ══════════════════════════════════════════════════════════════════
//  BOOKINGS
// ══════════════════════════════════════════════════════════════════

// GET /api/admin/bookings
router.get("/bookings", async (req, res) => {
  try {
    const { date, from, to, status, spaceId, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (date)    filter.date    = date;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }
    if (status)  filter.status  = status;
    if (spaceId) filter.spaceId = spaceId;

    const total    = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ bookings, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// GET /api/admin/today
router.get("/today", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const bookings = await Booking
      .find({ date: today, status: { $ne: "cancelled" } })
      .sort({ slot: 1 }).lean();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch today" });
  }
});

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const today       = new Date().toISOString().split("T")[0];
    const todayDocs   = await Booking.find({ date: today }).lean();
    const allDocs     = await Booking.find({}).lean();
    const activeDocs  = allDocs.filter(b => b.status !== "cancelled");

    const totalRevenue = activeDocs.reduce((s, b) => s + (b.grandTotal || 0), 0);
    const todayRevenue = todayDocs.filter(b => b.status !== "cancelled")
                                  .reduce((s, b) => s + (b.grandTotal || 0), 0);

    const statusCounts  = { confirmed: 0, completed: 0, cancelled: 0 };
    const spaceRevenue  = {};
    const dailyRevenue  = {};
    const slotCounts    = {};
    const thirtyAgo     = new Date(Date.now() - 30 * 864e5).toISOString().split("T")[0];
    const sevenAgo      = new Date(Date.now() - 7  * 864e5).toISOString().split("T")[0];

    // Peak hours by day of week: { 0: { "10:00": 3, ... }, 1: { ... }, ... }
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const peakHoursByDay = {};
    let weekRevenue  = 0;
    let monthRevenue = 0;

    for (const b of allDocs) {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      if (b.status !== "cancelled") {
        spaceRevenue[b.spaceId] = (spaceRevenue[b.spaceId] || 0) + (b.grandTotal || 0);
        if (b.date >= thirtyAgo) {
          dailyRevenue[b.date] = (dailyRevenue[b.date] || 0) + (b.grandTotal || 0);
          monthRevenue += (b.grandTotal || 0);
        }
        if (b.date >= sevenAgo) {
          weekRevenue += (b.grandTotal || 0);
        }
        const bookingDay = new Date(b.date + "T00:00:00").getDay();
        for (const slot of (b.slots || [b.slot]).filter(Boolean)) {
          slotCounts[slot] = (slotCounts[slot] || 0) + 1;
          if (!peakHoursByDay[bookingDay]) peakHoursByDay[bookingDay] = {};
          peakHoursByDay[bookingDay][slot] = (peakHoursByDay[bookingDay][slot] || 0) + 1;
        }
      }
    }

    // Find the single top peak hour across all days
    let topPeakHour = null;
    for (const [day, slots] of Object.entries(peakHoursByDay)) {
      for (const [slot, count] of Object.entries(slots)) {
        if (!topPeakHour || count > topPeakHour.count) {
          topPeakHour = { slot, count, day: Number(day), dayName: dayNames[Number(day)] };
        }
      }
    }

    const reviews   = await Review.find({}).lean();
    const avgRating = reviews.length
      ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)
      : null;

    res.json({
      today: {
        date:      today,
        total:     todayDocs.length,
        confirmed: todayDocs.filter(b => b.status === "confirmed").length,
        completed: todayDocs.filter(b => b.status === "completed").length,
        cancelled: todayDocs.filter(b => b.status === "cancelled").length,
        revenue:   todayRevenue,
      },
      allTime: {
        total: allDocs.length, revenue: totalRevenue,
        weekRevenue, monthRevenue,
        statusCounts, spaceRevenue, dailyRevenue, slotCounts,
        peakHoursByDay, topPeakHour,
        avgRating,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// PUT /api/admin/bookings/:id/confirm
router.put("/bookings/:id/confirm", async (req, res) => {
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: "Not found" });
    if (b.status === "cancelled") return res.status(400).json({ error: "Cannot confirm cancelled booking" });
    b.status = "confirmed";
    await b.save();

    // Send confirmation email
    try {
      await sendBookingConfirmation(b);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    res.json(b);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/admin/bookings/:id/complete
router.put("/bookings/:id/complete", async (req, res) => {
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: "Not found" });
    if (b.status === "cancelled") return res.status(400).json({ error: "Cannot complete cancelled booking" });
    b.status = "completed";
    await b.save();

    // Send completion email
    try {
      await sendBookingCompletion(b);
    } catch (emailError) {
      console.error("Failed to send completion email:", emailError);
    }

    res.json(b);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// PUT /api/admin/bookings/:id/cancel
router.put("/bookings/:id/cancel", async (req, res) => {
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: "Not found" });
    if (b.status === "cancelled") return res.status(400).json({ error: "Already cancelled" });
    b.status = "cancelled";
    b.cancelledBy = "admin";
    b.cancelReason = req.body.reason || "Cancelled by admin";
    await b.save();

    // Send cancellation email with refund
    try {
      await sendBookingCancellation(b, "admin");
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }

    res.json(b);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// GET /api/admin/export/csv  — download all bookings as CSV
router.get("/export/csv", async (req, res) => {
  try {
    const { from, to, status } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }
    if (status) filter.status = status;

    const bookings = await Booking.find(filter).sort({ date: 1, slot: 1 }).lean();

    const headers = ["ID","Date","Time","Guest Name","Guest Email","Space","Seat","Guests","Space Price","Food Total","Grand Total","Status","Created At"];
    const rows = bookings.map(b => [
      b._id,
      b.date,
      b.slot,
      b.userName  || "",
      b.userEmail || "",
      b.spaceLabel || b.spaceId,
      b.unitLabel  || b.unitId,
      b.guests,
      b.spacePrice  || 0,
      b.foodTotal   || 0,
      b.grandTotal  || 0,
      b.status,
      new Date(b.createdAt).toISOString(),
    ]);

    const csv = "\uFEFF" + [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="sevenbeans-bookings-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: "Export failed" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  SETTINGS (freeze, announcements, closures, hours)
// ══════════════════════════════════════════════════════════════════

// GET /api/admin/settings
router.get("/settings", async (req, res) => {
  try {
    res.json(await getSettings());
  } catch (err) { res.status(500).json({ error: "Failed to load settings" }); }
});

// PATCH /api/admin/settings  — partial update
router.patch("/settings", async (req, res) => {
  try {
    const allowed = [
      "bookingsFrozen", "bookingsFrozenMsg",
      "announcementActive", "announcementText", "announcementType", "announcementExpiry",
      "openTime", "closeTime", "closedDays",
    ];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    const s = await CafeSettings.findOneAndUpdate(
      { key: "global" },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json(s);
  } catch (err) { res.status(500).json({ error: "Failed to save settings" }); }
});

// POST /api/admin/settings/closures  — add a closure period
router.post("/settings/closures", async (req, res) => {
  try {
    const { from, to, reason } = req.body;
    if (!from || !to) return res.status(400).json({ error: "from and to dates required" });
    const s = await getSettings();
    s.closurePeriods.push({ from, to, reason: reason || "Cafe closed" });
    await s.save();
    res.json(s);
  } catch (err) { res.status(500).json({ error: "Failed to add closure" }); }
});

// DELETE /api/admin/settings/closures/:index  — remove closure period
router.delete("/settings/closures/:index", async (req, res) => {
  try {
    const s = await getSettings();
    const idx = Number(req.params.index);
    if (idx < 0 || idx >= s.closurePeriods.length)
      return res.status(400).json({ error: "Invalid index" });
    s.closurePeriods.splice(idx, 1);
    await s.save();
    res.json(s);
  } catch (err) { res.status(500).json({ error: "Failed to remove closure" }); }
});

// ══════════════════════════════════════════════════════════════════
//  PUBLIC SETTINGS endpoint (no auth — used by Booking.jsx & Home)
// ══════════════════════════════════════════════════════════════════
// Note: registered BEFORE the router.use(verifyToken) so it's public.
// We export a separate mini-router for this.
export const publicSettingsRouter = express.Router();
publicSettingsRouter.get("/", async (req, res) => {
  try {
    const s = await getSettings();
    // Only expose what the frontend needs
    res.json({
      bookingsFrozen:     s.bookingsFrozen,
      bookingsFrozenMsg:  s.bookingsFrozenMsg,
      closurePeriods:     s.closurePeriods,
      announcementActive: s.announcementActive,
      announcementText:   s.announcementText,
      announcementType:   s.announcementType,
      announcementExpiry: s.announcementExpiry,
      openTime:           s.openTime,
      closeTime:          s.closeTime,
      closedDays:         s.closedDays,
    });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

export default router;