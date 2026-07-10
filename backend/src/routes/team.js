// backend/src/routes/team.js
// Add/remove/list organizer staff. Always scoped to req.user.orgId — never
// trusts an orgId from the request body, so one organizer can't touch
// another's staff list even if they guess/tamper with an id.
import { Router } from "express";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { supabaseAdmin } from "../db/supabase.js";
import { toOrg, fromOrg } from "../db/legacyMappers.js";
import { genId } from "../utils/genId.js";

const router = Router();

async function loadOrg(orgId) {
  const { data, error } = await supabaseAdmin
    .from("organizers").select("*").eq("id", orgId).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("Organization not found"), { status: 404 });
  return toOrg(data);
}

async function saveOrg(org) {
  const { error } = await supabaseAdmin.from("organizers").upsert(fromOrg(org));
  if (error) throw error;
}

// ── GET /api/team ─ list staff for the caller's own org ───────
router.get("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    if (!req.user.orgId) return res.status(403).json({ error: "Account has no organizer profile" });
    const org = await loadOrg(req.user.orgId);
    res.json({ staff: org.staff });
  } catch (err) { next(err); }
});

// ── POST /api/team ─ add a staff member ────────────────────────
router.post("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    if (!req.user.orgId) return res.status(403).json({ error: "Account has no organizer profile" });
    const { name, email, role = "staff" } = req.body;
    if (!name || !email) return res.status(400).json({ error: "name and email are required" });

    const org = await loadOrg(req.user.orgId);
    if (org.staff.some(s => s.email?.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: "That email is already on your team" });
    }

    const member = { id: genId("STAFF"), name, email, role, addedAt: new Date().toISOString() };
    const updated = { ...org, staff: [...org.staff, member] };
    await saveOrg(updated);

    res.status(201).json({ staff: updated.staff, member });
  } catch (err) { next(err); }
});

// ── DELETE /api/team/:staffId ─ remove a staff member ──────────
router.delete("/:staffId", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    if (!req.user.orgId) return res.status(403).json({ error: "Account has no organizer profile" });
    const org = await loadOrg(req.user.orgId);
    const updated = { ...org, staff: org.staff.filter(s => s.id !== req.params.staffId) };
    await saveOrg(updated);
    res.json({ staff: updated.staff });
  } catch (err) { next(err); }
});

export default router;
