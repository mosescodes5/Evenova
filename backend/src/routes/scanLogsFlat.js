import { Router } from "express";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { supabaseAdmin } from "../db/supabase.js";
import { fromLog, toLog } from "../db/legacyMappers.js";

const router = Router();

// ── GET /api/scan-logs/mine ─ caller's own event check-in logs ─
router.get("/mine", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    if (!req.user.orgId) return res.status(403).json({ error: "Account has no organizer profile" });
    // scan_logs has no org_id column of its own — filter via the events
    // this organizer owns.
    const { data: myEvents, error: evErr } = await supabaseAdmin
      .from("events").select("id").eq("org_id", req.user.orgId);
    if (evErr) throw evErr;
    const ids = (myEvents ?? []).map(e => e.id);
    if (ids.length === 0) return res.json({ logs: [] });

    const { data, error } = await supabaseAdmin.from("scan_logs").select("*").in("ev_id", ids);
    if (error) throw error;
    res.json({ logs: (data ?? []).map(toLog) });
  } catch (err) { next(err); }
});

// ── POST /api/scan-logs ─ record a check-in attempt ────────────
router.post("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const log = req.body;
    if (!log?.id || !log?.evId) return res.status(400).json({ error: "id and evId are required" });

    const { error } = await supabaseAdmin.from("scan_logs").insert(fromLog(log));
    if (error) throw error;

    res.status(201).json({ log });
  } catch (err) { next(err); }
});

export default router;
