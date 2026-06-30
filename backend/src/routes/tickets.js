import { Router } from "express";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { ticketLimiter } from "../middleware/rateLimiter.js";
import { ticketService } from "../services/ticketService.js";
import { paymentsService } from "../services/paymentsService.js";
import { emailService } from "../services/emailService.js";
import { db, schema } from "../db/index.js";

const { ticketTypes } = schema;
const router = Router();

// ── POST /api/tickets/purchase ── Initiate / complete a ticket purchase ──
router.post("/purchase", ticketLimiter, async (req, res, next) => {
  try {
    const { eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone, customData, paymentRef, provider } = req.body;
    if (!eventId || !holderName || !holderEmail) {
      return res.status(400).json({ error: "eventId, holderName and holderEmail required" });
    }

    let type = null;
    if (ticketTypeId) {
      type = await db.query.ticketTypes.findFirst({ where: eq(ticketTypes.id, ticketTypeId) });
      if (!type) return res.status(404).json({ error: "Ticket type not found" });
    }

    const isFree = !type || type.priceKobo === 0;

    if (!isFree) {
      // Paid ticket: payment MUST be verified server-side before a ticket
      // is ever created. We never trust a "success" flag sent by the client.
      if (!paymentRef || !provider) {
        return res.status(402).json({ error: "Payment reference and provider required for paid tickets" });
      }
      const result = await paymentsService.verifyPayment(paymentRef, provider, type.priceKobo);
      if (!result.verified) {
        return res.status(402).json({ error: result.reason || "Payment could not be verified" });
      }
    }

    const ticket = await ticketService.createTicket({
      eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone, customData,
      pendingPayment: false, // verified above (or free) — issue immediately
    });

    if (!isFree) {
      await ticketService.confirmPayment(ticket.id, paymentRef, provider);
    }

    emailService.sendTicketEmail(ticket, holderEmail).catch(console.error);

    res.status(201).json({ ticket });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── POST /api/tickets/scan ── Validate a QR scan at the gate ─
router.post("/scan", requireAuth, async (req, res, next) => {
  try {
    const { qrCode, gateId, eventId } = req.body;
    if (!qrCode || !eventId) return res.status(400).json({ error: "qrCode and eventId required" });

    const result = await ticketService.validateScan({ qrCode, gateId, eventId, staffId: req.user.id });
    res.json(result);
  } catch (err) { next(err); }
});

// ── GET /api/tickets/:id ── Ticket details ───────────────────
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await db.query.tickets.findFirst({ where: eq(schema.tickets.id, id) });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json({ ticket });
  } catch (err) { next(err); }
});

// ── POST /api/tickets/manual ── Manually issue ticket (door sales, comps) ─
router.post("/manual", requireAuth, async (req, res, next) => {
  try {
    const { eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone, note } = req.body;
    if (!eventId || !holderName) return res.status(400).json({ error: "eventId and holderName required" });

    const ticket = await ticketService.createTicket({
      eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone,
      isManual: true, issuedBy: req.user.id, note,
    });
    res.status(201).json({ ticket });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

export default router;
