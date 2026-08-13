/**
 * routes/waitlist.js
 *
 * POST /api/waitlist — public signup, no auth (this is a pre-launch
 * landing page anyone can fill out). Admin-side listing/status updates
 * live in routes/admin.js alongside the discount-codes admin endpoints.
 */
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { apiLimiter } from "../middleware/rateLimiter.js";

const { waitlistSignups } = schema;
const router = Router();

router.post("/", apiLimiter, async (req, res, next) => {
  try {
    const { name, email, phone, hostingPaidEvents } = req.body;
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    const emailNorm = email.trim().toLowerCase();

    const [existing] = await db.select().from(waitlistSignups).where(eq(waitlistSignups.email, emailNorm));
    if (existing) {
      return res.status(200).json({ ok: true, alreadyOnList: true, message: "You're already on the waitlist!" });
    }

    await db.insert(waitlistSignups).values({
      name: name.trim(),
      email: emailNorm,
      phone: phone?.trim() || null,
      hostingPaidEvents: !!hostingPaidEvents,
    });

    res.status(201).json({ ok: true, alreadyOnList: false, message: "You're on the list!" });
  } catch (err) {
    if (err.code === "23505") return res.status(200).json({ ok: true, alreadyOnList: true, message: "You're already on the waitlist!" });
    next(err);
  }
});

export default router;
