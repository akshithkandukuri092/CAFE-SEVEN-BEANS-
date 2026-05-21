import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./Authcontext";
import { getReviews, getPublicSettings } from "./Bookingstore";
import { Cake, Coffee, Search, Check, Leaf, Zap, Wifi, Utensils, VolumeX, PartyPopper, Star, Lock, Megaphone } from "lucide-react";
import "./App.css";

// Seed reviews shown when no real ones exist yet
const SEED_REVIEWS = [
  {
    id: "seed1", userName: "Arjun K.", userInit: "AK", spaceLabel: "Workspace", stars: 5,
    text: "I come here every morning to work. The pods are incredibly peaceful and the coffee is genuinely the best I've had in Hubli.", createdAt: "2026-04-01T09:00:00Z"
  },
  {
    id: "seed2", userName: "Priya R.", userInit: "PR", spaceLabel: "Birthday Hall", stars: 5,
    text: "Celebrated my 25th here — the team decorated everything perfectly. Our guests were absolutely blown away by the ambience.", createdAt: "2026-03-20T14:00:00Z"
  },
  {
    id: "seed3", userName: "Santhosh M.", userInit: "SM", spaceLabel: "Conference Room", stars: 5,
    text: "Hosted our quarterly review here. AV worked flawlessly, lunch was on time, and the team was incredibly professional.", createdAt: "2026-03-10T11:00:00Z"
  },
];

function StarRow({ count }) {
  return (
    <span className="star-row" style={{ display: "inline-flex", gap: "2px" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} fill={i < count ? "currentColor" : "none"} color={i < count ? "#f5a623" : "#dde2f0"} />
      ))}
    </span>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("workspace");
  const [activeMenuCat, setActiveMenuCat] = useState("Bites");
  const [liveReviews, setLiveReviews] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [homeDate, setHomeDate] = useState(new Date().toISOString().split("T")[0]);
  const [homeGuests, setHomeGuests] = useState(1);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(null);

  const scrollToBooking = () => {
    document.getElementById("home")?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const real = getReviews();
    setLiveReviews(real.length > 0 ? real : SEED_REVIEWS);
    getPublicSettings().then(s => {
      if (s) setSettings(s);
    });
  }, []);

  const tabs = [
    { id: "workspace", icon: "/wslogo.png", label: "Workspace" },
    { id: "birthday", icon: <Cake size={18} />, label: "Birthday Hall" },
    { id: "conference", icon: "/crlogo.png", label: "Conference Room" },
    { id: "cafe", icon: <Coffee size={18} />, label: "Just Coffee" },
  ];

  const spaces = [
    {
      id: "workspace",
      image: "/workspace.jpeg",
      title: "Workspace",
      subtitle: "6 private pods available",
      desc: "Get in the zone. We've set up quiet, comfy pods with fast Wi-Fi and plenty of plugs so you can actually get things done. Oh, and your first coffee is on us.",
      tags: ["300 Mbps WiFi", "Quiet Zone", "Power & USB-C", "Barista Coffee", "6 Pods"],
      price: "₹250", unit: "/hr", rating: 4.9, reviews: 312, featured: true,
      perks: ["From 10 AM to 9 PM", "Min 1 hr · Max full day", "Up to 4 guests per pod"],
    },
    {
      id: "birthday",
      image: "/birthday.jpg",
      title: "Birthday Hall",
      subtitle: "2 exclusive event halls",
      desc: "Throw a party they'll actually remember. We'll handle the decorations, the cake, and the cleanup, so you can just show up and celebrate with your favourite people.",
      tags: ["Custom Décor", "Dedicated Host", "Cake Station", "Sound System", "Up to 40 pax"],
      price: "₹2,499", unit: "/event", rating: 4.8, reviews: 186, featured: false,
      perks: ["Available 10 AM – 10 PM", "2–4 hr slots", "Décor setup included"],
    },
    {
      id: "conference",
      image: "/meeting.jpg",
      title: "Conference Room",
      subtitle: "2 professional meeting rooms",
      desc: "Ditch the boring boardroom. We've got all the tech you need (projectors, whiteboards, fast Wi-Fi) plus the good coffee and catered breaks your team actually wants.",
      tags: ["4K Projector", "Interactive Whiteboard", "Video Conferencing", "Up to 20 pax"],
      price: "₹799", unit: "/hr", rating: 4.7, reviews: 94, featured: false,
      perks: ["Available 8 AM – 8 PM", "Min 1 hr booking", "Coffee breaks included"],
    },

  ];

  const menuCategories = ["Bites", "Toasties", "Pizzas", "Pasta", "Maggie", "Health", "Drinks", "Ice"];
  const menuItems = {
    Bites: [
      { name: "Chip an Dip", desc: "Potato chips served with tzatziki", price: 150 },
      { name: "Nachos", desc: "Crispy nachos with salsa and cheese", price: 200 },
      { name: "Spring Rolls", desc: "Golden fried vegetable spring rolls with sweet chilli", price: 150 },
      { name: "Woodfired Garlic Bread", desc: "Rustic garlic bread baked in the oven", price: 150 },
      { name: "Crunchy Nuggets", desc: "Crumb-coated vegetarian nuggets with mayo", price: 150 },
      { name: "French Fries", desc: "Classic with peri-peri / sriracha chilli sauce", price: 150 },
      { name: "Butter Garlic Potato", desc: "Potatoes tossed in butter and garlic", price: 150 },
      { name: "Grilled Corn Ribs", desc: "Oven grilled corn with chilli garlic and lime", price: 180 },
    ],

    Toasties: [
      { name: "Cheese Chilli Toast", desc: "Cheese, chilli, chopped capsicum topped", price: 180 },
      { name: "Avocado Toast", desc: "Avocado mash with homemade vegetable spread", price: 225 },
      { name: "Veg Grill Sandwich", desc: "Capsicum, tomato, cabbage grilled with mayo sauce", price: 180 },
      { name: "Corn & Cheese Sandwich", desc: "Creamy mix of sweet corn and melted cheese", price: 180 },
      { name: "Paneer Tikka Sandwich", desc: "Paneer filling with onions, tomato & mint chutney", price: 200 },
    ],
    Pizzas: [
      { name: "Margherita", desc: "Tomato sauce and mozzarella cheese", price: 325 },
      { name: "Corn and Cheese", desc: "Corn, cheese and mozzarella cheese", price: 350 },
      { name: "Fully Loaded", desc: "Schezwan sauce, paneer, corn, capsicum, onion & mozzarella", price: 395 },
      { name: "Tandoori Paneer", desc: "Tandoori paneer, onion, capsicum, mayo & mozzarella", price: 395 },
      { name: "Italian Pesto Veggie Blast", desc: "Sundried tomato, broccoli, olives & burrata", price: 425 },
      { name: "Mushroom Delight", desc: "White sauce, button mushrooms, black olives & jalapeños", price: 395 },
    ],
    Pasta: [
      { name: "Arrabiata", desc: "Garlic, capsicum, babycorn in spicy tomato sauce", price: 250 },
      { name: "Alfredo", desc: "Corn, capsicum, broccoli over creamy white sauce", price: 250 },
      { name: "Pesto", desc: "Pasta with classic basil pesto sauce", price: 250 },
    ],
    Maggie: [
      { name: "Maggie Exotica", desc: "Spiced maggi noodles with assorted vegetables", price: 170 },
      { name: "Paneer & Corn Maggi", desc: "Noodles with paneer and sweet corn", price: 190 },
    ],
    Health: [
      { name: "Sautéed Veggies", desc: "Seasonal vegetables lightly seasoned in olive oil", price: 225 },
      { name: "Baked Broccoli", desc: "Broccoli baked with herb cheese and seasoning", price: 225 },
      { name: "Granola Bowl", desc: "Crunchy granola with yogurt and fresh fruits", price: 250 },
      { name: "Green Salad", desc: "A mix of fresh garden greens", price: 180 },
      { name: "Caesar Salad", desc: "Classic with lettuce, parmesan and croutons", price: 225 },
      { name: "Greek Salad", desc: "Cucumbers, olives, cherry tomato and feta", price: 225 },
      { name: "Watermelon, Orange, Feta", desc: "Refreshing fruit salad with feta cheese", price: 225 },
    ],
    Drinks: [
      { name: "Filter Coffee", desc: "South Indian drip coffee, hot & strong", price: 80 },
      { name: "Cold Brew", desc: "12-hour steeped cold brew, smooth and bold", price: 160 },
      { name: "Flat White", desc: "Ristretto shots with velvety steamed milk", price: 140 },
      { name: "Matcha Latte", desc: "Premium ceremonial matcha with oat milk", price: 175 },
      { name: "Watermelon Cooler", desc: "Fresh watermelon, lime and mint — chilled", price: 150 },
      { name: "Mango Lassi", desc: "Thick Alphonso mango blended with yogurt", price: 140 },
      { name: "Strawberry Smoothie", desc: "Fresh strawberries, banana and milk", price: 160 },
      { name: "Virgin Mojito", desc: "Lime, mint, sugar and sparkling water", price: 130 },
    ],
    Ice: [
      { name: "Filter vanila", desc: "South Indian drip coffee, hot & strong", price: 80 },
      { name: "Cold chocolate", desc: "12-hour steeped cold brew, smooth and bold", price: 160 },
      { name: "Flat White", desc: "Ristretto shots with velvety steamed milk", price: 140 },
      { name: "Matcha Latte", desc: "Premium ceremonial matcha with oat milk", price: 175 },
      { name: "Watermelon Cooler", desc: "Fresh watermelon, lime and mint — chilled", price: 150 },
      { name: "Mango Lassi", desc: "Thick Alphonso mango blended with yogurt", price: 140 },
      { name: "Strawberry Smoothie", desc: "Fresh strawberries, banana and milk", price: 160 },
      { name: "Virgin Mojito", desc: "Lime, mint, sugar and sparkling water", price: 130 },
    ],


  };

  const handleBooking = (spaceType) => {
    const bookingState = { spaceType, date: homeDate, guests: homeGuests };
    if (user) navigate("/booking", { state: bookingState });
    else navigate("/login", { state: { from: "/booking", ...bookingState } });
  };

  const avgRating = liveReviews.length
    ? (liveReviews.reduce((s, r) => s + r.stars, 0) / liveReviews.length).toFixed(1)
    : "5.0";

  return (
    <div className="home-page">
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

      {/* ── NAVBAR ── */}
      <header className="navbar">
        <div className="nav-logo">
          <div style={{ width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
            <img src="/lgl.png" alt="Seven Beans Logo" className="nav-logo-mark" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.27) translateY(1.43px)" }} />
          </div>
          <div className="brand-logo-text-wrap">
            <span className="brand-logo-text">SEVEN BEANS<sup style={{ fontSize: "0.5em" }}>®</sup></span>
          </div>
        </div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#spaces" onClick={() => setMenuOpen(false)}>Spaces</a>
          <a href="#menu" onClick={() => setMenuOpen(false)}>Menu</a>
          <a href="#reviews" onClick={() => setMenuOpen(false)}>Reviews</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>

        <div className="nav-auth">
          {user ? (
            <>
              <button className="nav-login" onClick={() => navigate("/dashboard")}>My Bookings</button>
              <button className="nav-signup" onClick={logout}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-login">Log In</Link>
              <Link to="/signup" className="nav-signup">Sign Up</Link>
            </>
          )}
        </div>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </header>

      {/* ── HERO ── */}
      <section className="hero" id="home" data-aos="fade-down">
        <div className="hero-top">
          <div className="hero-eyebrow">✦ Est. 2010 · Hubli</div>
          <h1>Your new favourite<br /><em>spot in town</em></h1>
          <p className="hero-sub">Come for the coffee, stay for the vibes. Work, celebrate, or just hang out.</p>
        </div>

        <div className="booking-widget" id="spaces" data-aos="fade-up" data-aos-delay="200">
          <div className="booking-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`booking-tab ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="tab-icon" style={{ display: "flex", alignItems: "center" }}>
                  {typeof t.icon === "string" && t.icon.startsWith("/") ? <img src={t.icon} alt={t.label} className="custom-img-icon" /> : t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </div>
          <div className="booking-form">
            <div className="booking-fields">
              <div className="bfield">
                <label>Space Type</label>
                <select value={activeTab} onChange={e => setActiveTab(e.target.value)}>
                  <option value="workspace">Workspace</option>
                  <option value="birthday">Birthday Hall</option>
                  <option value="conference">Conference Room</option>
                  <option value="cafe">Just Coffee</option>
                </select>
              </div>
              <div className="bfield">
                <label>Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={homeDate}
                  onChange={e => setHomeDate(e.target.value)}
                />
              </div>
              <div className="bfield">
                <label>Number of Guests</label>
                <select value={homeGuests} onChange={e => setHomeGuests(Number(e.target.value))}>
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4 Guests</option>
                  <option value="5">5 Guests</option>
                  <option value="6">6 Guests</option>
                  <option value="8">8 Guests</option>
                  <option value="10">10 Guests</option>
                  <option value="15">15 Guests</option>
                  <option value="20">20 Guests</option>
                </select>
              </div>
              <button className="search-btn" onClick={() => handleBooking(activeTab)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Search size={16} /> Search Spaces
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="marquee-strip">
        <div className="marquee-track">
          {["6 Work Pods", "2 Birthday Halls", "2 Conference Rooms", "300 Mbps WiFi",
            "100% Vegetarian", "Artisan Coffee", "Instant Booking", "Pre-order Food",
            "6 Work Pods", "2 Birthday Halls", "2 Conference Rooms", "300 Mbps WiFi",
            "100% Vegetarian", "Artisan Coffee", "Instant Booking", "Pre-order Food",
          ].map((item, i) => (
            <span key={i}>{item} <span className="dot">•</span></span>
          ))}
        </div>
      </div>

      {/* ── SPACES GRID ── */}
      <section className="section bg-grey">
        <div className="section-head">
          <div>
            <div className="section-kicker">Our Spaces</div>
            <h2 className="section-title">Find your corner</h2>
          </div>
          <button className="view-all" onClick={scrollToBooking}>Book a Space →</button>
        </div>

        <div className="space-grid">
          {spaces.map((s, index) => (
            <div key={s.id} className={`space-card ${s.featured ? "featured" : ""}`} data-aos="fade-up" data-aos-delay={index * 100}>
              {s.featured && <div className="featured-badge">Most Popular</div>}
              <div className="space-img">
                <img src={s.image} alt={s.title} />
                <div className="space-price-tag">{s.price}{s.unit}</div>
              </div>
              <div className="space-body">
                <div className="space-rating" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Star size={12} fill="#f5a623" color="#f5a623" />
                  {s.rating}
                  <span className="rating-count">({s.reviews} reviews)</span>
                </div>
                <h3>{s.title}</h3>
                <div className="space-subtitle">{s.subtitle}</div>
                <p>{s.desc}</p>
                <div className="space-tags">
                  {s.tags.map(tag => <span className="space-tag" key={tag}>{tag}</span>)}
                </div>
                {s.perks && (
                  <ul className="space-perks">
                    {s.perks.map(p => <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}><Check size={14} color="#6b3a1f" style={{ marginTop: "2px", flexShrink: 0 }} /> {p}</li>)}
                  </ul>
                )}
                <div className="space-cta">
                  <div className="space-price">{s.price}<span>{s.unit}</span></div>
                  <button className="book-btn" onClick={() => setSelectedSpace(s)}>View Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="stats-row" data-aos="fade-up">
          {[["6", "Work Pods"], ["2", "Birthday Halls"], ["2", "Conference Rooms"], ["18+", "Coffee Blends"], ["2,400+", "Happy Guests"], ["4.8★", "Avg Rating"]].map(([n, l]) => (
            <div className="stat-cell" key={l}>
              <div className="stat-num">{n}</div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CAFÉ MENU ── */}
      <section className="section bg-white" id="menu" data-aos="fade-up">
        <div className="section-head">
          <div>
            <div className="section-kicker">Our Menu</div>
            <h2 className="section-title">Good Food, Great Coffee</h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: 8, maxWidth: 480, lineHeight: 1.7 }}>
              We make everything fresh in our kitchen. Grab a quick bite or pre-order your favourites so they're hot and ready the second you walk in.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span className="menu-note" style={{ display: "flex", alignItems: "center", gap: "4px" }}><Leaf size={14} color="#4caf50" /> 100% Vegetarian Menu</span>
            <span className="menu-note">Pre-order food when booking your space</span>
          </div>
        </div>

        <div className="menu-cat-tabs">
          {menuCategories.map(cat => (
            <button
              key={cat}
              className={`menu-cat-tab ${activeMenuCat === cat ? "active" : ""}`}
              onClick={() => setActiveMenuCat(cat)}
            >{cat}</button>
          ))}
        </div>

        <div className="menu-items-grid">
          {(menuItems[activeMenuCat] || []).map((item, index) => (
            <div className="menu-item-card" key={item.name} data-aos="fade-up" data-aos-delay={index * 50}>
              <div className="menu-item-veg" style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#4caf50", border: "2px solid #2e7d32", flexShrink: 0, marginTop: 4 }}></div>
              <div className="menu-item-body">
                <div className="menu-item-name">{item.name}</div>
                <div className="menu-item-desc">{item.desc}</div>
              </div>
              <div className="menu-item-footer">
                <div className="menu-item-price">₹{item.price}</div>
                <button className="menu-item-order" onClick={() => setSelectedFood(item)}>Pre-order</button>
              </div>
            </div>
          ))}
        </div>

        <p className="menu-disclaimer">* Prices exclusive of taxes · Preparation time 15 minutes</p>

        <div className="menu-cta-row">
          <p>Want to order ahead? Pre-order food when booking your space.</p>
          <button className="book-btn" onClick={scrollToBooking}>Book & Pre-order →</button>
        </div>


      </section>

      {/* ── WHY US ── */}
      <section className="section bg-blue" id="about" data-aos="fade-up">
        <div className="section-head">
          <div>
            <div className="section-kicker light">Why Seven Beans</div>
            <h2 className="section-title light">Your spot, your way</h2>
          </div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", maxWidth: 360 }}>
            We built Seven Beans to be the kind of place we’d want to spend all day in. No fussy rules, just good vibes and great coffee.
          </p>
        </div>
        <div className="why-grid">
          {[
            { icon: <Zap size={24} />, title: "Book in a Tap", desc: "No calling ahead or waiting around. Just pick a spot on the site and it's yours." },
            { icon: <Coffee size={24} />, title: "Really Good Coffee", desc: "No burnt beans here. We brew premium roasts that actually taste amazing." },
            { icon: <Wifi size={24} />, title: "Wi-Fi That Actually Works", desc: "Fast, reliable internet so your Zoom calls don't randomly freeze." },
            { icon: <Utensils size={24} />, title: "Skip the Line", desc: "Order your food when you book, and we'll have it ready when you walk through the door." },
            { icon: <VolumeX size={24} />, title: "Quiet When You Need It", desc: "Sound-proofed rooms for when you just need to put your head down and work." },
            { icon: <PartyPopper size={24} />, title: "Ready to Party", desc: "From birthdays to team lunches, we've got the space and the snacks sorted." },

          ].map((w, index) => (
            <div className="why-card" key={w.title} data-aos="fade-up" data-aos-delay={index * 100}>
              <div className="why-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{w.icon}</div>
              <h4>{w.title}</h4>
              <p>{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CUSTOMER REVIEWS ── */}
      <section className="section bg-white" id="reviews" data-aos="fade-up">
        <div className="section-head">
          <div>
            <div className="section-kicker">Guest Reviews</div>
            <h2 className="section-title">Don't just take our word for it</h2>
          </div>
          <div className="reviews-summary">
            <span className="reviews-avg-num">{avgRating}</span>
            <div>
              <div className="reviews-avg-stars" style={{ display: "flex", gap: "2px" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(Number(avgRating)) ? "currentColor" : "none"} color={i < Math.round(Number(avgRating)) ? "#f5a623" : "#dde2f0"} />
                ))}
              </div>
              <div className="reviews-avg-count">{liveReviews.length} review{liveReviews.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
        </div>

        <div className="review-grid">
          {liveReviews.slice(0, 6).map((r, index) => (
            <div className="review-card" key={r.id} data-aos="fade-up" data-aos-delay={index * 100}>
              <div className="review-header">
                <div className="reviewer-avatar">{r.userInit || (r.userName || "?")[0].toUpperCase()}</div>
                <div>
                  <div className="reviewer-name">{r.userName}</div>
                  <div className="reviewer-tag">{r.spaceLabel}</div>
                </div>
                <div className="review-date">
                  {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
              </div>
              <div className="review-stars" style={{ display: "flex", gap: "2px" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < r.stars ? "currentColor" : "none"} color={i < r.stars ? "#f5a623" : "#dde2f0"} />
                ))}
              </div>
              <p className="review-text">"{r.text}"</p>
            </div>
          ))}
        </div>

        {/* CTA to leave a review */}
        <div className="review-cta-row">
          <div>
            <div className="review-cta-title">Visited Seven Beans? Share your experience.</div>
            <div className="review-cta-sub">Book a space and leave a review from your dashboard.</div>
          </div>
          <button className="book-btn" onClick={() => user ? navigate("/dashboard") : navigate("/login")}>
            {user ? "Go to My Bookings →" : "Sign In to Review →"}
          </button>
        </div>
      </section>

      {/* ── RESERVE NOW — 3 Cards ── */}
      <section className="section bg-grey reserve-section" id="contact" data-aos="fade-up">
        <div className="section-head">
          <div>
            <div className="section-kicker">Book Online</div>
            <h2 className="section-title">Grab a Spot</h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: 8, lineHeight: 1.7 }}>
              Pick what you need below, and we'll make sure it's ready for you.
            </p>
          </div>
        </div>
        <div className="reserve-cards">
          <div className="reserve-card" data-aos="fade-right">
            <div className="reserve-card-icon">
              <img src="/wslogo.png" alt="Workspace" className="custom-img-icon-lg" />
            </div>
            <div className="reserve-card-body">
              <h3>Workspace</h3>
              <p>Private pods with 300 Mbps WiFi, ergonomic seating and complimentary coffee. Available from 8 AM.</p>
              <div className="reserve-card-meta">
                <span>₹250 / hour</span>
                <span>6 pods</span>
                <span>Up to 4 guests</span>
              </div>
            </div>
            <button className="reserve-card-btn" onClick={() => handleBooking("workspace")}>
              Reserve Workspace →
            </button>
          </div>
          <div className="reserve-card featured-reserve" data-aos="fade-up">
            <div className="reserve-card-badge">Most Popular</div>
            <div className="reserve-card-icon">🎂</div>
            <div className="reserve-card-body">
              <h3>Birthday Hall</h3>
              <p>Exclusive event halls with custom décor, dedicated host, cake station and Bluetooth sound system.</p>
              <div className="reserve-card-meta">
                <span>₹2,499 / event</span>
                <span>2 halls</span>
                <span>Up to 40 guests</span>
              </div>
            </div>
            <button className="reserve-card-btn" onClick={() => handleBooking("birthday")}>
              Reserve Birthday Hall →
            </button>
          </div>




          <div className="reserve-card" data-aos="fade-left">
            <div className="reserve-card-icon">
              <img src="/crlogo.png" alt="Conference Room" className="custom-img-icon-lg" />
            </div>
            <div className="reserve-card-body">
              <h3>Conference Room</h3>
              <p>Professional rooms with 4K projector, interactive whiteboard, video conferencing and catered breaks.</p>
              <div className="reserve-card-meta">
                <span>₹799 / hour</span>
                <span>2 rooms</span>
                <span>Up to 20 guests</span>
              </div>
            </div>
            <button className="reserve-card-btn" onClick={() => handleBooking("conference")}>
              Reserve Conference Room →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer data-aos="fade-up">
        <div className="footer-grid">
          <div className="footer-brand">
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0, marginBottom: "12px" }}>
              <img src="/lgl.png" alt="Seven Beans Logo" className="nav-logo-mark" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.27) translateY(1.3px)" }} />
            </div>
            <div className="brand-logo-text-wrap">
              <span className="brand-logo-text">SEVEN BEANS<sup style={{ fontSize: "0.5em" }}>®</sup></span>
            </div>
            <p>Hubli's favourite workspace café. Premium coffee, flexible spaces, and a community that feels like family.</p>
          </div>
          <div className="footer-col">
            <h5>Spaces</h5>
            <a href="#spaces">Workspace</a>
            <a href="#spaces">Birthday Hall</a>
            <a href="#spaces">Conference Room</a>
            <a href="#spaces">Just Coffee</a>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <a href="#about">About Us</a>
            <a href="#menu">Menu</a>
            <a href="#reviews">Reviews</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-col">
            <h5>Contact</h5>
            <a href="https://share.google/9Rc9FWgWPWnabMmHO" target="_blank" rel="noopener noreferrer">📍 63, Old Income Tax Office Rd, Vidya Nagar, Hubballi, Karnataka 580021</a>
            <a href="tel:9113020209">📞 +91 91130 20209</a>
            <a href="#">✉ hello@sevenbeans.in</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Seven Beans Café. All rights reserved.</p>
          <p>Privacy Policy · Terms of Use</p>
        </div>
      </footer>

      {/* ── MODALS ── */}
      {selectedSpace && (
        <div className="modal-backdrop" onClick={() => setSelectedSpace(null)}>
          <div className="modal-content space-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedSpace(null)}>✕</button>
            <div className="space-modal-img" style={{ backgroundImage: `url(${selectedSpace.image})` }} />
            <div className="space-modal-body">
              <h2>{selectedSpace.title}</h2>
              <div className="space-modal-subtitle">{selectedSpace.subtitle}</div>
              <p>{selectedSpace.desc}</p>

              <div className="space-modal-amenities">
                <h4>What's Included</h4>
                <ul>
                  {selectedSpace.tags.map(tag => <li key={tag}>✓ {tag}</li>)}
                  {selectedSpace.perks && selectedSpace.perks.map(p => <li key={p}>✓ {p}</li>)}
                </ul>
              </div>

              <div className="space-modal-footer">
                <div className="space-modal-price">
                  <strong>{selectedSpace.price}</strong> {selectedSpace.unit}
                </div>
                <button className="book-btn" onClick={() => {
                  setSelectedSpace(null);
                  handleBooking(selectedSpace.id);
                }}>
                  Proceed to Booking →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedFood && (
        <div className="modal-backdrop" onClick={() => setSelectedFood(null)}>
          <div className="modal-content food-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedFood(null)}>✕</button>
            <div className="food-modal-icon">🍽️</div>
            <h2>Craving {selectedFood.name}?</h2>
            <p className="food-modal-desc">
              Food pre-orders are directly tied to your space booking. This ensures your
              <strong> {selectedFood.name}</strong> is served hot and fresh exactly when you arrive.
            </p>
            <div className="food-modal-actions">
              <button className="book-btn" onClick={() => {
                setSelectedFood(null);
                handleBooking("workspace");
              }}>Book a Workspace</button>
              <button className="book-btn" onClick={() => {
                setSelectedFood(null);
                handleBooking("conference");
              }}>Book a Conference Room</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
