import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { db, schema } from "../db/index.js";
import { emailService } from "../services/emailService.js";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function makeVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

const { users, organizers } = schema;
const router = Router();

// ── POST /api/auth/login ─────────────────────────────────────
// Body: { email, password }
// Returns: { token, user }
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });

    // Always run bcrypt.compare even on a missing user — avoids leaking
    // user existence via response-time differences (timing attack).
    const match = await bcrypt.compare(password, user?.passwordHash || "$2a$12$invalidsaltinvalidsaltinvalidsalt");
    if (!user || !match) return res.status(401).json({ error: "Invalid credentials" });

    if (user.status === "pending")  return res.status(403).json({ error: "Account pending approval" });
    if (user.status === "rejected") return res.status(403).json({ error: "Account access denied" });
    if (!user.emailVerified)        return res.status(403).json({ error: "Please verify your email before logging in", code: "EMAIL_NOT_VERIFIED" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, orgId: user.orgId } });
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
    if (password.length < 8) {
      return res.status(400).json({ error: "password must be at least 8 characters" });
    }

    const existing = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    const [org] = await db.insert(organizers).values({
      name, contactName, phone, idType, idNumber, status: "pending",
    }).returning();

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = makeVerificationToken();
    const verificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);

    await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      name: contactName || name,
      role: "organizer",
      orgId: org.id,
      status: "pending", // requires admin approval before login succeeds
      emailVerified: false,
      verificationToken,
      verificationExpires,
    });

    // Password is already set at this point — the link below only confirms
    // the email address, it does not ask the user to set a password again.
    emailService.sendVerificationEmail(email.toLowerCase(), contactName || name, verificationToken)
      .catch(err => console.error("Failed to send verification email:", err));

    res.status(201).json({ message: "Application submitted. Check your email to verify your address — you'll also hear from us within 48 hours." });
  } catch (err) { next(err); }
});

// ── POST /api/auth/verify-email ──────────────────────────────
// Body: { token }
router.post("/verify-email", authLimiter, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token required" });

    const user = await db.query.users.findFirst({ where: eq(users.verificationToken, token) });
    if (!user) return res.status(400).json({ error: "This link is invalid or has expired." });
    if (user.verificationExpires && new Date(user.verificationExpires) < new Date()) {
      return res.status(400).json({ error: "This link is invalid or has expired." });
    }

    await db.update(users)
      .set({ emailVerified: true, verificationToken: null, verificationExpires: null })
      .where(eq(users.id, user.id));

    res.json({ message: "Email verified! You can now log in." });
  } catch (err) { next(err); }
});

// ── POST /api/auth/resend-verification ───────────────────────
// Body: { email }
router.post("/resend-verification", authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });

    const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });

    // Never reveal whether the account exists.
    if (user && !user.emailVerified) {
      const verificationToken = makeVerificationToken();
      const verificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
      await db.update(users)
        .set({ verificationToken, verificationExpires })
        .where(eq(users.id, user.id));
      emailService.sendVerificationEmail(user.email, user.name, verificationToken)
        .catch(err => console.error("Failed to send verification email:", err));
    }

    res.json({ message: "If an account exists for that email, a new verification link has been sent." });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ────────────────────────────────────
// JWT is stateless; client discards token. This endpoint is for audit logging.
router.post("/logout", (req, res) => {
  // Optionally: add token to a Redis blocklist here
  res.json({ message: "Logged out" });
});

export default router;
