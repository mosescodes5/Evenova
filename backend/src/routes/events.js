import { Router } from "express";
import { requireAuth, requireOrganizer, requireAdmin } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ── GET /api/events ─ Public event listing ───────────────────
router.get("/", apiLimiter, async (req, res, next) => {
  try {
    const { category, city, status = "upcoming", featured } = req.query;
    // TODO: query DB with filters
    // const events = await db.events.findAll({ where: { status, ...(category && { category }), ...(city && { city }) } });
    res.json({ events: [], total: 0 });
  } catch (err) { next(err); }
});

// ── GET /api/events/:id ─ Single event (public) ──────────────
router.get("/:id", apiLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    // const event = await db.events.findOne({ id, status: { $ne: "draft" } });
    // if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ event: null }); // stub
  } catch (err) { next(err); }
});

// ── POST /api/events ─ Create event (organizers only) ────────
router.post("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const { title, desc, date, time, endTime, venue, city, category, ticketTypes, gates, regFields } = req.body;
    if (!title || !date || !venue) return res.status(400).json({ error: "title, date and venue required" });

    // TODO: generate signed tickets and save to DB
    // const event = await db.events.create({ ...req.body, orgId: req.user.orgId, status: "upcoming" });
    res.status(201).json({ event: null, message: "Event created" }); // stub
  } catch (err) { next(err); }
});

// ── PUT /api/events/:id ─ Update event ───────────────────────
router.put("/:id", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO: verify ownership and update
    res.json({ event: null }); // stub
  } catch (err) { next(err); }
});

// ── DELETE /api/events/:id ─ Soft-delete ─────────────────────
router.delete("/:id", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO: set status = "cancelled"
    res.json({ message: "Event cancelled" });
  } catch (err) { next(err); }
});

// ── GET /api/events/:id/attendees ─ Export attendee list ─────
router.get("/:id/attendees", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO: fetch tickets for event and stream as CSV
    res.json({ attendees: [] }); // stub
  } catch (err) { next(err); }
});

export default router;
