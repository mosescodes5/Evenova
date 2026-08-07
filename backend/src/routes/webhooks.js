import { Router } from "express";
import crypto from "crypto";
import { config } from "../config.js";
import { ticketService } from "../services/ticketService.js";
import { emailService } from "../services/emailService.js";
import { walletService } from "../services/walletService.js";

const router = Router();

// ── POST /api/webhooks/korapay ───────────────────────────────
// Handles both pay-in events (charge.success — ticket checkout) and
// payout events (transfer.success/transfer.failed — organizer withdrawals).
// Korapay signs the payload with HMAC-SHA256 of ONLY the `data` object,
// using your secret key, in the `x-korapay-signature` header.
router.post("/korapay", async (req, res) => {
  const signature = req.headers["x-korapay-signature"];
  const rawBody = req.body; // raw Buffer (see app.use above)

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const hash = crypto
    .createHmac("sha256", config.payments.korapay.secretKey)
    .update(JSON.stringify(event.data))
    .digest("hex");

  if (hash !== signature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Acknowledge immediately — process async
  res.sendStatus(200);

  try {
    if (event.event === "charge.success" && event.data?.status === "success") {
      const { reference } = event.data;
      const pending = await ticketService.getPendingByPaymentRef(reference);
      if (pending) {
        const ticket = await ticketService.confirmPayment(pending.id, reference, "korapay");
        // Korapay's charge webhook doesn't include the payer's email —
        // we already collected it from the attendee at checkout time.
        await emailService.sendTicketEmail(ticket, ticket.holderEmail);
      }
    }

    if (event.event === "transfer.success" || event.event === "transfer.failed") {
      await walletService.handlePayoutWebhook(event.event, event.data);
    }
  } catch (err) {
    console.error("[Korapay Webhook] error:", err);
  }
});

export default router;
