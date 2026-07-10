import { Router } from "express";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { supabaseAdmin } from "../db/supabase.js";
import { fromLog } from "../db/legacyMappers.js";

const router = Router();

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
