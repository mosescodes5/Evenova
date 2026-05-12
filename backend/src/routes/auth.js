import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ── POST /api/auth/login ─────────────────────────────────────
// Body: { email, password }
// Returns: { token, user }
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    // TODO: replace with real DB lookup
    // const user = await db.users.findOne({ email: email.toLowerCase() });
    const user = null; // stub

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    if (user.status === "pending")  return res.status(403).json({ error: "Account pending approval" });
    if (user.status === "rejected") return res.status(403).json({ error: "Account access denied" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.contactName } });
  } catch (err) { next(err); }
});

// ── POST /api/auth/register ──────────────────────────────────
// Body: organizer application fields
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { name, contactName, email, phone, password, idType, idNumber } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "name, email and password required" });
    }

    // TODO: check for existing user in DB
    // TODO: hash password and save to DB

    const passwordHash = await bcrypt.hash(password, 12);
    // await db.organizers.create({ name, contactName, email, phone, password: passwordHash, idType, idNumber, status: "pending" });

    res.status(201).json({ message: "Application submitted. You'll hear from us within 48 hours." });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ────────────────────────────────────
// JWT is stateless; client discards token. This endpoint is for audit logging.
router.post("/logout", (req, res) => {
  // Optionally: add token to a Redis blocklist here
  res.json({ message: "Logged out" });
});

export default router;
