// backend/src/routes/orgProfile.js
// Organizer account-settings updates (name, contact info, payment config).
// Deliberately does NOT accept `staff` (use /api/team) or `password`/
// `verifyCode` (there is no working backend password-reset flow yet — see
// note in the audit). Always scoped to req.user.orgId.
import { Router } from "express";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { supabaseAdmin } from "../db/supabase.js";
import { toOrg, fromOrg } from "../db/legacyMappers.js";

const router = Router();
const ALLOWED_FIELDS = ["name", "contactName", "phone", "idType", "idNumber", "expectedGuests", "paymentConfig"];

// ── GET /api/org-profile ─ the caller's own full org record ───
router.get("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    if (!req.user.orgId) return res.status(403).json({ error: "Account has no organizer profile" });
    const { data, error } = await supabaseAdmin
      .from("organizers").select("*").eq("id", req.user.orgId).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Organization not found" });
    res.json({ organizer: toOrg(data) });
  } catch (err) { next(err); }
});

router.put("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    if (!req.user.orgId) return res.status(403).json({ error: "Account has no organizer profile" });

    const { data, error: loadErr } = await supabaseAdmin
      .from("organizers").select("*").eq("id", req.user.orgId).maybeSingle();
    if (loadErr) throw loadErr;
    if (!data) return res.status(404).json({ error: "Organization not found" });

    const current = toOrg(data);
    const patch = {};
    for (const f of ALLOWED_FIELDS) if (req.body[f] !== undefined) patch[f] = req.body[f];
    const updated = { ...current, ...patch };

    const { error: saveErr } = await supabaseAdmin.from("organizers").upsert(fromOrg(updated));
    if (saveErr) throw saveErr;

    res.json({ organizer: updated });
  } catch (err) { next(err); }
});

export default router;
