import { Router } from "express";
import crypto from "crypto";
import { config } from "../config.js";
import { ticketService } from "../services/ticketService.js";
import { emailService } from "../services/emailService.js";

const router = Router();

// ── POST /api/webhooks/paystack ──────────────────────────────
router.post("/paystack", async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const rawBody   = req.body; // raw Buffer (see app.use above)

  // Verify HMAC-SHA512 signature
  const hash = crypto
    .createHmac("sha512", config.payments.paystack.secretKey)
    .update(rawBody)
    .digest("hex");

  if (hash !== signature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // Acknowledge immediately — process async
  res.sendStatus(200);

  if (event.event === "charge.success") {
    const { reference, customer, metadata } = event.data;
    try {
      const pending = await ticketService.getPendingByPaymentRef(reference);
      if (pending) {
        const ticket = await ticketService.confirmPayment(pending.id, reference);
        await emailService.sendTicketEmail(ticket, customer.email);
      }
    } catch (err) {
      console.error("[Paystack Webhook] error:", err);
    }
  }
});

// ── POST /api/webhooks/flutterwave ───────────────────────────
router.post("/flutterwave", async (req, res) => {
  const signature = req.headers["verif-hash"];

  if (signature !== config.payments.flutterwave.secretHash) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body.toString());
  res.sendStatus(200);

  if (event.status === "successful") {
    const { tx_ref, customer } = event.data;
    try {
      const pending = await ticketService.getPendingByPaymentRef(tx_ref);
      if (pending) {
        const ticket = await ticketService.confirmPayment(pending.id, tx_ref);
        await emailService.sendTicketEmail(ticket, customer.email);
      }
    } catch (err) {
      console.error("[Flutterwave Webhook] error:", err);
    }
  }
});

export default router;
