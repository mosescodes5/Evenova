import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { db, schema } from "../db/index.js";

const { events, gates, ticketTypes, tickets } = schema;
const router = Router();

// ── GET /api/events ─ Public event listing ───────────────────
router.get("/", apiLimiter, async (req, res, next) => {
  try {
    const { category, city, status = "upcoming" } = req.query;

    const conditions = [eq(events.status, status)];
    if (category) conditions.push(eq(events.category, category));
    if (city) conditions.push(eq(events.city, city));

    const rows = await db.query.events.findMany({
      where: and(...conditions),
      orderBy: desc(events.date),
    });

    res.json({ events: rows, total: rows.length });
  } catch (err) { next(err); }
});

// ── GET /api/events/:id ─ Single event (public) ──────────────
router.get("/:id", apiLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event || event.status === "draft") return res.status(404).json({ error: "Event not found" });

    const types = await db.query.ticketTypes.findMany({ where: eq(ticketTypes.eventId, id) });
    const eventGates = await db.query.gates.findMany({ where: eq(gates.eventId, id) });

    res.json({ event: { ...event, ticketTypes: types, gates: eventGates } });
  } catch (err) { next(err); }
});

// ── POST /api/events ─ Create event (organizers only) ────────
router.post("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const { title, desc, date, time, endTime, venue, city, category, ticketTypes: tTypes = [], gates: gateNames = [], regFields = [] } = req.body;
    if (!title || !date || !venue) return res.status(400).json({ error: "title, date and venue required" });
    if (!req.user.orgId) return res.status(403).json({ error: "Account has no organizer profile" });

    const [event] = await db.insert(events).values({
      orgId: req.user.orgId,
      title, description: desc, date, time, endTime, venue, city, category,
      regFields, status: "upcoming",
    }).returning();

    // Create gates first (ticket types can reference them)
    const createdGates = gateNames.length
      ? await db.insert(gates).values(gateNames.map((name) => ({ eventId: event.id, name }))).returning()
      : [];

    const createdTypes = tTypes.length
      ? await db.insert(ticketTypes).values(tTypes.map((t) => ({
          eventId: event.id,
          name: t.name,
          priceKobo: Math.round((t.price || 0) * 100),
          quantity: t.quantity || 0,
          gateId: t.gateName ? createdGates.find((g) => g.name === t.gateName)?.id : null,
        }))).returning()
      : [];

    res.status(201).json({ event: { ...event, gates: createdGates, ticketTypes: createdTypes }, message: "Event created" });
  } catch (err) { next(err); }
});

// ── PUT /api/events/:id ─ Update event ───────────────────────
router.put("/:id", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!existing) return res.status(404).json({ error: "Event not found" });
    if (req.user.role !== "admin" && existing.orgId !== req.user.orgId) {
      return res.status(403).json({ error: "Not your event" });
    }

    const { title, desc, date, time, endTime, venue, city, category, status } = req.body;
    const [updated] = await db.update(events).set({
      ...(title && { title }),
      ...(desc !== undefined && { description: desc }),
      ...(date && { date }),
      ...(time && { time }),
      ...(endTime && { endTime }),
      ...(venue && { venue }),
      ...(city && { city }),
      ...(category && { category }),
      ...(status && { status }),
      updatedAt: new Date(),
    }).where(eq(events.id, id)).returning();

    res.json({ event: updated });
  } catch (err) { next(err); }
});

// ── DELETE /api/events/:id ─ Soft-delete (cancel) ─────────────
router.delete("/:id", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!existing) return res.status(404).json({ error: "Event not found" });
    if (req.user.role !== "admin" && existing.orgId !== req.user.orgId) {
      return res.status(403).json({ error: "Not your event" });
    }

    await db.update(events).set({ status: "cancelled", updatedAt: new Date() }).where(eq(events.id, id));
    res.json({ message: "Event cancelled" });
  } catch (err) { next(err); }
});

// ── GET /api/events/:id/attendees ─ Export attendee list as CSV ─
router.get("/:id/attendees", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (req.user.role !== "admin" && event.orgId !== req.user.orgId) {
      return res.status(403).json({ error: "Not your event" });
    }

    const rows = await db.query.tickets.findMany({ where: eq(tickets.eventId, id) });

    const header = "Name,Email,Phone,Status,Registered At,Checked In At\n";
    const csvRows = rows.map((t) =>
      [t.holderName, t.holderEmail, t.holderPhone, t.status, t.registeredAt?.toISOString(), t.checkedInAt?.toISOString() || ""]
        .map((v) => `"${String(v || "").replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="attendees-${id}.csv"`);
    res.send(header + csvRows);
  } catch (err) { next(err); }
});

export default router;
