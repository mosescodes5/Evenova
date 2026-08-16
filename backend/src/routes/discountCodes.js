/**
 * routes/discountCodes.js
 *
 * Organizer-facing side of the discount code system (admin CRUD lives in
 * routes/admin.js). An organizer redeems a code once; from then on their
 * paid events get the discounted service-fee rate automatically — see
 * utils/fees.js#getEffectiveServiceChargePct, which every fee calculation
 * in the app goes through.
 */
import { Router } from "express";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { db, schema } from "../db/index.js";
import { SERVICE_CHARGE_PCT, getEffectiveServiceChargePct } from "../utils/fees.js";

const { discountCodes, discountRedemptions } = schema;
const router = Router();

router.use(requireAuth, requireOrganizer, apiLimiter);

// ── GET /api/discount-codes/status ────────────────────────────────
// What fee rate does this organizer currently get, and what have they
// redeemed? Powers a small "you're saving X%" display in the dashboard.
router.get("/status", async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    const effectivePct = await getEffectiveServiceChargePct(orgId);
    const redeemed = await db
      .select({ code: discountCodes.code, discountPct: discountCodes.discountPct, active: discountCodes.active, expiresAt: discountCodes.expiresAt, redeemedAt: discountRedemptions.redeemedAt })
      .from(discountRedemptions)
      .innerJoin(discountCodes, eq(discountRedemptions.codeId, discountCodes.id))
      .where(eq(discountRedemptions.orgId, orgId));
    res.json({ basePct: SERVICE_CHARGE_PCT, effectivePct, redeemedCodes: redeemed });
  } catch (err) { next(err); }
});

// ── POST /api/discount-codes/redeem ───────────────────────────────
// Body: { code }
router.post("/redeem", async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "A code is required" });

    const [dc] = await db.select().from(discountCodes).where(eq(discountCodes.code, code));
    if (!dc) return res.status(404).json({ error: "That code doesn't exist" });
    if (!dc.active) return res.status(400).json({ error: "That code is no longer active" });
    if (dc.expiresAt && new Date(dc.expiresAt) < new Date()) {
      return res.status(400).json({ error: "That code has expired" });
    }
    if (dc.restrictedToOrgId && dc.restrictedToOrgId !== orgId) {
      return res.status(403).json({ error: "That code isn't valid for this account" });
    }
    if (dc.maxRedemptions != null && dc.redemptionsCount >= dc.maxRedemptions) {
      return res.status(400).json({ error: "That code has reached its redemption limit" });
    }

    const [{ value: orgRedemptions }] = await db
      .select({ value: count() })
      .from(discountRedemptions)
      .where(and(eq(discountRedemptions.codeId, dc.id), eq(discountRedemptions.orgId, orgId)));
    if (orgRedemptions >= dc.maxRedemptionsPerOrg) {
      return res.status(409).json({ error: "You've already redeemed this code" });
    }

    await db.insert(discountRedemptions).values({ codeId: dc.id, orgId });
    await db.update(discountCodes)
      .set({ redemptionsCount: dc.redemptionsCount + 1 })
      .where(eq(discountCodes.id, dc.id));

    const effectivePct = await getEffectiveServiceChargePct(orgId);
    res.json({
      ok: true,
      message: `Code applied! Your service fee is now ${effectivePct}% (was ${SERVICE_CHARGE_PCT}%).`,
      effectivePct,
    });
  } catch (err) {
    // Unique constraint on (code_id, org_id) — belt-and-suspenders in case
    // of a race between the count-check above and the insert.
    if (err.code === "23505") return res.status(409).json({ error: "You've already redeemed this code" });
    next(err);
  }
});

export default router;
