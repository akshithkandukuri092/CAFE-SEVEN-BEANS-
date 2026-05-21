import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "./Firebase";
import "./login.css"; // Reuse the login styling

function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oobCode, setOobCode] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Extract the oobCode from the URL when the component mounts
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("oobCode");
    if (code) {
      setOobCode(code);
    } else {
      setError("Invalid or missing password reset link.");
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oobCode) return;

    setError("");
    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      // Wait a few seconds then redirect to login
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(`Error: ${err.message} (Code: ${err.code})`);
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="lp-tagline">Set your<br /><em>new password.</em></h2>
        <p className="lp-sub">
          Make sure it's at least 6 characters long.<br />
          We recommend a mix of letters, numbers, and symbols.
        </p>
      </div>

      <div className="lp-right">
        <div className="lp-box">
          <div className="lp-mode-badge signin">🔐 Secure Reset</div>
          <h2 className="lp-heading">Reset Password</h2>

          {success ? (
            <div className="lp-success-box">
              <div className="lp-success-icon">✅</div>
              <h3>Password Updated!</h3>
              <p>Your password has been successfully reset.</p>
              <p className="lp-success-note">Redirecting you to sign in...</p>
              <button type="button" className="lp-submit" onClick={() => navigate("/login")} style={{marginTop: "20px"}}>
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="lp-error">{error}</div>}
              
              <div className="lp-field">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={!oobCode}
                />
              </div>

              <button type="submit" className="lp-submit" disabled={loading || !oobCode}>
                {loading ? "Updating..." : "Update Password →"}
              </button>
            </form>
          )}

          <button type="button" className="lp-back" onClick={() => navigate("/login")}>
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
