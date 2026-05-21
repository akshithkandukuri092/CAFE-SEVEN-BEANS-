import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./Authcontext";
import {
  getBookingsFromAPI,
  cancelBooking,
  saveReview,
  hasReviewed,
  getCancellationBreakdown,
  getPublicSettings,
} from "./Bookingstore";
import { Star, ClipboardList, Plus, Home, Settings, PartyPopper, AlertTriangle, Loader2, CheckCircle, Utensils, DollarSign, Coffee, Calendar, Clock, Timer, Users, Lock, Edit3, Check, X, Megaphone, Cake, Monitor } from "lucide-react";
import "./Dashboard.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function canCancelBooking(booking) {
  if (booking.status !== "confirmed" && booking.status !== "pending") return false;
  const today = new Date().toISOString().split("T")[0];
  if (booking.date !== today) return true;
  if (!booking.slot) return true;
  const [h, m] = booking.slot.split(":").map(Number);
  const slotMs = new Date().setHours(h, m, 0, 0);
  return Date.now() < slotMs - 10 * 60 * 1000;
}

const STATUS_META = {
  pending: { label: "Pending Approval", color: "#f59e0b", bg: "#fef3c7" },
  confirmed: { label: "Confirmed", color: "#16a34a", bg: "#dcfce7" },
  completed: { label: "Completed", color: "#0057b8", bg: "#e8f0fc" },
  cancelled: { label: "Cancelled", color: "#dc2626", bg: "#fee2e2" },
};

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="db-star-picker">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          className={`db-star-btn ${n <= (hovered || value) ? "filled" : ""}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          type="button"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        ><Star size={24} fill={n <= (hovered || value) ? "currentColor" : "none"} color={n <= (hovered || value) ? "#f5a623" : "#dde2f0"} /></button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "adnann.040404@gmail.com").toLowerCase().trim();
  const isAdmin = (user?.email || "").toLowerCase().trim() === ADMIN_EMAIL;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [reviewModal, setReviewModal] = useState(null);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // track reviewed IDs locally (in addition to localStorage)
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getPublicSettings().then(s => {
      if (s) setSettings(s);
    });
  }, []);

  const justBooked = location.state?.justBooked;

  useEffect(() => {
    if (!user) { navigate("/login", { replace: true }); return; }
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getBookingsFromAPI(user);
        setBookings(data);
        // Seed reviewedIds from API hasReviewed flag + localStorage
        const fromApi = new Set(data.filter(b => b.hasReviewed).map(b => String(b._id || b.id)));
        setReviewedIds(fromApi);
      } catch (err) {
        console.error("Failed to load bookings:", err);
        setError("Failed to load bookings. Showing cached data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  const handleCancel = async (booking) => {
    if (!canCancelBooking(booking)) {
      alert("Cancellations are not allowed within 10 minutes of your booking time.");
      return;
    }
    const bd = getCancellationBreakdown(booking);
    const lines = ["Cancellation Policy:\n"];
    if (bd.foodTotal > 0)
      lines.push(`• Food pre-order (₹${bd.foodTotal.toLocaleString("en-IN")}): Non-refundable`);
    if (bd.spacePrice > 0) {
      lines.push(`• Space charge: 30% non-refundable (₹${bd.spaceNonRefund.toLocaleString("en-IN")})`);
      lines.push(`• Refund: ₹${bd.refundAmount.toLocaleString("en-IN")} (70% of space charge)`);
    }
    lines.push("\nProceed with cancellation?");
    if (!window.confirm(lines.join("\n"))) return;

    try {
      await cancelBooking(user, booking._id || booking.id);
      setBookings(prev =>
        prev.map(b =>
          (b._id === booking._id || b.id === booking.id)
            ? { ...b, status: "cancelled" }
            : b
        )
      );
    } catch (err) {
      alert("Cancellation failed: " + err.message);
    }
  };

  const openReview = (booking) => {
    setReviewModal(booking);
    setStars(5);
    setReviewText("");
    setSubmitted(false);
  };

  const submitReview = async () => {
    if (!reviewText.trim()) return;
    setSubmitting(true);

    const reviewData = {
      bookingId: reviewModal._id || reviewModal.id,
      spaceId: reviewModal.spaceId,
      spaceLabel: reviewModal.spaceLabel,
      spaceIcon: reviewModal.spaceIcon,
      stars,
      text: reviewText.trim(),
      userName: user.displayName || user.email.split("@")[0],
      userEmail: user.email,
      userInit: (user.displayName || user.email)[0].toUpperCase(),
    };

    // Save to localStorage immediately (used by Home page)
    saveReview(reviewData);

    // Also POST to API (best-effort)
    try {
      const token = await user.getIdToken();
      await fetch(`${API_BASE}/bookings/${reviewModal._id || reviewModal.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(reviewData),
      });
    } catch (err) {
      console.warn("Review API post failed (saved locally):", err.message);
    }

    // Mark as reviewed
    setReviewedIds(prev => new Set([...prev, String(reviewModal._id || reviewModal.id)]));
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => setReviewModal(null), 1800);
  };

  const isReviewed = (b) =>
    reviewedIds.has(String(b._id || b.id)) || hasReviewed(b._id || b.id);

  const filtered = bookings.filter(b =>
    activeTab === "all" ? true : b.status === activeTab
  );

  const totalSpent = bookings
    .filter(b => b.status !== "cancelled")
    .reduce((s, b) => s + (b.grandTotal || 0), 0);

  const spaceCount = [...new Set(
    bookings.filter(b => b.status !== "cancelled").map(b => b.spaceId)
  )].length;

  return (
    <div className="db-page">
      {/* ── Sidebar ── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-logo" onClick={() => navigate("/")}>
          <div style={{ width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
            <img src="/lgl.png" alt="Seven Beans Logo" className="db-logo-mark" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.27) translateY(1.3px)" }} />
          </div>
          <div className="brand-logo-text-wrap" style={{ marginLeft: "10px" }}>
            <span className="brand-logo-text" style={{ fontSize: "1.4rem", color: "white" }}>SEVEN BEANS<sup style={{ fontSize: "0.5em" }}>®</sup></span>
          </div>
        </div>

        <nav className="db-sidenav">
          <button className="db-sidenav-item active">
            <span className="db-nav-icon"><ClipboardList size={18} /></span> My Bookings
          </button>
          <button className="db-sidenav-item" onClick={() => navigate("/booking")}>
            <span className="db-nav-icon"><Plus size={18} /></span> New Booking
          </button>
          <button className="db-sidenav-item" onClick={() => navigate("/")}>
            <span className="db-nav-icon"><Home size={18} /></span> Home
          </button>
          {isAdmin && (
            <button className="db-sidenav-item" onClick={() => navigate("/admin")} style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, color: "#c0622a" }}>
              <span className="db-nav-icon"><Settings size={18} /></span> Admin Panel
            </button>
          )}
        </nav>

        <div className="db-sidebar-user">
          <div className="db-sidebar-avatar">
            {user?.photoURL
              ? <img src={user.photoURL} alt="avatar" />
              : <span>{(user?.email || "?")[0].toUpperCase()}</span>}
          </div>
          <div className="db-sidebar-info">
            <div className="db-sidebar-name">{user?.displayName || user?.email?.split("@")[0]}</div>
            <div className="db-sidebar-email">{user?.email}</div>
          </div>
          <button className="db-logout-btn" onClick={logout} title="Sign out">↪</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="db-main">
        {/* ── GLOBAL BANNERS ── */}
        {settings?.bookingsFrozen && (
          <div style={{ background: "var(--adm-red, #dc2626)", color: "white", textAlign: "center", padding: "10px", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginBottom: "16px", borderRadius: "8px" }}>
            <Lock size={16} />
            {settings.bookingsFrozenMsg || "Bookings are currently closed."}
          </div>
        )}
        {settings?.announcementActive && settings?.announcementText && (
          <div style={{ background: settings.announcementType === "info" ? "#3b82f6" : settings.announcementType === "success" ? "#10b981" : "#f59e0b", color: "white", textAlign: "center", padding: "10px", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginBottom: "16px", borderRadius: "8px" }}>
            <Megaphone size={16} />
            {settings.announcementText}
          </div>
        )}
        {justBooked && (
          <div className="db-success-banner">
            <span style={{ display: "flex", alignItems: "center" }}><PartyPopper size={24} /></span>
            <div>
              <strong>Booking confirmed!</strong>
              <span> Your space is reserved. See details below.</span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <div className="db-main-header">
          <div>
            <h1 className="db-page-title">My Bookings</h1>
            <p className="db-page-sub">Track, manage and review all your reservations</p>
          </div>
          <button className="db-new-btn" onClick={() => navigate("/booking")}>+ New Booking</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}><Loader2 size={32} className="spin" color="#666" /></div>
            <p style={{ color: "#666" }}>Loading your bookings…</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="db-stats">
              <div className="db-stat-card">
                <div className="db-stat-icon"><ClipboardList size={24} /></div>
                <div className="db-stat-val">{bookings.length}</div>
                <div className="db-stat-label">Total Bookings</div>
              </div>

              <div className="db-stat-card">
                <div className="db-stat-icon"><CheckCircle size={24} color="#16a34a" /></div>
                <div className="db-stat-val">{bookings.filter(b => b.status === "confirmed").length}</div>
                <div className="db-stat-label">Upcoming</div>
              </div>
              <div className="db-stat-card">
                <div className="db-stat-icon"><Utensils size={24} /></div>
                <div className="db-stat-val">{spaceCount}</div>
                <div className="db-stat-label">Spaces Visited</div>
              </div>
              <div className="db-stat-card highlight">
                <div className="db-stat-icon"><DollarSign size={24} /></div>
                <div className="db-stat-val">₹{totalSpent.toLocaleString("en-IN")}</div>
                <div className="db-stat-label">Total Spent</div>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="db-filter-tabs">
              {["all", "pending", "confirmed", "completed", "cancelled", "nandan"].map(tab => (
                <button
                  key={tab}
                  className={`db-filter-tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className="db-tab-count">
                    {tab === "all" ? bookings.length : bookings.filter(b => b.status === tab).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Bookings list */}
            {filtered.length === 0 ? (
              <div className="db-empty">
                <div className="db-empty-icon" style={{ display: "flex", justifyContent: "center" }}><Coffee size={40} strokeWidth={1} /></div>
                <h3>No bookings yet</h3>
                <p>Reserve a workspace, birthday hall, or conference room to get started.</p>
                <button className="db-new-btn" onClick={() => navigate("/booking")}>
                  Make Your First Booking
                </button>
              </div>
            ) : (
              <div className="db-booking-list">
                {filtered.map(b => {
                  const sm = STATUS_META[b.status] || STATUS_META.confirmed;
                  const reviewed = isReviewed(b);
                  return (
                    <div key={b._id || b.id} className={`db-booking-card ${b.status}`}>
                      <div className="db-booking-left">
                        <div className="db-booking-icon">
                          {typeof b.spaceIcon === "string" && b.spaceIcon.startsWith("/") ? <img src={b.spaceIcon} alt="" className="custom-img-icon-lg" /> :
                            (b.spaceIcon || (b.spaceId === "birthday" ? <Cake size={24} /> : b.spaceId === "cafe" ? <Coffee size={24} /> : b.spaceId === "workspace" ? <Monitor size={24} /> : b.spaceId === "conference" ? <Users size={24} /> : null))}
                        </div>
                        <div className="db-booking-info">
                          <div className="db-booking-name">{b.spaceLabel}</div>
                          <div className="db-booking-meta">
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={14} /> {formatDate(b.date)}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Clock size={14} /> {formatTime(b.slot)}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Timer size={14} /> {b.duration}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Users size={14} /> {b.guests} {b.guests === 1 ? "guest" : "guests"}</span>
                          </div>
                          {b.foodItems && b.foodItems.length > 0 && (
                            <div className="db-booking-food" style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                              <Utensils size={14} style={{ marginTop: "2px", flexShrink: 0 }} /> {b.foodItems.map(f => `${f.name} ×${f.qty}`).join(", ")}
                            </div>
                          )}
                          <div className="db-booking-id">
                            #{b._id || b.id} · {timeAgo(b.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="db-booking-right">
                        <div className="db-booking-total">
                          {b.grandTotal === 0 ? "Free" : `₹${b.grandTotal.toLocaleString("en-IN")}`}
                        </div>
                        <div className="db-status-badge" style={{ color: sm.color, background: sm.bg }}>
                          {sm.label}
                        </div>
                        <div className="db-booking-actions">
                          {(b.status === "confirmed" || b.status === "pending") && canCancelBooking(b) && (
                            <button className="db-cancel-btn" onClick={() => handleCancel(b)}>
                              Cancel
                            </button>
                          )}
                          {(b.status === "confirmed" || b.status === "pending") && !canCancelBooking(b) && (
                            <span style={{ fontSize: "0.73rem", color: "#8b93b0", padding: "5px 10px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Lock size={12} /> Cancel locked
                            </span>
                          )}
                          {!reviewed ? (
                            <button className="db-review-btn" onClick={() => openReview(b)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Edit3 size={14} /> Review
                            </button>
                          ) : (
                            <span className="db-reviewed-tag" style={{ display: "flex", alignItems: "center", gap: "4px" }}><Check size={14} /> Reviewed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Review Modal ── */}
      {reviewModal && (
        <div className="db-modal-backdrop" onClick={() => setReviewModal(null)}>
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            {!submitted ? (
              <>
                <div className="db-modal-header">
                  <div className="db-modal-icon">
                    {typeof reviewModal.spaceIcon === "string" && reviewModal.spaceIcon.startsWith("/") ? <img src={reviewModal.spaceIcon} alt="" className="custom-img-icon-lg" /> :
                      (reviewModal.spaceIcon || (reviewModal.spaceId === "birthday" ? <Cake size={24} /> : reviewModal.spaceId === "cafe" ? <Coffee size={24} /> : reviewModal.spaceId === "workspace" ? <Monitor size={24} /> : reviewModal.spaceId === "conference" ? <Users size={24} /> : null))}
                  </div>
                  <div>
                    <h3>Rate Your Visit</h3>
                    <p>{reviewModal.spaceLabel} · {formatDate(reviewModal.date)}</p>
                  </div>
                  <button className="db-modal-close" onClick={() => setReviewModal(null)}><X size={20} /></button>
                </div>

                <div className="db-modal-stars-label">Your rating</div>
                <StarPicker value={stars} onChange={setStars} />

                <div className="db-modal-field">
                  <label>Tell us about your experience</label>
                  <textarea
                    className="db-review-textarea"
                    rows={4}
                    placeholder="What did you love? Anything we can improve?"
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                  />
                </div>

                <div className="db-modal-actions">
                  <button className="db-modal-cancel-btn" onClick={() => setReviewModal(null)}>
                    Cancel
                  </button>
                  <button
                    className="db-modal-submit-btn"
                    onClick={submitReview}
                    disabled={submitting || !reviewText.trim()}
                  >
                    {submitting ? "Submitting…" : "Submit Review"}
                  </button>
                </div>
              </>
            ) : (
              <div className="db-modal-thanks">
                <div className="db-thanks-icon" style={{ display: "flex", justifyContent: "center" }}><PartyPopper size={48} color="#f5a623" /></div>
                <h3>Thank you!</h3>
                <p>Your review has been posted and will help other guests.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}