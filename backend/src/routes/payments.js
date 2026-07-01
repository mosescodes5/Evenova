import { Router } from "express";
import { ticketLimiter } from "../middleware/rateLimiter.js";
import { paymentsService } from "../services/paymentsService.js";

const router = Router();

// ── POST /api/payments/verify ──────────────────────────────────
// Re-checks a payment reference directly against Paystack/Flutterwave's
// API before the client is allowed to proceed with issuing a ticket.
//
// Why this exists: the current checkout flow (PublicEventPage.jsx) creates
// tickets client-side as soon as the payment provider's popup SDK calls
// onSuccess(). That callback is just a JS function running in the user's
// browser — nothing stops someone from opening devtools and invoking it
// directly with a made-up reference, getting a free ticket without paying.
//
// This endpoint closes that hole: the frontend now calls this FIRST and
// only proceeds with issuing the ticket if the server confirms, by asking
// Paystack/Flutterwave directly, that the reference is real, successful,
// and paid at least the ticket's price.
//
// Body: { reference, provider: "paystack"|"flutterwave", expectedAmountKobo }
// Returns: { verified: boolean, reason?: string, email?: string }
router.post("/verify", ticketLimiter, async (req, res, next) => {
  try {
    const { reference, provider, expectedAmountKobo } = req.body;
    if (!reference || !provider) {
      return res.status(400).json({ verified: false, reason: "reference and provider are required" });
    }
    const result = await paymentsService.verifyPayment(reference, provider, expectedAmountKobo);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;