import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ticketLimiter } from "../middleware/rateLimiter.js";
import { ticketService } from "../services/ticketService.js";
import { emailService } from "../services/emailService.js";

const router = Router();

// ── POST /api/tickets/purchase ── Initiate ticket purchase ───
router.post("/purchase", ticketLimiter, async (req, res, next) => {
  try {
    const { eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone, customData, paymentRef } = req.body;
    if (!eventId || !holderName || !holderEmail) {
      return res.status(400).json({ error: "eventId, holderName and holderEmail required" });
    }

    // TODO: verify payment reference with Paystack/Flutterwave before issuing
    // const verified = await paymentsService.verifyPayment(paymentRef, provider);
    // if (!verified) return res.status(402).json({ error: "Payment not verified" });

    const ticket = await ticketService.createTicket({ eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone, customData });

    // Send ticket email asynchronously (don't block response)
    emailService.sendTicketEmail(ticket, holderEmail).catch(console.error);

    res.status(201).json({ ticket });
  } catch (err) { next(err); }
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
    // const ticket = await db.tickets.findOne({ id });
    // if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json({ ticket: null }); // stub
  } catch (err) { next(err); }
});

// ── POST /api/tickets/manual ── Manually issue ticket ────────
router.post("/manual", requireAuth, async (req, res, next) => {
  try {
    const { eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone, note } = req.body;
    const ticket = await ticketService.createTicket({ eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone, isManual: true, issuedBy: req.user.id, note });
    res.status(201).json({ ticket });
  } catch (err) { next(err); }
});

export default router;
