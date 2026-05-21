import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

// ── Initialise Firebase Admin ONCE (guard prevents duplicate-app crash) ──
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines that dotenv sometimes leaves in
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export { admin };

/**
 * Express middleware — verifies the Firebase ID token sent as
 * "Authorization: Bearer <token>" and attaches decoded claims to req.user.
 */
export async function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: no token provided" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;   // { uid, email, name, picture, … }
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}