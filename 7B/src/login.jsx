import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, provider } from "./Firebase";
import { useAuth } from "./Authcontext";
import { Key, Mail, UserPlus, Hand } from "lucide-react";
import "./login.css";

function Login({ defaultSignUp = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(defaultSignUp);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const redirectTo = location.state?.from || "/";
  const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "adnann.040404@gmail.com").toLowerCase().trim();
  // Smart redirect: admin email goes to /admin, everyone else goes to redirectTo
  const smartNavigate = (firebaseUser) => {
    const email = (firebaseUser?.email || "").toLowerCase().trim();
    if (email === ADMIN_EMAIL) {
      navigate("/admin", { replace: true });
    } else {
      navigate(redirectTo, { replace: true, state: location.state });
    }
  };

  useEffect(() => {
    if (!user) return;
    if ((user.email || "").toLowerCase().trim() === ADMIN_EMAIL) {
      navigate("/admin", { replace: true });
    } else {
      navigate(redirectTo, { replace: true, state: location.state });
    }
  }, [user]);

  useEffect(() => {
    setIsSignUp(defaultSignUp);
  }, [defaultSignUp]);

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      smartNavigate(result.user);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
          setError("An account with this email already exists. Please sign in instead.");
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      smartNavigate(auth.currentUser);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setForgotError(
        err.code === "auth/user-not-found"
          ? "No account found with this email address."
          : err.code === "auth/invalid-email"
            ? "Please enter a valid email address."
            : "Unable to send reset email. Please try again."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const friendlyError = (code) => {
    const map = {
      "auth/user-not-found": "No account found with this email. Try signing up instead.",
      "auth/wrong-password": "Incorrect password. Please try again.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/email-already-in-use": "An account with this email already exists. Please sign in.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/popup-closed-by-user": "Sign-in popup was closed. Please try again.",
      "auth/too-many-requests": "Too many attempts. Please wait a moment.",
      "auth/invalid-credential": "Email or password is incorrect.",
    };
    return map[code] || "Something went wrong. Please try again.";
  };

  /* ── FORGOT PASSWORD PANEL ── */
  if (showForgot) {
    return (
      <div className="lp-page">
        <div className="lp-left">
          <div className="lp-logo">
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
              <img src="/lgl.png" alt="Seven Beans Logo" className="lp-logo-mark" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.27) translateY(1.3px)" }} />
            </div>
          <div className="brand-logo-text-wrap" style={{marginLeft: "10px"}}>
            <span className="brand-logo-text" style={{fontSize: "1.4rem", color: "white"}}>SEVEN BEANS<sup style={{fontSize: "0.5em"}}>®</sup></span>
          </div>
          </div>
          <h2 className="lp-tagline">Reset your<br /><em>password.</em></h2>
          <p className="lp-sub">
            Enter the email associated with your account.<br />
            We'll send a secure link to reset your password.
          </p>
          <div className="lp-perks">
            <div className="lp-perk">✓ Secure password reset link</div>
            <div className="lp-perk">✓ Link expires in 1 hour</div>
            <div className="lp-perk">✓ Check your spam if you don't see it</div>
          </div>
        </div>

        <div className="lp-right">
          <div className="lp-box">
            <div className="lp-mode-badge signin" style={{ display: "flex", alignItems: "center", gap: "6px" }}><Key size={14} /> Password Reset</div>
            <h2 className="lp-heading">Forgot Password</h2>
            <p className="lp-greeting">We'll send a reset link to your inbox</p>

            {forgotSent ? (
              <div className="lp-success-box">
                <div className="lp-success-icon" style={{ display: "flex", justifyContent: "center" }}><Mail size={40} color="#16a34a" /></div>
                <h3>Check your inbox</h3>
                <p>A password reset link has been sent to <strong>{forgotEmail}</strong>. It may take a few minutes.</p>
                <p className="lp-success-note">Didn't receive it? Check your spam folder.</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                {forgotError && <div className="lp-error">{forgotError}</div>}
                <div className="lp-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="lp-submit" disabled={forgotLoading}>
                  {forgotLoading ? "Sending…" : "Send Reset Link →"}
                </button>
              </form>
            )}

            <button type="button" className="lp-back" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); setForgotError(""); }}>
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lp-page">
      {/* ── LEFT PANEL ── */}
      <div className="lp-left">
        <div className="lp-logo">
          <div style={{ width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
            <img src="/lgl.png" alt="Seven Beans Logo" className="lp-logo-mark" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.27) translateY(1.3px)" }} />
          </div>
          <div className="brand-logo-text-wrap" style={{marginLeft: "10px"}}>
            <span className="brand-logo-text" style={{fontSize: "1.4rem", color: "white"}}>SEVEN BEANS<sup style={{fontSize: "0.5em"}}>®</sup></span>
          </div>
        </div>

        {isSignUp ? (
          <>
            <h2 className="lp-tagline">
              Join <em>Seven Beans</em><br />and book your spot.
            </h2>
            <p className="lp-sub">
              Create your free account to book workspaces,<br />
              event halls, and more — all in one place.
            </p>
            <div className="lp-perks">
              <div className="lp-perk">✓ Instant booking confirmation</div>
              <div className="lp-perk">✓ Pre-order food with your booking</div>
              <div className="lp-perk">✓ Manage all reservations in one place</div>
              <div className="lp-perk">✓ Exclusive member-only deals</div>
            </div>
          </>
        ) : (
          <>
            <h2 className="lp-tagline">
              Welcome back to <em>your</em><br />favourite spot.
            </h2>
            <p className="lp-sub">
              Brew. Work. Unwind.<br />Sign in to manage your bookings.
            </p>
            <div className="lp-perks">
              <div className="lp-perk">✓ Instant space booking</div>
              <div className="lp-perk">✓ Manage upcoming reservations</div>
              <div className="lp-perk">✓ Exclusive member offers</div>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="lp-right">
        <div className="lp-box">
          <div className={`lp-mode-badge ${isSignUp ? "signup" : "signin"}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {isSignUp ? <><UserPlus size={14} /> New Account</> : <><Hand size={14} /> Welcome Back</>}
          </div>

          <h2 className="lp-heading">{isSignUp ? "Create Account" : "Sign In"}</h2>
          <p className="lp-greeting">
            {isSignUp ? "Join Seven Beans today — it's free" : "Good to see you again"}
          </p>

          <button type="button" className="lp-google" onClick={handleGoogle} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {loading ? "Connecting…" : isSignUp ? "Sign up with Google" : "Continue with Google"}
          </button>

          <div className="lp-divider"><span>or with email</span></div>

          {error && <div className="lp-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="lp-field">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="lp-field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="lp-field">
              <label>{isSignUp ? "Create Password" : "Password"}</label>
              <input
                type="password"
                placeholder={isSignUp ? "Min. 6 characters" : "••••••••"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {!isSignUp && (
              <div className="lp-forgot">
                <button type="button" className="lp-forgot-link" onClick={() => { setShowForgot(true); setForgotEmail(email); }}>
                  Forgot password?
                </button>
              </div>
            )}
            <button type="submit" className={`lp-submit ${isSignUp ? "signup-btn" : ""}`} disabled={loading}>
              {loading ? "Please wait…" : isSignUp ? "Create My Account →" : "Sign In →"}
            </button>
          </form>

          <p className="lp-toggle-row">
            {isSignUp ? "Already have an account? " : "New to Seven Beans? "}
            <button type="button" className="lp-toggle-link"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}>
              {isSignUp ? "Sign in instead" : "Create free account"}
            </button>
          </p>

          <button type="button" className="lp-back" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;