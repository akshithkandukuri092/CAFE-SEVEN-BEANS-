/**
 * Bookingstore.jsx
 * ─────────────────────────────────────────────────────────────────
 * Central data layer for Seven Beans.
 *
 * • saveBooking      – POST to backend; falls back to localStorage ONLY on network errors
 * • getBookingsFromAPI – GET from backend; falls back to localStorage
 * • cancelBooking    – PUT /cancel to backend; updates localStorage copy
 * • saveReview       – POST review to backend; stores in localStorage too
 * • getReviews       – returns reviews from localStorage (used by Home)
 * • hasReviewed      – checks whether user already reviewed a booking
 * • getAvailabilityMap – reads localStorage bookings for seat-map overlay
 * • getCancellationBreakdown – pure calculation helper
 * • getPublicSettings – fetches public cafe settings (freeze, closures, etc)
 * ─────────────────────────────────────────────────────────────────
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
import { Monitor, PartyPopper, Users, Coffee } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────

async function getToken(user) {
  if (!user) return null;
  try {
    return await user.getIdToken(/* forceRefresh= */ false);
  } catch {
    return null;
  }
}

function ls_get(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function ls_set(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.warn("localStorage write failed:", e); }
}

// ── Public Settings ───────────────────────────────────────────────

export async function getPublicSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Unit definitions (seat map) ───────────────────────────────────

export const UNITS_FOR_TYPE = {
  workspace: [
    { id: "pod1",  label: "Pod 1",  icon: <Monitor size={16} /> },
    { id: "pod2",  label: "Pod 2",  icon: <Monitor size={16} /> },
    { id: "pod3",  label: "Pod 3",  icon: <Monitor size={16} /> },
    { id: "pod4",  label: "Pod 4",  icon: <Monitor size={16} /> },
    { id: "pod5",  label: "Pod 5",  icon: <Monitor size={16} /> },
    { id: "pod6",  label: "Pod 6",  icon: <Monitor size={16} /> },
  ],
  birthday: [
    { id: "hall1", label: "Hall 1", icon: <PartyPopper size={16} /> },
    { id: "hall2", label: "Hall 2", icon: <PartyPopper size={16} /> },
  ],
  conference: [
    { id: "room1", label: "Room 1", icon: <Users size={16} /> },
    { id: "room2", label: "Room 2", icon: <Users size={16} /> },
  ],
  cafe: [
    { id: "seat1", label: "Seat 1", icon: <Coffee size={16} /> },
    { id: "seat2", label: "Seat 2", icon: <Coffee size={16} /> },
    { id: "seat3", label: "Seat 3", icon: <Coffee size={16} /> },
    { id: "seat4", label: "Seat 4", icon: <Coffee size={16} /> },
    { id: "seat5", label: "Seat 5", icon: <Coffee size={16} /> },
    { id: "seat6", label: "Seat 6", icon: <Coffee size={16} /> },
  ],
};

// ── Date helper ───────────────────────────────────────────────────

export function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

// ── saveBooking ───────────────────────────────────────────────────
/**
 * Saves a booking to the backend API.
 *
 * Throws:
 *  - "NOT_LOGGED_IN"        – no user
 *  - "NO_UNIT_SELECTED"     – unitId missing
 *  - "SLOT_UNAVAILABLE"     – 409 from server (double booking)
 *  - "AUTH_ERROR"           – 401 from server (bad/expired token)
 *  - "BOOKING_SAVED_OFFLINE"– network unreachable, saved to localStorage only
 */
export async function saveBooking(user, bookingData) {
  if (!user) throw new Error("NOT_LOGGED_IN");
  if (!bookingData.unitId) throw new Error("NO_UNIT_SELECTED");

  // Always get a fresh token so it doesn't silently expire
  let token;
  try {
    token = await user.getIdToken(/* forceRefresh= */ true);
  } catch (e) {
    console.error("Could not get Firebase token:", e.message);
    throw new Error("AUTH_ERROR");
  }

  // ── Try API ──────────────────────────────────────────────────────
  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });

    // Auth failure — token is invalid, don't silently fall back
    if (res.status === 401) {
      throw new Error("AUTH_ERROR");
    }

    // Slot already taken
    if (res.status === 409) {
      throw new Error("SLOT_UNAVAILABLE");
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (errBody.error === "SLOT_UNAVAILABLE") throw new Error("SLOT_UNAVAILABLE");
      throw new Error(errBody.error || "API_ERROR");
    }

    const saved = await res.json();

    // Mirror to localStorage so the seat-map overlay works offline too
    _appendLocalBooking({
      ...bookingData,
      _id: saved._id,
      id:  saved._id,
      status:    "confirmed",
      createdAt: saved.createdAt || new Date().toISOString(),
    });

    return saved;

  } catch (err) {
    // Re-throw errors that must NOT fall back to localStorage
    if (
      err.message === "SLOT_UNAVAILABLE" ||
      err.message === "NO_UNIT_SELECTED" ||
      err.message === "AUTH_ERROR"
    ) {
      throw err;
    }

    // Only true network failures (fetch rejected) fall back to offline save
    if (err instanceof TypeError && err.message.includes("fetch")) {
      console.warn("Network unreachable — saving booking locally:", err.message);
      // ── Offline fallback (network down only) ─────────────────────────
      const localBooking = {
        ...bookingData,
        _id:       `local_${Date.now()}`,
        id:        `local_${Date.now()}`,
        userId:    user.uid,
        status:    "confirmed",
        createdAt: new Date().toISOString(),
      };
      _appendLocalBooking(localBooking);
      throw new Error("BOOKING_SAVED_OFFLINE");
    } else {
      // Server returned an error, we should NOT fall back to offline, we should show the error!
      throw err;
    }
  }
}

/**
 * Confirms a booking after successful payment.
 */
export async function confirmBookingPayment(user, bookingId, razorpayPaymentId) {
  if (!user) throw new Error("NOT_LOGGED_IN");

  let token;
  try {
    token = await user.getIdToken(true);
  } catch {
    throw new Error("AUTH_ERROR");
  }

  const res = await fetch(`${API_BASE}/bookings/${bookingId}/confirm-payment`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ razorpayPaymentId }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (errBody.error === "OVERRIDDEN") {
      throw new Error("OVERRIDDEN");
    }
    throw new Error(errBody.error || "Failed to confirm payment");
  }

  const updated = await res.json();

  // Update local storage status to match confirmed status
  const all = ls_get("sb_bookings", []);
  const idx = all.findIndex(b => (b._id || b.id) === bookingId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status: "confirmed", razorpayPaymentId };
    ls_set("sb_bookings", all);
  }

  return updated;
}

/**
 * Deletes/Releases a pending booking when payment is cancelled or abandoned.
 */
export async function cancelPendingBooking(user, bookingId) {
  if (!user) return;

  let token;
  try {
    token = await user.getIdToken(true);
  } catch {
    return;
  }

  try {
    await fetch(`${API_BASE}/bookings/${bookingId}/cancel-pending`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    // Remove from local storage
    const all = ls_get("sb_bookings", []);
    const filtered = all.filter(b => (b._id || b.id) !== bookingId);
    ls_set("sb_bookings", filtered);
  } catch (err) {
    console.error("Failed to cancel pending booking on server:", err);
  }
}

function _appendLocalBooking(booking) {
  const all      = ls_get("sb_bookings", []);
  const filtered = all.filter(b => (b._id || b.id) !== (booking._id || booking.id));
  ls_set("sb_bookings", [booking, ...filtered]);
}

// ── getBookingsFromAPI ────────────────────────────────────────────

export async function getBookingsFromAPI(user) {
  if (!user) return [];

  let token;
  try {
    token = await user.getIdToken(true);
  } catch {
    return ls_get("sb_bookings", []).filter(b => !b.userId || b.userId === user.uid);
  }

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Merge API data into localStorage so seat-map stays accurate
    ls_set("sb_bookings", data);
    return data;
  } catch (err) {
    console.warn("API fetch failed, using localStorage:", err.message);
    const all = ls_get("sb_bookings", []);
    return all.filter(b => !b.userId || b.userId === user.uid);
  }
}

// ── cancelBooking ─────────────────────────────────────────────────

export async function cancelBooking(user, bookingId) {
  if (!user) throw new Error("NOT_LOGGED_IN");

  let token;
  try {
    token = await user.getIdToken(true);
  } catch {
    throw new Error("AUTH_ERROR");
  }

  const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
    method: "PUT",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to cancel booking");
  }

  const updated = await res.json();

  // Update localStorage mirror
  const all = ls_get("sb_bookings", []);
  ls_set("sb_bookings", all.map(b =>
    (b._id === bookingId || b.id === bookingId) ? { ...b, status: "cancelled" } : b
  ));

  return updated;
}

/**
 * Processes a refund for a cancelled booking.
 */
export async function processBookingRefund(user, bookingId) {
  if (!user) throw new Error("NOT_LOGGED_IN");

  let token;
  try {
    token = await user.getIdToken(true);
  } catch {
    throw new Error("AUTH_ERROR");
  }

  const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/refund`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to process refund");
  }

  const updated = await res.json();

  // Update local storage mirror
  const all = ls_get("sb_bookings", []);
  ls_set("sb_bookings", all.map(b =>
    (b._id === bookingId || b.id === bookingId) ? { ...b, refundStatus: "refunded", refundAmount: updated.refundAmount } : b
  ));

  return updated;
}

// ── Reviews ───────────────────────────────────────────────────────

export function saveReview(reviewData) {
  const reviews = ls_get("sb_reviews", []);
  const updated = reviews.filter(r => r.bookingId !== reviewData.bookingId);
  const newReview = {
    ...reviewData,
    id:        `rev_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  ls_set("sb_reviews", [newReview, ...updated]);
}

export function getReviews() {
  return ls_get("sb_reviews", []);
}

export function hasReviewed(bookingId) {
  if (!bookingId) return false;
  const reviews = ls_get("sb_reviews", []);
  return reviews.some(r => r.bookingId === String(bookingId));
}

// ── Availability map for seat map ─────────────────────────────────
/**
 * Returns { [unitId]: { [slot]: "booked" | "free" } }
 * Built from localStorage bookings that aren't cancelled.
 */
export function getAvailabilityMap(spaceId, date, slots) {
  const all      = ls_get("sb_bookings", []);
  const relevant = all.filter(
    b => b.spaceId === spaceId && b.date === date && b.status !== "cancelled"
  );

  const units = UNITS_FOR_TYPE[spaceId] || [];
  const map   = {};

  for (const unit of units) {
    map[unit.id] = {};
    for (const slot of slots) {
      const taken = relevant.some(
        b => b.unitId === unit.id && (b.slots || [b.slot]).includes(slot)
      );
      map[unit.id][slot] = taken ? "booked" : "free";
    }
  }

  return map;
}

// ── Cancellation breakdown helper ─────────────────────────────────

export function getCancellationBreakdown(booking) {
  const spacePrice     = booking.spacePrice || 0;
  const foodTotal      = booking.foodTotal  || 0;
  const spaceNonRefund = Math.round(spacePrice * 0.3);
  const refundAmount   = Math.round(spacePrice * 0.7);
  return { spacePrice, foodTotal, spaceNonRefund, refundAmount };
}