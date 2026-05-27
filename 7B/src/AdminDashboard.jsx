import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./Authcontext";
import {
  LayoutDashboard, Calendar, ClipboardList, Settings, Download,
  ExternalLink, User, Ban, Home, Star, DollarSign, Ticket,
  LogOut, RefreshCw, X, ShieldAlert, Lock, Unlock, Megaphone,
  CheckCircle, Clock, XCircle, Coffee, Flag, PackageOpen, CalendarDays,
  Info, AlertTriangle, Check, ArrowDown, List, Cake, Monitor, PartyPopper, Users, Image as ImageIcon
} from "lucide-react";
import html2canvas from "html2canvas";
import "./AdminDashboard.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "adnann.040404@gmail.com").toLowerCase().trim();

// ── API helper ────────────────────────────────────────────────────
async function apiCall(user, path, options = {}) {
  const token = await user.getIdToken(true);
  const res = await fetch(`${API_BASE}/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  // CSV download returns text
  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("text/csv")) return res.blob();
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────
function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function formatCurrency(n) {
  return n ? `₹${Number(n).toLocaleString("en-IN")}` : "₹0";
}

function Stars({ n }) {
  return <span>{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

const SPACE_LABELS = {
  workspace: "Workspace", birthday: "Birthday",
  conference: "Conference", cafe: "Café",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Toggle Switch component ───────────────────────────────────────
function Toggle({ checked, onChange, label, sublabel, danger }) {
  return (
    <div className="adm-toggle-row">
      <div className="adm-toggle-info">
        <div className="adm-toggle-label" style={{ color: danger && checked ? "var(--adm-red)" : undefined }}>
          {label}
        </div>
        {sublabel && <div className="adm-toggle-sub">{sublabel}</div>}
      </div>
      <button
        className={`adm-toggle ${checked ? (danger ? "on-danger" : "on") : "off"}`}
        onClick={() => onChange(!checked)}
        aria-label={label}
      >
        <span className="adm-toggle-thumb" />
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState("overview");
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  // Filters
  const [fDate, setFDate] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSpace, setFSpace] = useState("");

  // Closure form
  const [closureFrom, setClosureFrom] = useState("");
  const [closureTo, setClosureTo] = useState("");
  const [closureReason, setClosureReason] = useState("");

  // Export
  const [expFrom, setExpFrom] = useState("");
  const [expTo, setExpTo] = useState("");
  const [expStatus, setExpStatus] = useState("");
  const [exportImageData, setExportImageData] = useState(null);

  // ── Auth guard ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if ((user.email || "").toLowerCase().trim() !== ADMIN_EMAIL) {
      setError("Forbidden: admin access only");
      setLoading(false);
    }
  }, [user]);

  // ── Fetchers ─────────────────────────────────────────────────
  const fetchStats = useCallback(async () => { if (!user) return; try { setStats(await apiCall(user, "/stats")); } catch (e) { setError(e.message); } }, [user]);
  const fetchToday = useCallback(async () => { if (!user) return; try { setToday(await apiCall(user, "/today")); } catch (e) { setError(e.message); } }, [user]);
  const fetchSettings = useCallback(async () => { if (!user) return; try { setSettings(await apiCall(user, "/settings")); } catch (e) { setError(e.message); } }, [user]);
  const fetchReviews = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/bookings/reviews/all`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setReviews(await res.json());
    } catch { }
  }, [user]);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    try {
      const p = new URLSearchParams({ limit: "100" });
      if (fDate) p.set("date", fDate);
      if (view === "refunds") {
        p.set("status", "cancelled");
      } else if (fStatus) {
        p.set("status", fStatus);
      }
      if (fSpace) p.set("spaceId", fSpace);
      const data = await apiCall(user, `/bookings?${p}`);
      setBookings(data.bookings);
      setTotal(data.total);
    } catch (e) { setError(e.message); }
  }, [user, fDate, fStatus, fSpace, view]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    if ((user.email || "").toLowerCase().trim() !== ADMIN_EMAIL) return;
    setLoading(true);
    Promise.all([fetchStats(), fetchToday(), fetchSettings(), fetchReviews()])
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { if (view === "bookings" || view === "refunds") fetchBookings(); }, [view, fDate, fStatus, fSpace]);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const refresh = async () => {
    setLoading(true); setError("");
    await Promise.all([fetchStats(), fetchToday(), fetchSettings(), fetchReviews(),
    (view === "bookings" || view === "refunds") ? fetchBookings() : Promise.resolve()]);
    setLoading(false);
  };

  // ── Booking actions ───────────────────────────────────────────
  const doAction = async (id, action) => {
    setActionLoading(p => ({ ...p, [id]: action }));
    try {
      await apiCall(user, `/bookings/${id}/${action}`, { method: "PUT" });
      const patch = b => (b._id === id) ? { 
        ...b, 
        status: action === "confirm" ? "confirmed" : action === "complete" ? "completed" : "cancelled",
        refundStatus: (action === "cancel" && b.grandTotal > 0 && b.razorpayPaymentId) ? "pending" : b.refundStatus
      } : b;
      setBookings(p => p.map(patch));
      setToday(p => p.map(patch));
      fetchStats();
      flash(`Booking ${action === "confirm" ? "confirmed" : action === "complete" ? "marked as completed" : "cancelled"} ✓`);
    } catch (e) { setError(e.message); }
    finally { setActionLoading(p => { const n = { ...p }; delete n[id]; return n; }); }
  };

  const handleRefund = async (id, refundAmount, guestName) => {
    setActionLoading(p => ({ ...p, [id]: "refund" }));
    try {
      await apiCall(user, `/bookings/${id}/refund`, { method: "PUT" });
      const patch = b => (b._id === id) ? { ...b, refundStatus: "refunded", refundAmount } : b;
      setBookings(p => p.map(patch));
      fetchStats();
      flash(`Refund of ₹${refundAmount} successfully processed for ${guestName}! ✓`);
    } catch (e) { setError("Refund failed: " + e.message); }
    finally { setActionLoading(p => { const n = { ...p }; delete n[id]; return n; }); }
  };

  // ── Settings helpers ─────────────────────────────────────────
  const patchSettings = async (update) => {
    setSaving(true); setError("");
    try {
      const s = await apiCall(user, "/settings", { method: "PATCH", body: JSON.stringify(update) });
      setSettings(s);
      flash("Settings saved ✓");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const addClosure = async () => {
    if (!closureFrom || !closureTo) return;
    setSaving(true);
    try {
      const s = await apiCall(user, "/settings/closures", {
        method: "POST",
        body: JSON.stringify({ from: closureFrom, to: closureTo, reason: closureReason || "Cafe closed" }),
      });
      setSettings(s);
      setClosureFrom(""); setClosureTo(""); setClosureReason("");
      flash("Closure period added ✓");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const removeClosure = async (idx) => {
    setSaving(true);
    try {
      const s = await apiCall(user, `/settings/closures/${idx}`, { method: "DELETE" });
      setSettings(s);
      flash("Closure removed ✓");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  // ── Image Export ────────────────────────────────────────────────
  const exportImageReport = async () => {
    try {
      setSaving(true); setError("");
      const p = new URLSearchParams({ limit: "1000" });
      if (expFrom) p.set("from", expFrom);
      if (expTo) p.set("to", expTo);
      if (expStatus) p.set("status", expStatus);

      const data = await apiCall(user, `/bookings?${p}`);
      if (!data.bookings || data.bookings.length === 0) {
        flash("No bookings found for this criteria.");
        setSaving(false);
        return;
      }
      setExportImageData(data.bookings);
    } catch (e) {
      setError("Export failed: " + e.message);
      setSaving(false);
    }
  };

  useEffect(() => {
    if (exportImageData) {
      const runCapture = async () => {
        try {
          const el = document.getElementById("hidden-export-table");
          const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
          const imgData = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = imgData;
          a.download = `sevenbeans-report-${Date.now()}.png`;
          a.click();
          flash("Image downloaded ✓");
        } catch (e) {
          setError("Failed to generate image: " + e.message);
        } finally {
          setExportImageData(null);
          setSaving(false);
        }
      };
      setTimeout(runCapture, 300);
    }
  }, [exportImageData]);


  // ── Derived ───────────────────────────────────────────────────
  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const spaceRevEntries = stats ? Object.entries(stats.allTime.spaceRevenue).sort((a, b) => b[1] - a[1]) : [];
  const maxSpaceRev = spaceRevEntries[0]?.[1] || 1;

  // ── Forbidden ─────────────────────────────────────────────────
  if (error === "Forbidden: admin access only") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f4ece2", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🚫</div>
          <h2 style={{ color: "#2b1a10", marginBottom: 8 }}>Admin Access Only</h2>
          <p style={{ color: "#666", marginBottom: 24 }}>You are currently logged in as {user?.email}.</p>
          <button
            style={{ padding: "10px 20px", background: "#2b1a10", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
            onClick={() => { logout(); navigate("/login"); }}
          >
            Sign out & Login as Admin
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "overview", icon: <LayoutDashboard size={18} />, label: "Overview" },
    { id: "today", icon: <Calendar size={18} />, label: "Today", badge: stats?.today?.confirmed },
    { id: "bookings", icon: <ClipboardList size={18} />, label: "All Bookings" },
    { id: "refunds", icon: <Ban size={18} />, label: "Refunds & Cancelled" },
    { id: "peak_hours", icon: <Clock size={18} />, label: "Peak Hours" },
    { id: "settings", icon: <Settings size={18} />, label: "Cafe Settings" },
    { id: "export", icon: <Download size={18} />, label: "Export Data" },
  ];

  return (
    <div className="adm-page">

      {/* ── SIDEBAR ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">
          <div style={{ width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
            <img src="/lgl.png" alt="Seven Beans Logo" className="adm-logo-mark" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.27) translateY(1.3px)" }} />
          </div>
          <div className="brand-logo-text-wrap" style={{ marginLeft: "6px" }}>
            <span className="brand-logo-text" style={{ fontSize: "1.3rem", color: "white" }}>SEVEN BEANS<sup style={{ fontSize: "0.5em" }}>®</sup></span>
            <span className="adm-logo-sub" style={{ marginTop: "4px" }}>Admin Panel</span>
          </div>
        </div>

        <nav className="adm-sidenav">
          <div className="adm-nav-section">Dashboard</div>
          {navItems.map(n => (
            <button key={n.id}
              className={`adm-nav-item ${view === n.id ? "active" : ""}`}
              onClick={() => setView(n.id)}>
              <span className="adm-nav-icon">{n.icon}</span> {n.label}
              {n.badge > 0 && <span className="adm-nav-badge">{n.badge}</span>}
            </button>
          ))}

          <div className="adm-nav-section">Site</div>
          <button className="adm-nav-item" onClick={() => navigate("/")}>
            <span className="adm-nav-icon"><Home size={18} /></span> View Site
          </button>
          <button className="adm-nav-item" onClick={() => navigate("/dashboard")}>
            <span className="adm-nav-icon"><User size={18} /></span> My Bookings
          </button>

          {/* Freeze quick-toggle in sidebar */}
          {settings && (
            <div style={{ margin: "16px 12px 0", padding: "12px", background: settings.bookingsFrozen ? "rgba(224,82,82,0.15)" : "rgba(76,175,125,0.12)", borderRadius: 10, border: `1px solid ${settings.bookingsFrozen ? "rgba(224,82,82,0.3)" : "rgba(76,175,125,0.25)"}` }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: settings.bookingsFrozen ? "var(--adm-red)" : "var(--adm-green)", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                {settings.bookingsFrozen ? <><Lock size={14} /> Bookings Frozen</> : <><Unlock size={14} /> Bookings Open</>}
              </div>
              <button
                onClick={() => patchSettings({ bookingsFrozen: !settings.bookingsFrozen })}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: 7, border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
                  background: settings.bookingsFrozen ? "var(--adm-green)" : "var(--adm-red)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                }}
              >
                {settings.bookingsFrozen ? "Unfreeze" : "Freeze Now"}
              </button>
            </div>
          )}
        </nav>

        <div className="adm-sidebar-user">
          <div className="adm-avatar">
            {user?.photoURL ? <img src={user.photoURL} alt="avatar" /> : (user?.email || "A")[0].toUpperCase()}
          </div>
          <div className="adm-user-info">
            <div className="adm-user-name">{user?.displayName || user?.email?.split("@")[0]}</div>
            <div className="adm-user-role">Admin</div>
          </div>
          <button className="adm-logout-btn" onClick={() => { logout(); navigate("/"); }}><LogOut size={16} /></button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="adm-main" id="adm-main-content" style={{ position: "relative" }}>

        {/* Header */}
        <div className="adm-header">
          <div>
            <div className="adm-page-title">
              {navItems.find(n => n.id === view)?.icon} {navItems.find(n => n.id === view)?.label || "Admin"}
            </div>
            <div className="adm-page-sub">{todayDate}</div>
          </div>
          <div className="adm-header-actions">
            {/* Back to Site button always visible */}
            <button className="adm-back-site-btn" onClick={() => navigate("/")}>
              ← Back to Site
            </button>
            <button className="adm-refresh-btn" style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={refresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Banners */}
        {success && <div className="adm-success" style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} /> {success}</div>}
        {error && error !== "Forbidden: admin access only" && (
          <div className="adm-error" style={{ display: "flex", alignItems: "center", gap: "8px" }}><ShieldAlert size={16} /> {error} <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}><X size={16} /></button></div>
        )}

        {/* Frozen warning banner */}
        {settings?.bookingsFrozen && (
          <div className="adm-frozen-banner" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Lock size={16} /> <strong>Bookings are currently FROZEN.</strong> New bookings are blocked site-wide.
            <button onClick={() => patchSettings({ bookingsFrozen: false })} className="adm-unfreeze-inline">Unfreeze now</button>
          </div>
        )}

        {/* Active announcement banner */}
        {settings?.announcementActive && settings?.announcementText && (
          <div className={`adm-ann-preview adm-ann-${settings.announcementType}`} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Megaphone size={16} /> <strong>Live Announcement:</strong> {settings.announcementText}
          </div>
        )}

        {/* ════════════════ OVERVIEW ════════════════ */}
        {view === "overview" && (
          loading || !stats ? <div className="adm-loading"><div className="adm-spinner" /> Loading…</div> :
            <>
              <div className="adm-stats">
                <div className="adm-stat gold">
                  <div className="adm-stat-top"><span className="adm-stat-icon"><DollarSign size={20} /></span><span className="adm-stat-trend neu">All time</span></div>
                  <div className="adm-stat-val">{formatCurrency(stats.allTime.revenue)}</div>
                  <div className="adm-stat-label">Total Revenue</div>
                </div>
                <div className="adm-stat green">
                  <div className="adm-stat-top"><span className="adm-stat-icon"><Calendar size={20} /></span><span className="adm-stat-trend up">Today</span></div>
                  <div className="adm-stat-val">{formatCurrency(stats.today.revenue)}</div>
                  <div className="adm-stat-label">Today's Revenue</div>
                </div>
                <div className="adm-stat brand">
                  <div className="adm-stat-top"><span className="adm-stat-icon"><Ticket size={20} /></span><span className="adm-stat-trend neu">All time</span></div>
                  <div className="adm-stat-val">{stats.allTime.total}</div>
                  <div className="adm-stat-label">Total Bookings</div>
                </div>
                <div className="adm-stat blue">
                  <div className="adm-stat-top"><span className="adm-stat-icon"><Star size={20} /></span></div>
                  <div className="adm-stat-val">{stats.allTime.avgRating ?? "—"}</div>
                  <div className="adm-stat-label">Avg Rating</div>
                </div>

              </div>

              <div className="adm-stats" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
                {[[<CheckCircle size={20} />, "green", stats.allTime.statusCounts.confirmed || 0, "Confirmed"],
                [<ClipboardList size={20} />, "blue", stats.allTime.statusCounts.completed || 0, "Completed"],
                [<XCircle size={20} />, "red", stats.allTime.statusCounts.cancelled || 0, "Cancelled"],
                [<Calendar size={20} />, "gold", stats.today.total, "Today's Bookings"]].map(([icon, cls, val, label], idx) => (
                  <div key={idx} className={`adm-stat ${cls}`}>
                    <div className="adm-stat-top"><span className="adm-stat-icon">{icon}</span></div>
                    <div className="adm-stat-val">{val}</div>
                    <div className="adm-stat-label">{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 24 }}>
                <div className="adm-card">
                  <div className="adm-card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><DollarSign size={18} /> Revenue by Space</div>
                  {spaceRevEntries.length === 0
                    ? <div style={{ color: "var(--adm-muted)", fontSize: "0.85rem" }}>No revenue yet</div>
                    : spaceRevEntries.map(([sid, rev], i) => (
                      <div className="adm-space-bar" key={sid}>
                        <div className="adm-space-bar-top">
                          <span className="adm-space-bar-name">{SPACE_LABELS[sid] || sid}</span>
                          <span className="adm-space-bar-val">{formatCurrency(rev)}</span>
                        </div>
                        <div className="adm-bar-track">
                          <div className={`adm-bar-fill ${["brand", "gold", "blue", "green"][i % 4]}`}
                            style={{ width: `${Math.round((rev / maxSpaceRev) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                </div>

              </div>

              <div className="adm-grid-2">
                <div className="adm-card">
                  <div className="adm-card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Star size={18} /> Recent Reviews</div>
                  {reviews.length === 0
                    ? <div style={{ color: "var(--adm-muted)", fontSize: "0.85rem" }}>No reviews yet</div>
                    : <div className="adm-review-list">
                      {reviews.slice(0, 5).map(r => (
                        <div className="adm-review-item" key={r._id}>
                          <div className="adm-review-top">
                            <div className="adm-review-stars"><Stars n={r.stars} /></div>
                            <div className="adm-review-user">{r.userName || r.userEmail}</div>
                          </div>
                          <div className="adm-review-text">{r.text}</div>
                        </div>
                      ))}
                    </div>}
                </div>
                <div className="adm-card">
                  <div className="adm-card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Calendar size={18} /> Today's Upcoming</div>
                  {today.length === 0
                    ? <div className="adm-empty"><div className="adm-empty-icon"><Coffee size={40} strokeWidth={1} /></div><h3>Quiet day!</h3><p>No bookings today.</p></div>
                    : <div className="adm-timeline">
                      {today.slice(0, 6).map(b => (
                        <div className="adm-timeline-item" key={b._id}>
                          <div className="adm-timeline-time">{formatTime(b.slot)}</div>
                          <div className="adm-timeline-info">
                            <div className="adm-timeline-name">{b.userName || b.userEmail?.split("@")[0] || "Guest"}</div>
                            <div className="adm-timeline-meta">{b.spaceIcon} {b.spaceLabel} · {b.unitLabel}</div>
                          </div>
                          <div className="adm-timeline-right">
                            <span className={`adm-badge ${b.status}`}>{b.status}</span>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--adm-brand)" }}>{formatCurrency(b.grandTotal)}</span>
                          </div>
                        </div>
                      ))}
                      {today.length > 6 && (
                        <button className="adm-btn" style={{ alignSelf: "center" }} onClick={() => setView("today")}>
                          View all {today.length} →
                        </button>
                      )}
                    </div>}
                </div>
              </div>
            </>
        )}

        {/* ════════════════ TODAY ════════════════ */}
        {view === "today" && (
          <>
            {stats && (
              <div className="adm-stats" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
                {[[<ClipboardList size={20} />, "brand", stats.today.total, "Total Today"], [<CheckCircle size={20} />, "green", stats.today.confirmed, "Confirmed"],
                [<Flag size={20} />, "blue", stats.today.completed, "Completed"], [<DollarSign size={20} />, "gold", formatCurrency(stats.today.revenue), "Revenue"]].map(([icon, cls, val, label], idx) => (
                  <div key={idx} className={`adm-stat ${cls}`}>
                    <div className="adm-stat-top"><span className="adm-stat-icon">{icon}</span></div>
                    <div className="adm-stat-val">{val}</div>
                    <div className="adm-stat-label">{label}</div>
                  </div>
                ))}
              </div>
            )}
            {loading ? <div className="adm-loading"><div className="adm-spinner" /> Loading…</div>
              : today.length === 0 ? <div className="adm-empty"><div className="adm-empty-icon"><Coffee size={40} strokeWidth={1} /></div><h3>No bookings today</h3></div>
                : <BookingTable rows={today} actionLoading={actionLoading} doAction={doAction} showDate={false} />}
          </>
        )}

        {/* ════════════════ ALL BOOKINGS ════════════════ */}
        {view === "bookings" && (
          <>
            <div className="adm-filter-bar">
              <input type="date" className="adm-filter-input" value={fDate} onChange={e => setFDate(e.target.value)} />
              <select className="adm-filter-select" value={fStatus} onChange={e => setFStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid (Pending Approval)</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select className="adm-filter-select" value={fSpace} onChange={e => setFSpace(e.target.value)}>
                <option value="">All Spaces</option>
                <option value="workspace">{SPACE_LABELS.workspace}</option>
                <option value="birthday">{SPACE_LABELS.birthday}</option>
                <option value="conference">{SPACE_LABELS.conference}</option>
                <option value="cafe">{SPACE_LABELS.cafe}</option>
              </select>
              {(fDate || fStatus || fSpace) && (
                <button className="adm-btn" onClick={() => { setFDate(""); setFStatus(""); setFSpace(""); }}>✕ Clear</button>
              )}
              <span className="adm-filter-count">{total} bookings</span>
            </div>
            {loading ? <div className="adm-loading"><div className="adm-spinner" /> Loading…</div>
              : bookings.length === 0 ? <div className="adm-empty"><div className="adm-empty-icon"><PackageOpen size={40} strokeWidth={1} /></div><h3>No bookings found</h3><p>Try adjusting filters.</p></div>
                : <BookingTable rows={bookings} actionLoading={actionLoading} doAction={doAction} showDate />}
          </>
        )}

        {/* ════════════════ PEAK HOURS ════════════════ */}
        {view === "peak_hours" && (
          loading || !stats ? <div className="adm-loading"><div className="adm-spinner" /> Loading…</div> :
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="adm-settings-card" style={{ maxWidth: 800 }}>
                <div className="adm-settings-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Clock size={18} /> Peak Hours Analytics</div>
                <div className="adm-settings-desc">Detailed breakdown of peak hours by day of the week.</div>

                {stats.allTime.topPeakHour && (
                  <div style={{ margin: "16px 0", padding: "16px", background: "var(--adm-gold)", borderRadius: 8, color: "#fff" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>🔥 Busiest Time Overall</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{stats.allTime.topPeakHour.dayName} at {formatTime(stats.allTime.topPeakHour.slot)} <span style={{ fontSize: "1rem", fontWeight: "normal", opacity: 0.9 }}>({stats.allTime.topPeakHour.count} bookings)</span></div>
                  </div>
                )}

                <div className="adm-grid-2" style={{ marginTop: 20 }}>
                  {DAY_NAMES.map((day, idx) => {
                    const dayData = stats.allTime.peakHoursByDay[idx];
                    if (!dayData) return null;
                    const slots = Object.entries(dayData).sort((a, b) => b[1] - a[1]);
                    if (slots.length === 0) return null;

                    return (
                      <div className="adm-card" key={day} style={{ padding: 16 }}>
                        <div className="adm-card-title" style={{ fontSize: "1.1rem", marginBottom: 12, borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: 8 }}>{day}</div>
                        <div className="adm-peak-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                          {slots.slice(0, 6).map(([slot, count]) => (
                            <div className="adm-peak-item" key={slot} style={{ padding: "8px" }}>
                              <div className="adm-peak-time" style={{ fontSize: "0.8rem" }}>{formatTime(slot)}</div>
                              <div className="adm-peak-count" style={{ fontSize: "1rem" }}>{count}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
        )}

        {/* ════════════════ SETTINGS ════════════════ */}
        {view === "settings" && (
          loading || !settings ? <div className="adm-loading"><div className="adm-spinner" /> Loading…</div> :
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Booking Freeze */}
              <div className="adm-settings-card">
                <div className="adm-settings-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Lock size={18} /> Booking Freeze</div>
                <div className="adm-settings-desc">Instantly stop all new bookings across the site. Existing bookings are unaffected.</div>
                <Toggle
                  checked={settings.bookingsFrozen}
                  onChange={v => patchSettings({ bookingsFrozen: v })}
                  label={settings.bookingsFrozen ? "Bookings are FROZEN" : "Bookings are OPEN"}
                  sublabel="Toggle to freeze or unfreeze new bookings"
                  danger
                />
                {settings.bookingsFrozen && (
                  <div style={{ marginTop: 12 }}>
                    <label className="adm-field-label">Message shown to users</label>
                    <input className="adm-filter-input" style={{ width: "100%" }}
                      value={settings.bookingsFrozenMsg}
                      onChange={e => setSettings(s => ({ ...s, bookingsFrozenMsg: e.target.value }))}
                      onBlur={e => patchSettings({ bookingsFrozenMsg: e.target.value })}
                      placeholder="We'll be back soon!"
                    />
                  </div>
                )}
              </div>

              {/* Announcement Banner */}
              <div className="adm-settings-card">
                <div className="adm-settings-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Megaphone size={18} /> Site Announcement</div>
                <div className="adm-settings-desc">Shows a banner on the home and booking pages. Great for special offers, events, or notices.</div>
                <Toggle
                  checked={settings.announcementActive}
                  onChange={v => patchSettings({ announcementActive: v })}
                  label={settings.announcementActive ? "Announcement is LIVE" : "Announcement is hidden"}
                  sublabel="Toggle to show/hide the announcement banner"
                />
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="adm-field-label">Announcement Text</label>
                    <input className="adm-filter-input" style={{ width: "100%" }}
                      value={settings.announcementText}
                      onChange={e => setSettings(s => ({ ...s, announcementText: e.target.value }))}
                      onBlur={e => patchSettings({ announcementText: e.target.value })}
                      placeholder="e.g. We're open on Sunday with a live DJ! 🎵"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label className="adm-field-label">Type</label>
                      <select className="adm-filter-select" style={{ width: "100%" }}
                        value={settings.announcementType}
                        onChange={e => patchSettings({ announcementType: e.target.value })}>
                        <option value="info">Info (blue)</option>
                        <option value="warning">Warning (yellow)</option>
                        <option value="success">Success (green)</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="adm-field-label">Expires on (optional)</label>
                      <input type="date" className="adm-filter-input" style={{ width: "100%" }}
                        value={settings.announcementExpiry}
                        onChange={e => patchSettings({ announcementExpiry: e.target.value })}
                      />
                    </div>
                  </div>
                  {settings.announcementText && (
                    <div className={`adm-ann-preview adm-ann-${settings.announcementType}`}>
                      Preview: {settings.announcementText}
                    </div>
                  )}
                </div>
              </div>

              {/* Closure Periods */}
              <div className="adm-settings-card">
                <div className="adm-settings-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><CalendarDays size={18} /> Closure Periods</div>
                <div className="adm-settings-desc">Block all bookings for a date range (e.g. public holidays, renovations). Automatically shown to users.</div>

                {settings.closurePeriods.length > 0 && (
                  <div className="adm-closure-list">
                    {settings.closurePeriods.map((c, i) => (
                      <div key={i} className="adm-closure-item">
                        <span className="adm-closure-dates" style={{ display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14} /> {formatDate(c.from)} → {formatDate(c.to)}</span>
                        <span className="adm-closure-reason">{c.reason}</span>
                        <button className="adm-btn cancel" style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => removeClosure(i)}><X size={12} /> Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="adm-closure-form">
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label className="adm-field-label">From</label>
                      <input type="date" className="adm-filter-input" style={{ width: "100%" }}
                        value={closureFrom} onChange={e => setClosureFrom(e.target.value)} />
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label className="adm-field-label">To</label>
                      <input type="date" className="adm-filter-input" style={{ width: "100%" }}
                        value={closureTo} onChange={e => setClosureTo(e.target.value)} />
                    </div>
                    <div style={{ flex: 2, minWidth: 200 }}>
                      <label className="adm-field-label">Reason</label>
                      <input className="adm-filter-input" style={{ width: "100%" }}
                        value={closureReason} onChange={e => setClosureReason(e.target.value)}
                        placeholder="e.g. Public holiday" />
                    </div>
                  </div>
                  <button className="adm-refresh-btn" style={{ marginTop: 10 }}
                    onClick={addClosure} disabled={!closureFrom || !closureTo || saving}>
                    + Add Closure Period
                  </button>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="adm-settings-card">
                <div className="adm-settings-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Clock size={18} /> Operating Hours</div>
                <div className="adm-settings-desc">Set the cafe's open and close times. Closed days will block bookings automatically.</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                  <div>
                    <label className="adm-field-label">Open Time</label>
                    <input type="time" className="adm-filter-input"
                      value={settings.openTime}
                      onChange={e => setSettings(s => ({ ...s, openTime: e.target.value }))}
                      onBlur={e => patchSettings({ openTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="adm-field-label">Close Time</label>
                    <input type="time" className="adm-filter-input"
                      value={settings.closeTime}
                      onChange={e => setSettings(s => ({ ...s, closeTime: e.target.value }))}
                      onBlur={e => patchSettings({ closeTime: e.target.value })} />
                  </div>
                </div>
                <label className="adm-field-label">Closed Days of Week</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {DAY_NAMES.map((day, idx) => {
                    const closed = settings.closedDays.includes(idx);
                    return (
                      <button key={day}
                        className={`adm-day-btn ${closed ? "active" : ""}`}
                        onClick={() => {
                          const days = closed
                            ? settings.closedDays.filter(d => d !== idx)
                            : [...settings.closedDays, idx];
                          patchSettings({ closedDays: days });
                        }}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--adm-muted)", marginTop: 8 }}>
                  Highlighted days are <strong>closed</strong> — no bookings will be accepted.
                </div>
              </div>

            </div>
        )}

        {/* ════════════════ REFUNDS & CANCELLED ════════════════ */}
        {view === "refunds" && (
          <>
            <div className="adm-filter-bar">
              <input type="date" className="adm-filter-input" value={fDate} onChange={e => setFDate(e.target.value)} />
              <select className="adm-filter-select" value={fSpace} onChange={e => setFSpace(e.target.value)}>
                <option value="">All Spaces</option>
                <option value="workspace">{SPACE_LABELS.workspace}</option>
                <option value="birthday">{SPACE_LABELS.birthday}</option>
                <option value="conference">{SPACE_LABELS.conference}</option>
                <option value="cafe">{SPACE_LABELS.cafe}</option>
              </select>
              {(fDate || fSpace) && (
                <button className="adm-btn" onClick={() => { setFDate(""); setFSpace(""); }}>✕ Clear</button>
              )}
              <span className="adm-filter-count">{bookings.length} cancelled bookings</span>
            </div>
            
            {loading ? <div className="adm-loading"><div className="adm-spinner" /> Loading…</div>
              : bookings.length === 0 ? <div className="adm-empty"><div className="adm-empty-icon"><Ban size={40} strokeWidth={1} /></div><h3>No cancelled bookings found</h3></div>
                : (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Guest Details</th>
                          <th>Space / Unit</th>
                          <th>Paid Amount</th>
                          <th>Refund Status</th>
                          <th>Actions / Info</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map(b => {
                          const refundAmount = b.cancelledBy === "admin"
                            ? (b.grandTotal || 0)
                            : Math.round((b.spacePrice || 0) * 0.7);
                          const cuttingCharges = (b.grandTotal || 0) - refundAmount;
                          return (
                            <tr key={b._id} className="refund-row">
                              <td><strong style={{ fontSize: "0.83rem" }}>{formatDate(b.date)}</strong></td>
                              <td><strong>{formatTime(b.slot)}</strong></td>
                              <td>
                                <div className="adm-booking-user">
                                  {b.guestName && b.guestName !== b.userName ? (
                                    <>
                                      <span>{b.guestName}</span>
                                      <div style={{ fontSize: "0.7rem", color: "var(--adm-muted)", fontStyle: "italic", fontWeight: "normal", marginTop: "2px" }}>
                                        Booked by {b.userName || "—"}
                                      </div>
                                    </>
                                  ) : (
                                    b.guestName || b.userName || "—"
                                  )}
                                </div>
                                <div className="adm-booking-email">{b.userEmail}</div>
                                {b.guestPhone && (
                                  <div style={{ fontSize: "0.74rem", color: "var(--adm-muted)", marginTop: "2px", fontWeight: "500" }}>
                                    📞 {b.guestPhone}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className="adm-space-chip">
                                  {typeof b.spaceIcon === "string" && b.spaceIcon.startsWith("/") ? <img src={b.spaceIcon} alt="" style={{ height: "1em", width: "auto" }} /> : b.spaceIcon}
                                  {" "}{b.spaceLabel}
                                </span>
                                <div style={{ fontSize: "0.74rem", color: "var(--adm-muted)", marginTop: 3 }}>
                                  {b.unitLabel}
                                </div>
                              </td>
                              <td>
                                <div className="adm-amount" style={{ fontWeight: 700 }}>{formatCurrency(b.grandTotal)}</div>
                                {b.spacePrice > 0 && <div style={{ fontSize: "0.72rem", color: "var(--adm-muted)" }}>Space: {formatCurrency(b.spacePrice)}</div>}
                                {b.foodTotal > 0 && <div style={{ fontSize: "0.72rem", color: "var(--adm-muted)" }}>Food: {formatCurrency(b.foodTotal)}</div>}
                              </td>
                              <td>
                                {b.refundStatus === "refunded" ? (
                                  <span className="adm-badge completed" style={{ background: "var(--adm-green-pale)", color: "var(--adm-green)" }}>
                                    Refunded ({formatCurrency(b.refundAmount)})
                                  </span>
                                ) : b.refundStatus === "pending" ? (
                                  <span className="adm-badge pending" style={{ background: "var(--adm-gold-pale)", color: "var(--adm-gold)" }}>
                                    Pending Refund
                                  </span>
                                ) : (
                                  <span className="adm-badge cancelled" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                                    No Refund
                                  </span>
                                )}
                              </td>
                              <td>
                                {b.refundStatus === "pending" ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <div style={{ fontSize: "0.75rem", color: "var(--adm-text)", fontWeight: 500 }}>
                                      Refund Amount: <strong style={{ color: "var(--adm-green)" }}>{formatCurrency(refundAmount)}</strong>
                                      <div style={{ fontSize: "0.68rem", color: "var(--adm-muted)" }}>
                                        {b.cancelledBy === "admin" ? "No cutting fee (100% Admin Cancel)" : `Cutting fee: ${formatCurrency(cuttingCharges)}`}
                                      </div>
                                    </div>
                                    <button 
                                      className="adm-btn complete"
                                      disabled={!!actionLoading[b._id]}
                                      onClick={() => handleRefund(b._id, refundAmount, b.guestName || b.userName)}
                                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", background: "var(--adm-green)", color: "white", width: "fit-content", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}
                                    >
                                      {actionLoading[b._id] === "refund" ? "Processing…" : "Process Refund"}
                                    </button>
                                  </div>
                                ) : b.refundStatus === "refunded" ? (
                                  <div style={{ fontSize: "0.75rem", color: "var(--adm-muted)" }}>
                                    Refunded <strong style={{ color: "var(--adm-green)" }}>{formatCurrency(b.refundAmount)}</strong>
                                    {b.refundProcessedAt && (
                                      <div style={{ fontSize: "0.68rem" }}>
                                        on {new Date(b.refundProcessedAt).toLocaleDateString("en-IN")}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "0.75rem", color: "var(--adm-muted)" }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
          </>
        )}

        {/* ════════════════ EXPORT ════════════════ */}
        {view === "export" && (
          <div className="adm-settings-card" style={{ maxWidth: 520, margin: "40px auto 0" }}>
            <div className="adm-settings-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><ImageIcon size={18} /> Export Bookings as Image</div>
            <div className="adm-settings-desc">Download booking data as a high-quality image report, making it easy to view and share instantly.</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              <div>
                <label className="adm-field-label">Date From (optional)</label>
                <input type="date" className="adm-filter-input" style={{ width: "100%" }}
                  value={expFrom} onChange={e => setExpFrom(e.target.value)} />
              </div>
              <div>
                <label className="adm-field-label">Date To (optional)</label>
                <input type="date" className="adm-filter-input" style={{ width: "100%" }}
                  value={expTo} onChange={e => setExpTo(e.target.value)} />
              </div>
              <div>
                <label className="adm-field-label">Status Filter (optional)</label>
                <select className="adm-filter-select" style={{ width: "100%" }}
                  value={expStatus} onChange={e => setExpStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="pending">Pending only</option>
                  <option value="confirmed">Confirmed only</option>
                  <option value="completed">Completed only</option>
                  <option value="cancelled">Cancelled only</option>
                </select>
              </div>

              <div className="adm-export-info" style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <List size={16} style={{ flexShrink: 0, marginTop: 2 }} /> The image will capture a detailed table of all bookings matching your selected filters.
              </div>

              <button className="adm-refresh-btn" style={{ justifyContent: "center", padding: "13px", display: "flex", alignItems: "center", gap: "8px" }} onClick={exportImageReport} disabled={saving}>
                <ImageIcon size={18} /> {saving ? "Generating Image..." : "Download Image"}
              </button>
            </div>
          </div>
        )}

        {/* Hidden Export Table for html2canvas */}
        {exportImageData && (
          <div style={{ position: "absolute", top: "-9999px", left: "-9999px", width: "1200px", padding: "20px", background: "#fff" }} id="hidden-export-table">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #f4ece2", paddingBottom: "15px" }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
                <img src="/lgl.png" alt="Seven Beans Logo" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.27) translateY(1.3px)" }} />
              </div>
              <div>
                <h2 style={{ margin: 0, color: "#2b1a10" }}>Seven Beans Bookings Report</h2>
                <div style={{ fontSize: "0.85rem", color: "#666" }}>Generated on {todayDate}</div>
              </div>
            </div>
            <BookingTable rows={exportImageData} actionLoading={{}} doAction={() => { }} showDate={true} hideActions={true} />
          </div>
        )}

      </main>
    </div>
  );
}

// ── Reusable BookingTable ─────────────────────────────────────────
function BookingTable({ rows, actionLoading, doAction, showDate, hideActions }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            {showDate && <th>Date</th>}
            <th>Time</th>
            <th>Guest</th>
            <th>Space / Seat</th>
            <th>Guests</th>
            <th>Amount</th>
            <th>Status</th>
            {!hideActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(b => (
            <tr key={b._id} className={b.status}>
              {showDate && (
                <td><strong style={{ fontSize: "0.83rem" }}>{formatDate(b.date)}</strong></td>
              )}
              <td>
                <strong>{formatTime(b.slot)}</strong>
                {b.slots?.length > 1 && <div style={{ fontSize: "0.72rem", color: "var(--adm-muted)" }}>{b.slots.length} slots</div>}
              </td>
              <td>
                <div className="adm-booking-user">
                  {b.guestName && b.guestName !== b.userName ? (
                    <>
                      <span>{b.guestName}</span>
                      <div style={{ fontSize: "0.7rem", color: "var(--adm-muted)", fontStyle: "italic", fontWeight: "normal", marginTop: "2px" }}>
                        Booked by {b.userName || "—"}
                      </div>
                    </>
                  ) : (
                    b.guestName || b.userName || "—"
                  )}
                </div>
                <div className="adm-booking-email">{b.userEmail}</div>
                {b.guestPhone && (
                  <div style={{ fontSize: "0.74rem", color: "var(--adm-muted)", marginTop: "2px", fontWeight: "500" }}>
                    📞 {b.guestPhone}
                  </div>
                )}
              </td>
              <td>
                <span className="adm-space-chip">
                  {typeof b.spaceIcon === "string" && b.spaceIcon.startsWith("/") ? <img src={b.spaceIcon} alt="" style={{ height: "1em", width: "auto" }} /> :
                    (b.spaceIcon || (b.spaceId === "birthday" ? <Cake size={14} /> : b.spaceId === "cafe" ? <Coffee size={14} /> : b.spaceId === "workspace" ? <Monitor size={14} /> : b.spaceId === "conference" ? <Users size={14} /> : null))}
                  {" "}{b.spaceLabel}
                </span>
                <div style={{ fontSize: "0.74rem", color: "var(--adm-muted)", marginTop: 3, display: "flex", alignItems: "center", gap: "4px" }}>
                  {typeof b.unitIcon === "string" && b.unitIcon.startsWith("/") ? <img src={b.unitIcon} alt="" style={{ height: "1em", width: "auto" }} /> : b.unitIcon}
                  {b.unitLabel}
                </div>
              </td>
              <td>{b.guests}</td>
              <td><div className="adm-amount">{formatCurrency(b.grandTotal)}</div></td>
              <td><span className={`adm-badge ${b.status}`}>{b.status}</span></td>
              {!hideActions && (
                <td>
                  <div className="adm-actions">
                    {(b.status === "pending" || b.status === "paid") && (
                      <button className="adm-btn confirm"
                        disabled={!!actionLoading[b._id]}
                        onClick={() => doAction(b._id, "confirm")} style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--adm-brand)", color: "white" }}>
                        {actionLoading[b._id] === "confirm" ? "…" : <><Check size={14} /> Confirm</>}
                      </button>
                    )}
                    {b.status === "confirmed" && (
                      <button className="adm-btn complete"
                        disabled={!!actionLoading[b._id]}
                        onClick={() => doAction(b._id, "complete")} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {actionLoading[b._id] === "complete" ? "…" : <><Check size={14} /> Done</>}
                      </button>
                    )}
                    <button className="adm-btn cancel"
                      disabled={b.status === "cancelled" || !!actionLoading[b._id]}
                      onClick={() => doAction(b._id, "cancel")} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {actionLoading[b._id] === "cancel" ? "…" : <X size={14} />}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}