import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./Authcontext";
import {
  saveBooking,
  getAvailabilityMap,
  UNITS_FOR_TYPE,
  getTodayString,
  getPublicSettings,
  confirmBookingPayment,
  cancelPendingBooking,
} from "./Bookingstore";
import { Cake, Coffee, Lock, Megaphone } from "lucide-react";
import "./Booking.css";

// ── Space definitions ─────────────────────────────────────────────
export const SPACES = [
  {
    id: "workspace",
    image: "/workspace.jpeg",
    label: "Focus Workspace",
    desc: "Quiet workspace with charging docks and natural lighting.",
    priceUnit: "hour",
    price: 250,
    maxGuests: 4,
    advanceMinutes: 45,
    slots: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"],
    multiSlot: true,
    featured: true,
    statusText: "Popular with startup teams",
  },
  {
    id: "conference",
    image: "/meeting.jpg",
    label: "Conference Room",
    desc: "Soundproof space with screen and acoustic dampening.",
    priceUnit: "hour",
    price: 799,
    maxGuests: 20,
    advanceMinutes: 45,
    slots: ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
    multiSlot: true,
    statusText: "Next slot available: 2:00 PM",
  },
  {
    id: "birthday",
    image: "/birthday.jpg",
    label: "Birthday Hall",
    desc: "Outdoor event space with custom ambient lighting.",
    priceUnit: "hour",
    price: 2499,
    maxGuests: 40,
    advanceMinutes: 60,
    slots: ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
    multiSlot: true,
    durationHoursPerSlot: 2,
    statusText: "Available today",
  },
  {
    id: "cafe",
    image: "/story.jpg",
    label: "Just Coffee",
    desc: "Premium pour-overs and open window counter seating.",
    priceUnit: "walk-in",
    price: 0,
    maxGuests: 6,
    advanceMinutes: 0,
    slots: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"],
    multiSlot: false,
    statusText: "Walk-ins welcome",
  },
];

export const MENU_ITEMS = [
  { id: "m1", cat: "Bites", name: "Chip an Dip", desc: "Potato chips with tzatziki", price: 150 },
  { id: "m2", cat: "Bites", name: "Nachos", desc: "Crispy nachos with salsa & cheese", price: 200 },
  { id: "m3", cat: "Bites", name: "Woodfired Garlic Bread", desc: "Rustic garlic bread from the oven", price: 150 },
  { id: "m4", cat: "Bites", name: "Crunchy Nuggets", desc: "Crumb-coated vegetarian nuggets", price: 150 },
  { id: "m5", cat: "Bites", name: "French Fries", desc: "Classic peri-peri / sriracha chilli", price: 150 },
  { id: "m6", cat: "Bites", name: "Grilled Corn Ribs", desc: "Oven grilled corn, chilli garlic & lime", price: 180 },
  { id: "m7", cat: "Toasties", name: "Cheese Chilli Toast", desc: "Cheese, chilli, chopped capsicum", price: 180 },
  { id: "m8", cat: "Toasties", name: "Avocado Toast", desc: "Avocado mash with vegetable spread", price: 225 },
  { id: "m9", cat: "Toasties", name: "Corn & Cheese Sandwich", desc: "Sweet corn and melted cheese", price: 180 },
  { id: "m10", cat: "Toasties", name: "Paneer Tikka Sandwich", desc: "Onions, tomato & mint chutney", price: 200 },
  { id: "m11", cat: "Pizzas", name: "Margherita", desc: "Tomato sauce and mozzarella", price: 325 },
  { id: "m12", cat: "Pizzas", name: "Corn and Cheese", desc: "Corn, cheese and mozzarella", price: 350 },
  { id: "m13", cat: "Pizzas", name: "Tandoori Paneer", desc: "Tandoori paneer, onion, capsicum & mozzarella", price: 395 },
  { id: "m14", cat: "Pizzas", name: "Mushroom Delight", desc: "White sauce, button mushrooms, black olives", price: 395 },
  { id: "m15", cat: "Pasta", name: "Arrabiata", desc: "Garlic, capsicum, babycorn in tomato sauce", price: 250 },
  { id: "m16", cat: "Pasta", name: "Alfredo", desc: "Corn, broccoli in creamy white sauce", price: 250 },
  { id: "m17", cat: "Pasta", name: "Pesto", desc: "Pasta with classic basil pesto sauce", price: 250 },
  { id: "m18", cat: "Health", name: "Sautéed Veggies", desc: "Seasonal vegetables in olive oil", price: 225 },
  { id: "m19", cat: "Health", name: "Granola Bowl", desc: "Crunchy granola with yogurt & fresh fruits", price: 250 },
  { id: "m20", cat: "Health", name: "Green Salad", desc: "A mix of fresh garden greens", price: 180 },
  { id: "m21", cat: "Health", name: "Caesar Salad", desc: "Lettuce, parmesan & croutons", price: 225 },
  { id: "m22", cat: "Health", name: "Greek Salad", desc: "Cucumbers, olives, cherry tomato & feta", price: 225 },
];

const STEPS = ["Pick Your Seat", "Food Pre-order", "Review & Confirm"];

export function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function slotToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isSlotTooSoon(date, slotTime, advanceMinutes) {
  if (advanceMinutes === 0) return false;
  const today = getTodayString();
  if (date !== today) return false;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const slotMins = slotToMinutes(slotTime);
  return slotMins - nowMins < advanceMinutes;
}

// ── Live availability fetcher ─────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function fetchLiveAvailability(spaceId, date, slots) {
  try {
    const res = await fetch(
      `${API_BASE}/bookings/availability?spaceId=${spaceId}&date=${date}`
    );
    if (!res.ok) throw new Error("API error");
    return await res.json(); // { [unitId]: { [slot]: "booked"|"free" } }
  } catch {
    // Fallback to localStorage if backend is unreachable
    return getAvailabilityMap(spaceId, date, slots);
  }
}

// ── Multi-slot SeatMap ────────────────────────────────────────────
function SeatMap({ space, date, selectedUnit, selectedSlots, onSelect }) {
  const [availMap, setAvailMap] = useState({});
  const [loadingMap, setLoadingMap] = useState(true);
  const units = UNITS_FOR_TYPE[space.id] || [];

  useEffect(() => {
    let cancelled = false;
    setLoadingMap(true);

    const load = async () => {
      const map = await fetchLiveAvailability(space.id, date, space.slots);
      if (!cancelled) {
        setAvailMap(map);
        setLoadingMap(false);
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [space.id, date]);

  const legend = [
    { status: "free", label: "Available" },
    { status: "selected", label: "Your Pick" },
    { status: "booked", label: "Booked" },
    { status: "past", label: "Unavailable" },
  ];

  const handleSeatClick = (unitId, slot) => {
    const status = availMap[unitId]?.[slot] ?? "free";
    if (status !== "free") return;
    if (isSlotTooSoon(date, slot, space.advanceMinutes)) return;

    if (!space.multiSlot) {
      if (selectedUnit === unitId && selectedSlots.includes(slot)) {
        onSelect("", []);
      } else {
        onSelect(unitId, [slot]);
      }
      return;
    }

    if (selectedUnit && selectedUnit !== unitId) {
      onSelect(unitId, [slot]);
      return;
    }

    const current = [...selectedSlots];
    const idx = current.indexOf(slot);
    if (idx >= 0) {
      const removed = current.filter(s => s !== slot);
      const sortedCurrent = [...current].sort((a, b) => slotToMinutes(a) - slotToMinutes(b));
      if (slot === sortedCurrent[0] || slot === sortedCurrent[sortedCurrent.length - 1]) {
        onSelect(unitId, removed.length > 0 ? removed : null);
      }
      return;
    }

    if (current.length === 0) {
      onSelect(unitId, [slot]);
      return;
    }
    const allSlots = space.slots;
    const sortedSel = [...current].sort((a, b) => slotToMinutes(a) - slotToMinutes(b));
    const firstIdx = allSlots.indexOf(sortedSel[0]);
    const lastIdx = allSlots.indexOf(sortedSel[sortedSel.length - 1]);
    const thisIdx = allSlots.indexOf(slot);
    if (thisIdx === firstIdx - 1 || thisIdx === lastIdx + 1) {
      onSelect(unitId, [...current, slot]);
    } else {
      onSelect(unitId, [slot]);
    }
  };

  const getSeatStatus = (unitId, slot) => {
    const isSelected = selectedUnit === unitId && selectedSlots.includes(slot);
    if (isSelected) return "selected";
    const mapStatus = availMap[unitId]?.[slot] ?? "free";
    if (mapStatus !== "free") return mapStatus;
    if (isSlotTooSoon(date, slot, space.advanceMinutes)) return "past";
    return "free";
  };

  const getSpaceZoneLabel = () => {
    switch (space.id) {
      case "workspace":
        return "Quiet Zone · Desks face window side ☀️";
      case "conference":
        return "Screen Side · Acoustic Room Layout";
      case "birthday":
        return "Main Stage Side · Birthday Party";
      case "cafe":
        return "Coffee Counter · Window View Seating";
      default:
        return "⬆ Main entrance direction";
    }
  };

  const totalSelectedHours = space.durationHoursPerSlot
    ? selectedSlots.length * space.durationHoursPerSlot
    : selectedSlots.length;

  const pricePerUnit = space.durationHoursPerSlot
    ? space.price * space.durationHoursPerSlot
    : space.price;

  return (
    <>
      {loadingMap && (
        <div className="sm-loading">⏳ Loading live availability…</div>
      )}
      <div className="sm-wrap">
        <div className="sm-legend">
          {legend.map(l => (
            <div className="sm-legend-item" key={l.status}>
              <div className={`sm-legend-dot ${l.status}`} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>

        {space.multiSlot && (
          <div className="sm-multi-hint">
            💡 Select multiple time slots for a longer session. Slots must be consecutive within the same {space.id === "birthday" ? "hall" : "pod/room"}.
          </div>
        )}

        {space.advanceMinutes > 0 && (
          <div className="sm-advance-note">
            ⏱ Bookings must be made at least {space.advanceMinutes} minutes before the slot time. Greyed slots are unavailable.
          </div>
        )}

        <div className="sm-screen"><span>{getSpaceZoneLabel()}</span></div>

        <div className="sm-grid-wrap">
          <div className="sm-col-headers">
            <div className="sm-row-label-empty" />
            {space.slots.map(slot => (
              <div className="sm-col-header" key={slot}>{formatTime(slot)}</div>
            ))}
          </div>

          {units.map(unit => (
            <div className="sm-row" key={unit.id}>
              <div className="sm-row-label">
                <span className="sm-unit-icon">{unit.icon}</span>
                <span>{unit.label}</span>
              </div>
              {space.slots.map(slot => {
                const st = getSeatStatus(unit.id, slot);
                const clickable = st === "free" || st === "selected";
                return (
                  <button
                    key={slot}
                    className={`sm-seat ${st}`}
                    disabled={!clickable}
                    onClick={() => handleSeatClick(unit.id, slot)}
                    title={
                      st === "booked" ? "Already booked" :
                        st === "past" ? "Unavailable / too soon" :
                          st === "selected" ? `Selected — ${unit.label} at ${formatTime(slot)}` :
                            `Book ${unit.label} at ${formatTime(slot)}`
                    }
                  >
                    {st === "selected" ? "✓" : st === "booked" ? "✕" : st === "past" ? "—" : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {selectedUnit && selectedSlots.length > 0 && (() => {
          const unit = units.find(u => u.id === selectedUnit);
          const sorted = [...selectedSlots].sort((a, b) => slotToMinutes(a) - slotToMinutes(b));
          return (
            <div className="sm-selection-bar">
              <div className="sm-selection-info">
                <span className="sm-selection-icon">{unit?.icon}</span>
                <div>
                  <div className="sm-selection-title">
                    {unit?.label} · {formatTime(sorted[0])}{sorted.length > 1 ? ` — ${formatTime(sorted[sorted.length - 1])}` : ""}
                  </div>
                  <div className="sm-selection-sub">
                    {sorted.length} slot{sorted.length > 1 ? "s" : ""} selected
                    {" · "}{totalSelectedHours} hour{totalSelectedHours > 1 ? "s" : ""} total
                    {space.multiSlot && " · Click adjacent slots to extend"}
                  </div>
                </div>
              </div>
              <div className="sm-selection-price">
                {space.price === 0 ? "Free" : `₹${(pricePerUnit * selectedSlots.length).toLocaleString("en-IN")}`}
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}

// ── Main Booking component ────────────────────────────────────────
export default function Booking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const preSelected = location.state?.spaceType || "workspace";
  const preSelectedDate = location.state?.date || getTodayString();
  const preSelectedGuests = location.state?.guests || 1;

  const [step, setStep] = useState(0);
  const [spaceId, setSpaceId] = useState(preSelected);
  const [date, setDate] = useState(preSelectedDate);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [guests, setGuests] = useState(preSelectedGuests);
  const [addons, setAddons] = useState({});
  const [saving, setSaving] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getPublicSettings().then(s => {
      if (s) setSettings(s);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        state: {
          from: "/booking",
          spaceType: spaceId,
          date,
          guests
        },
        replace: true
      });
    }
  }, [user]);

  useEffect(() => {
    setSelectedUnit("");
    setSelectedSlots([]);
    
    // Auto-adjust guests if it exceeds maxGuests for the selected space
    const targetSpace = SPACES.find(s => s.id === spaceId);
    if (targetSpace && guests > targetSpace.maxGuests) {
      setGuests(targetSpace.maxGuests);
    }
  }, [spaceId, date]);

  const space = SPACES.find(s => s.id === spaceId);

  const toggleAddon = (id, price) =>
    setAddons(prev => {
      const n = { ...prev };
      if (n[id]) delete n[id]; else n[id] = { qty: 1, price };
      return n;
    });

  const changeQty = (id, delta) =>
    setAddons(prev => {
      const n = { ...prev };
      if (!n[id]) return n;
      const q = n[id].qty + delta;
      if (q <= 0) delete n[id]; else n[id] = { ...n[id], qty: q };
      return n;
    });

  const hoursPerSlot = space.durationHoursPerSlot || 1;
  const totalHours = selectedSlots.length * hoursPerSlot || hoursPerSlot;
  const foodTotal = Object.values(addons).reduce((s, { qty, price }) => s + qty * price, 0);
  const spacePrice = space.price === 0 ? 0 : space.price * totalHours;
  const grandTotal = spacePrice + foodTotal;

  const menuByCategory = MENU_ITEMS.reduce((acc, item) => {
    if (!acc[item.cat]) acc[item.cat] = [];
    acc[item.cat].push(item);
    return acc;
  }, {});

  const unitLabel = UNITS_FOR_TYPE[spaceId]?.find(u => u.id === selectedUnit)?.label || "";
  const unitIcon = UNITS_FOR_TYPE[spaceId]?.find(u => u.id === selectedUnit)?.icon || space.icon;

  const sortedSlots = [...selectedSlots].sort((a, b) => slotToMinutes(a) - slotToMinutes(b));
  const firstSlot = sortedSlots[0] || "";

  const canGoToSeat = date >= getTodayString();
  const canGoToFood = !!selectedUnit && selectedSlots.length > 0;
  const canGoToReview = canGoToFood;

  const durationLabel = selectedSlots.length > 0
    ? `${totalHours} hour${totalHours > 1 ? "s" : ""}`
    : `${hoursPerSlot} hour`;

  const handleSeatSelect = useCallback((unitId, slots) => {
    setSelectedUnit(slots && slots.length > 0 ? unitId : "");
    setSelectedSlots(slots || []);
    setBookingError("");
  }, []);

  const jumpToStep = (targetStep) => {
    if (
      targetStep < step ||
      (targetStep === 1 && canGoToFood) ||
      (targetStep === 2 && canGoToReview)
    ) {
      setStep(targetStep);
    }
  };

  // ── Secure Confirm Flow: Reserve pending booking, pay, then confirm ──
  const handleConfirm = async () => {
    setSaving(true);
    setBookingError("Checking slot availability & reserving slot...");

    const foodItems = Object.entries(addons).map(([id, { qty, price }]) => {
      const item = MENU_ITEMS.find(m => m.id === id);
      return { id, name: item.name, qty, price };
    });

    const bookingPayload = {
      spaceId, spaceLabel: space.label,
      spaceIcon: typeof space.icon === "string" ? space.icon : "",
      unitId: selectedUnit, unitLabel,
      unitIcon: typeof unitIcon === "string" ? unitIcon : "",
      date, slot: firstSlot, slots: sortedSlots,
      duration: durationLabel, durationHrs: totalHours,
      guests, spacePrice, foodItems, foodTotal, grandTotal,
      userName: user.displayName || user.email.split("@")[0],
      userEmail: user.email,
    };

    // If total is 0 (free spaces like "Just Coffee"), skip payment and create direct confirmed booking
    if (grandTotal === 0) {
      try {
        await saveBooking(user, bookingPayload);
        navigate("/dashboard", { state: { justBooked: true } });
      } catch (err) {
        if (err.message === "BOOKING_SAVED_OFFLINE") {
          navigate("/dashboard", { state: { justBooked: true } });
          return;
        }
        setBookingError(`Booking failed: ${err.message}`);
        setSaving(false);
      }
      return;
    }

    // Step 1: Create pending booking in database to block/secure the slot
    let pendingBooking;
    try {
      pendingBooking = await saveBooking(user, bookingPayload);
    } catch (err) {
      if (err.message === "SLOT_UNAVAILABLE") {
        setBookingError("The selected slot is no longer available. Please pick another seat or slot.");
      } else {
        setBookingError(`Failed to initiate booking: ${err.message}`);
      }
      setSaving(false);
      return;
    }

    const bookingId = pendingBooking._id || pendingBooking.id;

    // Step 2: Open Razorpay payment popup
    setBookingError("");
    const options = {
      key: "rzp_test_SgnU60Z0cnw89b", // 🔑 Razorpay Key ID
      amount: grandTotal * 100,       // Razorpay expects amount in paise
      currency: "INR",
      name: "Cafe Seven Beans",
      description: `Booking: ${space.label}`,
      image: "/favicon.ico",
      prefill: {
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
      },
      theme: { color: "#6b3a1f" },

      handler: async function (response) {
        setSaving(true);
        setBookingError("Verifying payment transaction and confirming slot...");
        try {
          // Confirm booking with payment ID
          await confirmBookingPayment(user, bookingId, response.razorpay_payment_id);
          navigate("/dashboard", { state: { justBooked: true } });
        } catch (err) {
          if (err.message === "OVERRIDDEN") {
            setBookingError("Payment went through, but your reservation was released to a higher-paying request. An auto-refund has been initiated.");
          } else {
            setBookingError(`Payment succeeded but booking confirmation failed: ${err.message}`);
          }
          setSaving(false);
        }
      },

      modal: {
        ondismiss: async function () {
          setSaving(true);
          setBookingError("Releasing slot...");
          try {
            // Cancel and release the pending booking slot
            await cancelPendingBooking(user, bookingId);
          } catch (err) {
            console.error("Failed to release slot:", err);
          }
          setBookingError("Payment cancelled. Your pending slot was released.");
          setSaving(false);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="bk-page">
      {/* ── GLOBAL BANNERS ── */}
      {settings?.bookingsFrozen && (
        <div style={{ background: "var(--adm-red, #dc2626)", color: "white", textAlign: "center", padding: "10px", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", zIndex: 1000, position: "relative" }}>
          <Lock size={16} />
          {settings.bookingsFrozenMsg || "Bookings are currently closed."}
        </div>
      )}
      {settings?.announcementActive && settings?.announcementText && (
        <div style={{ background: settings.announcementType === "info" ? "#3b82f6" : settings.announcementType === "success" ? "#10b981" : "#f59e0b", color: "white", textAlign: "center", padding: "10px", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", zIndex: 1000, position: "relative" }}>
          <Megaphone size={16} />
          {settings.announcementText}
        </div>
      )}

      {/* Header */}
      <header className="bk-header">
        <button className="bk-back-btn" onClick={() => navigate("/")}>← Seven Beans</button>
        <div className="bk-header-title">Reserve a Space</div>
        <div className="bk-user-pill">
          {user?.photoURL
            ? <img src={user.photoURL} className="bk-avatar-img" alt="avatar" />
            : <div className="bk-avatar-init">{(user?.email || "?")[0].toUpperCase()}</div>}
          <span>{user?.displayName || user?.email?.split("@")[0]}</span>
        </div>
      </header>

      <div className="bk-body-centered">
        {/* Minimal Connected Progress Flow */}
        <nav className="bk-progress-trail">
          {STEPS.map((label, i) => {
            const isActive = i === step;
            const isDone = i < step;
            const isSelectable = i < step || (i === 1 && canGoToFood) || (i === 2 && canGoToReview);
            
            return (
              <div
                key={label}
                className={`bk-progress-node-wrap ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
              >
                <button
                  className="bk-progress-node"
                  disabled={!isSelectable}
                  onClick={() => isSelectable && jumpToStep(i)}
                  style={{ cursor: isSelectable ? "pointer" : "default" }}
                >
                  <span className="bk-progress-text">{label}</span>
                </button>
                {i < STEPS.length - 1 && <span className="bk-progress-arrow">→</span>}
              </div>
            );
          })}
        </nav>

        {/* ── MAIN CANVAS: Centered Wizard Card ── */}
        <main className="bk-main-canvas-centered">
          {/* ── STEP 0: Seat Map ── */}
          {step === 0 && (
            <div className="bk-section fade-in">
              <div className="bk-seat-header">
                <div>
                  <h2 className="bk-section-title">Where do you want to sit?</h2>
                  <p className="bk-seat-sub">
                    Select a pod or table from the live map below.
                  </p>
                </div>
              </div>

              {bookingError && <div className="bk-error-bar">{bookingError}</div>}

              <div className="sm-inline-controls">
                <div className="sm-control-item">
                  <label>Space Type</label>
                  <select value={spaceId} onChange={e => setSpaceId(e.target.value)}>
                    {SPACES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm-control-divider" />
                <div className="sm-control-item">
                  <label>Date</label>
                  <input
                    type="date"
                    value={date}
                    min={getTodayString()}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
                <div className="sm-control-divider" />
                <div className="sm-control-item">
                  <label>Guests</label>
                  <select value={guests} onChange={e => setGuests(Number(e.target.value))}>
                    {Array.from({ length: space.maxGuests }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "guest" : "guests"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <SeatMap
                space={space}
                date={date}
                selectedUnit={selectedUnit}
                selectedSlots={selectedSlots}
                onSelect={handleSeatSelect}
              />

              <div className="bk-step-nav" style={{ marginTop: 24, justifyContent: "flex-end" }}>
                <button className="bk-next-btn" style={{ marginTop: 0 }}
                  disabled={!canGoToFood} onClick={() => setStep(1)}>
                  Next: Pre-order Food →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Food ── */}
          {step === 1 && (
            <div className="bk-section fade-in">
              <div className="bk-food-header">
                <div>
                  <h2 className="bk-section-title">Grab a bite</h2>
                  <p className="bk-food-sub">Have your food ready the moment you arrive. Optional — but note food orders are non-refundable.</p>
                </div>
                <button className="bk-skip-btn" onClick={() => setStep(2)}>Skip →</button>
              </div>

              {Object.entries(menuByCategory).map(([cat, items]) => (
                <div key={cat} className="bk-menu-cat">
                  <div className="bk-cat-label">{cat}</div>
                  <div className="bk-menu-list">
                    {items.map(item => {
                      const inCart = addons[item.id];
                      return (
                        <div key={item.id} className={`bk-menu-item ${inCart ? "selected" : ""}`}>
                          <div className="bk-menu-info">
                            <div className="bk-menu-name">{item.name}</div>
                            <div className="bk-menu-desc">{item.desc}</div>
                            <div className="bk-menu-price">₹{item.price}</div>
                          </div>
                          <div className="bk-menu-action">
                            {!inCart
                              ? <button className="bk-add-btn" onClick={() => toggleAddon(item.id, item.price)}>+ Add</button>
                              : <div className="bk-qty-control">
                                  <button onClick={() => changeQty(item.id, -1)}>−</button>
                                  <span>{inCart.qty}</span>
                                  <button onClick={() => changeQty(item.id, 1)}>+</button>
                                </div>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {Object.keys(addons).length > 0 && (
                <div className="bk-cart-bar">
                  <div className="bk-cart-count">{Object.values(addons).reduce((s, v) => s + v.qty, 0)} item(s)</div>
                  <div className="bk-cart-total">Food subtotal: ₹{foodTotal.toLocaleString("en-IN")}</div>
                  <div className="bk-cart-note">Non-refundable</div>
                </div>
              )}

              <div className="bk-step-nav">
                <button className="bk-prev-btn" onClick={() => setStep(0)}>← Back</button>
                <button className="bk-next-btn" onClick={() => setStep(2)}>Review Booking →</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Review ── */}
          {step === 2 && (
            <div className="bk-section fade-in">
              <h2 className="bk-section-title">Review Your Booking</h2>

              {bookingError && <div className="bk-error-bar">{bookingError}</div>}

              <div className="bk-review-card">
                {[
                  ["Space", space.label],
                  ["Seat", unitLabel],
                  ["Date", new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })],
                  ["Arrival", firstSlot ? formatTime(firstSlot) : "—"],
                  ["Duration", durationLabel],
                  ["Slots", sortedSlots.length > 1 ? sortedSlots.map(formatTime).join(", ") : formatTime(firstSlot)],
                  ["Guests", `${guests} ${guests === 1 ? "guest" : "guests"}`],
                ].map(([label, val]) => (
                  <div className="bk-review-row" key={label}>
                    <div className="bk-review-label">{label}</div>
                    <div className="bk-review-val">{val}</div>
                  </div>
                ))}
              </div>

              {Object.keys(addons).length > 0 && (
                <div className="bk-review-food">
                  <div className="bk-review-food-title">Pre-ordered Food <span className="bk-nonrefund-tag">Non-refundable</span></div>
                  {Object.entries(addons).map(([id, { qty, price }]) => {
                    const item = MENU_ITEMS.find(m => m.id === id);
                    return (
                      <div className="bk-review-food-row" key={id}>
                        <span>{item.name} × {qty}</span>
                        <span>₹{(qty * price).toLocaleString("en-IN")}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bk-total-box">
                {space.price > 0 && (
                  <div className="bk-total-row">
                    <span>Space charge</span>
                    <span>₹{spacePrice.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {foodTotal > 0 && (
                  <div className="bk-total-row">
                    <span>Food pre-order</span>
                    <span>₹{foodTotal.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="bk-total-row grand">
                  <span>Total</span>
                  <span>{grandTotal === 0 ? "Free" : `₹${grandTotal.toLocaleString("en-IN")}`}</span>
                </div>
                <div className="bk-tax-note">* Prices exclusive of taxes · Preparation time 15 min</div>
              </div>

              <div className="bk-policy-box">
                <div className="bk-policy-title">Cancellation Policy</div>
                {foodTotal > 0 && (
                  <div className="bk-policy-item">🍽️ Food pre-order (₹{foodTotal.toLocaleString("en-IN")}): <strong>Non-refundable</strong></div>
                )}
                {spacePrice > 0 && (
                  <>
                    <div className="bk-policy-item">🏠 Space charge: <strong>30% non-refundable</strong> (₹{Math.round(spacePrice * 0.3).toLocaleString("en-IN")})</div>
                    <div className="bk-policy-item">✅ Refund on cancellation: <strong>₹{Math.round(spacePrice * 0.7).toLocaleString("en-IN")}</strong> (70% of space charge)</div>
                  </>
                )}
              </div>

              <div className="bk-step-nav">
                <button className="bk-prev-btn" onClick={() => setStep(1)}>← Back</button>
                <button className="bk-confirm-btn" onClick={handleConfirm} disabled={saving || settings?.bookingsFrozen}>
                  {saving ? "Saving…" : settings?.bookingsFrozen ? "Bookings Closed" : "Confirm Booking ✓"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}