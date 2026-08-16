/**
 * routes/weddingGuests.js
 *
 * Organizer-side guest list management (authenticated, scoped to events
 * they own) plus the public-facing single-guest lookup and RSVP submit
 * (unauthenticated but gated by knowing that specific guest's private
 * `code` — nobody can browse or guess the full guest list through these).
 *
 * Guest data intentionally lives in its own table (wedding_guests), never
 * merged into the "events" data that flows through the public
 * events_public Supabase view — see the comment on the weddingGuests
 * table in db/schema.js for why.
 */
import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { db, schema } from "../db/index.js";
import { supabaseAdmin } from "../db/supabase.js";
import { requireSupabase } from "../middleware/requireSupabase.js";
import { toEvent } from "../db/legacyMappers.js";

const { weddingGuests } = schema;
const router = Router();

function randomGuestCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous 0/o/1/l/i
  let code = "";
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Fields of the event itself that are safe to hand to a guest viewing
// their personal RSVP page — deliberately NOT the raw Supabase row (which
// would include the ticket list, gates, etc.).
function publicWeddingInfo(event) {
  return {
    id: event.id,
    title: event.title,
    desc: event.desc,
    date: event.date,
    time: event.time,
    venue: event.venue,
    city: event.city,
    banner: event.banner,
    coupleNames: event.coupleNames,
    weddingStory: event.weddingStory,
    rsvpDeadline: event.rsvpDeadline,
    regFields: event.regFields,
  };
}

// ═══════════════════════════════════════════════════════════════
// Organizer-authenticated guest list management
// ═══════════════════════════════════════════════════════════════
router.use("/manage", requireAuth, requireOrganizer);

// ── GET /api/wedding-guests/manage/:eventId ─────────────────────
router.get("/manage/:eventId", async (req, res, next) => {
  try {
    const rows = await db.select().from(weddingGuests)
      .where(and(eq(weddingGuests.eventId, req.params.eventId), eq(weddingGuests.orgId, req.user.orgId)))
      .orderBy(weddingGuests.createdAt);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── POST /api/wedding-guests/manage/:eventId ────────────────────
// Body: { name, partyLabel?, maxPartySize? } — adds one guest/family.
router.post("/manage/:eventId", async (req, res, next) => {
  try {
    const { name, partyLabel, maxPartySize } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Guest name is required" });

    const [row] = await db.insert(weddingGuests).values({
      eventId: req.params.eventId,
      orgId: req.user.orgId,
      name: name.trim(),
      partyLabel: partyLabel?.trim() || null,
      maxPartySize: Math.max(1, Number(maxPartySize) || 1),
      code: randomGuestCode(),
    }).returning();

    res.status(201).json(row);
  } catch (err) { next(err); }
});

// ── POST /api/wedding-guests/manage/:eventId/bulk ───────────────
// Body: { guests: [{ name, partyLabel?, maxPartySize? }, ...] } — for
// pasting in a whole guest list at once instead of one at a time.
router.post("/manage/:eventId/bulk", async (req, res, next) => {
  try {
    const { guests } = req.body;
    if (!Array.isArray(guests) || !guests.length) {
      return res.status(400).json({ error: "guests must be a non-empty array" });
    }
    const values = guests
      .filter(g => g?.name?.trim())
      .map(g => ({
        eventId: req.params.eventId,
        orgId: req.user.orgId,
        name: g.name.trim(),
        partyLabel: g.partyLabel?.trim() || null,
        maxPartySize: Math.max(1, Number(g.maxPartySize) || 1),
        code: randomGuestCode(),
      }));
    if (!values.length) return res.status(400).json({ error: "No valid guest names found" });

    const rows = await db.insert(weddingGuests).values(values).returning();
    res.status(201).json(rows);
  } catch (err) { next(err); }
});

// ── PATCH /api/wedding-guests/manage/:eventId/:guestId ──────────
router.patch("/manage/:eventId/:guestId", async (req, res, next) => {
  try {
    const allowed = ["name", "partyLabel", "maxPartySize"];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    if (!Object.keys(updates).length) return res.status(400).json({ error: "No valid fields to update" });

    const [row] = await db.update(weddingGuests).set(updates)
      .where(and(
        eq(weddingGuests.id, req.params.guestId),
        eq(weddingGuests.eventId, req.params.eventId),
        eq(weddingGuests.orgId, req.user.orgId),
      )).returning();
    if (!row) return res.status(404).json({ error: "Guest not found" });
    res.json(row);
  } catch (err) { next(err); }
});

// ── DELETE /api/wedding-guests/manage/:eventId/:guestId ─────────
router.delete("/manage/:eventId/:guestId", async (req, res, next) => {
  try {
    const [row] = await db.delete(weddingGuests)
      .where(and(
        eq(weddingGuests.id, req.params.guestId),
        eq(weddingGuests.eventId, req.params.eventId),
        eq(weddingGuests.orgId, req.user.orgId),
      )).returning();
    if (!row) return res.status(404).json({ error: "Guest not found" });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// Public — single guest only, gated by their private code
// ═══════════════════════════════════════════════════════════════

// ── GET /api/wedding-guests/invite/:eventId/:code ────────────────
// Powers the personalized RSVP page. Returns ONLY this one guest's info
// plus the safe subset of the event's info — never the rest of the list.
router.get("/invite/:eventId/:code", requireSupabase, apiLimiter, async (req, res, next) => {
  try {
    const { eventId, code } = req.params;

    const [guest] = await db.select().from(weddingGuests)
      .where(and(eq(weddingGuests.eventId, eventId), eq(weddingGuests.code, code)));
    if (!guest) return res.status(404).json({ error: "Invite not found. Double-check the link your hosts sent you." });

    const { data: eventRow, error } = await supabaseAdmin.from("events").select("*").eq("id", eventId).maybeSingle();
    if (error) throw error;
    if (!eventRow) return res.status(404).json({ error: "This wedding's event could not be found" });

    // The couple pays a flat hosting fee to activate their wedding before
    // guests can see or RSVP to it — same reasoning as not showing a
    // draft/unpublished event publicly.
    if (!eventRow.wedding_paid) {
      return res.status(403).json({ error: "This wedding hasn't been activated by the couple yet — check back soon!" });
    }

    res.json({ guest, event: publicWeddingInfo(toEvent(eventRow)) });
  } catch (err) { next(err); }
});

// ── POST /api/wedding-guests/invite/:eventId/:code/rsvp ──────────
// Body: { status: "attending"|"declined"|"maybe", attendingCount?, rsvpData? }
// Guests can change their mind and resubmit — this is an upsert on their
// own single record, not a one-shot action like ticket issuance.
router.post("/invite/:eventId/:code/rsvp", requireSupabase, apiLimiter, async (req, res, next) => {
  try {
    const { eventId, code } = req.params;
    const { status, attendingCount, rsvpData } = req.body;

    if (!["attending", "declined", "maybe"].includes(status)) {
      return res.status(400).json({ error: "status must be attending, declined, or maybe" });
    }

    const [guest] = await db.select().from(weddingGuests)
      .where(and(eq(weddingGuests.eventId, eventId), eq(weddingGuests.code, code)));
    if (!guest) return res.status(404).json({ error: "Invite not found" });

    const { data: eventRow, error: evErr } = await supabaseAdmin
      .from("events").select("wedding_paid").eq("id", eventId).maybeSingle();
    if (evErr) throw evErr;
    if (!eventRow?.wedding_paid) {
      return res.status(403).json({ error: "This wedding hasn't been activated by the couple yet." });
    }

    let finalCount = null;
    if (status === "attending") {
      finalCount = Math.max(1, Math.min(Number(attendingCount) || 1, guest.maxPartySize));
    }

    const [updated] = await db.update(weddingGuests).set({
      rsvpStatus: status,
      attendingCount: finalCount,
      rsvpData: rsvpData || {},
      respondedAt: new Date(),
    }).where(eq(weddingGuests.id, guest.id)).returning();

    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
