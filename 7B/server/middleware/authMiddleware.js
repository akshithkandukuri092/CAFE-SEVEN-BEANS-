// ── authMiddleware.js ──────────────────────────────────────────────────────
// This file re-exports verifyToken from auth.js so any code that imports
// from authMiddleware.js continues to work without causing a duplicate
// Firebase Admin initialisation crash.
// ─────────────────────────────────────────────────────────────────────────
export { verifyToken as verifyFirebaseToken, verifyToken } from "./auth.js";