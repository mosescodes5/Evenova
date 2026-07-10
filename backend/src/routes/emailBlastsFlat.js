import { Router } from "express";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { supabaseAdmin } from "../db/supabase.js";
import { fromBlast } from "../db/legacyMappers.js";

const router = Router();

// ── POST /api/email-blasts ─ record a sent email blast ─────────
router.post("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const blast = req.body;
    if (!blast?.id || !blast?.orgId) return res.status(400).json({ error: "id and orgId are required" });
    if (req.user.role !== "admin" && blast.orgId !== req.user.orgId) {
      return res.status(403).json({ error: "Cannot log a blast for another organizer" });
    }

    const { error } = await supabaseAdmin.from("email_blasts").insert(fromBlast(blast));
    if (error) throw error;

    res.status(201).json({ blast });
  } catch (err) { next(err); }
});

export default router;
