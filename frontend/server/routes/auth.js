import express from "express";
import { admin } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

const router = express.Router();

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Generate the password reset link using Firebase Admin SDK
    const link = await admin.auth().generatePasswordResetLink(email);

    // Send the link via SendGrid
    await sendPasswordResetEmail(email, link);

    res.json({ success: true, message: "Password reset email sent via SendGrid." });
  } catch (err) {
    console.error("Forgot password error:", err);
    if (err.code === "auth/user-not-found") {
      // Return 404 so frontend can show "No account found"
      return res.status(404).json({ error: "auth/user-not-found" });
    }
    if (err.code === "auth/invalid-email") {
      return res.status(400).json({ error: "auth/invalid-email" });
    }
    res.status(500).json({ error: "Failed to send password reset email" });
  }
});

export default router;
