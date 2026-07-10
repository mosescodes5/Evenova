// backend/src/routes/eventsFlat.js
// Create/update events in the "legacy" flat Supabase table that the rest of
// the frontend (dashboard, check-in, ticket editor, public event page) is
// built around. This replaces the frontend's old direct-to-Supabase writes
// with the same shape, just moved behind requireAuth/requireOrganizer so
// the anon key doesn't need write access to these tables anymore.
//
// One upsert-style endpoint covers both "create" and "update" because the
// frontend already always sends the full event object (see App.jsx's
// createEvent/handleScan/onAddTicket, which all build a complete merged
// event before saving) rather than partial patches.
import { Router } from "express";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { supabaseAdmin } from "../db/supabase.js";
import { toEvent, fromEvent } from "../db/legacyMappers.js";

const router = Router();

async function assertOwnsEvent(req, eventId) {
  const { data, error } = await supabaseAdmin
    .from("events").select("org_id").eq("id", eventId).maybeSingle();
  if (error) throw error;
  if (!data) return; // doesn't exist yet — creation path, nothing to own yet
  if (req.user.role !== "admin" && data.org_id !== req.user.orgId) {
    throw Object.assign(new Error("Not your event"), { status: 403 });
  }
}

// ── PUT /api/events-flat ─ create or fully replace an event ───
router.put("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const ev = req.body;
    if (!ev?.id || !ev?.orgId || !ev?.title) {
      return res.status(400).json({ error: "id, orgId and title are required" });
    }
    if (req.user.role !== "admin" && ev.orgId !== req.user.orgId) {
      return res.status(403).json({ error: "Cannot create/edit an event for another organizer" });
    }
    await assertOwnsEvent(req, ev.id);

    const { error } = await supabaseAdmin.from("events").upsert(fromEvent(ev));
    if (error) throw error;

    res.json({ event: ev });
  } catch (err) { next(err); }
});

export default router;

// ── POST /api/events-flat/:id/register ─ public attendee registration ──
// No auth — this is the one write real anonymous visitors need to make
// (registering for/buying a ticket). Deliberately narrow: it only appends
// one ticket to one event, rather than letting an anonymous caller upsert
// an entire arbitrary event object the way the organizer route above does.
router.post("/:id/register", apiLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ticket } = req.body;
    if (!ticket?.id || !ticket?.code) return res.status(400).json({ error: "A valid ticket is required" });

    const { data: row, error: loadErr } = await supabaseAdmin
      .from("events").select("*").eq("id", id).maybeSingle();
    if (loadErr) throw loadErr;
    if (!row) return res.status(404).json({ error: "Event not found" });
    if (row.status !== "upcoming" && row.status !== "live") {
      return res.status(400).json({ error: "This event isn't open for registration" });
    }

    const existing = toEvent(row);
    const updated = { ...existing, tickets: [...existing.tickets, ticket] };
    const { error: saveErr } = await supabaseAdmin.from("events").upsert(fromEvent(updated));
    if (saveErr) throw saveErr;

    res.status(201).json({ ticket });
  } catch (err) { next(err); }
});
