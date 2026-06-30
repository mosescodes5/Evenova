// backend/api/index.js
// Vercel routes every request matching vercel.json's rewrite here.
// We just hand it off to the existing Express app — no other changes needed.
import app from "../src/index.js";

export default app;
