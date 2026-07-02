import { Router } from "express";
import { ticketLimiter } from "../middleware/rateLimiter.js";
import { paymentsService } from "../services/paymentsService.js";
import { walletService } from "../services/walletService.js";
import { calcOrganizerEarningNaira } from "../utils/fees.js";

const router = Router();

// ── POST /api/payments/verify ──────────────────────────────────
// Re-checks a payment reference directly against Paystack/Flutterwave's
// API before the client is allowed to proceed with issuing a ticket, and
// — if orgId/ticketPriceNaira are supplied — credits the organizer's
// wallet for the sale. The credited amount is always computed server-side
// from ticketPriceNaira/feeMode using our own fee formula; a client can't
// influence how much lands in the wallet by lying about the amount.
//
// Why this exists: the current checkout flow (PublicEventPage.jsx) creates
// tickets client-side as soon as the payment provider's popup SDK calls
// onSuccess(). That callback is just a JS function running in the user's
// browser — nothing stops someone from opening devtools and invoking it
// directly with a made-up reference, getting a free ticket without paying.
//
// Body: {
//   reference, provider: "paystack"|"flutterwave", expectedAmountKobo,
//   orgId?, ticketPriceNaira?, feeMode?, eventId?, eventTitle?, ticketId?,
// }
// Returns: { verified: boolean, reason?: string, email?: string, credited?: boolean }
router.post("/verify", ticketLimiter, async (req, res, next) => {
  try {
    const {
      reference, provider, expectedAmountKobo,
      orgId, ticketPriceNaira, feeMode, eventId, eventTitle, ticketId,
    } = req.body;
    if (!reference || !provider) {
      return res.status(400).json({ verified: false, reason: "reference and provider are required" });
    }
    const result = await paymentsService.verifyPayment(reference, provider, expectedAmountKobo);

    let credited = false;
    if (result?.verified && orgId && ticketPriceNaira > 0) {
      const earningNaira = calcOrganizerEarningNaira(Number(ticketPriceNaira), feeMode);
      if (earningNaira > 0) {
        await walletService.creditForTicketSale({
          orgId, amountKobo: Math.round(earningNaira * 100),
          eventId, eventTitle, ticketId, paymentRef: reference,
          note: `Ticket sale — ${eventTitle || "event"}`,
        });
        credited = true;
      }
    }

    res.json({ ...result, credited });
  } catch (err) { next(err); }
});

export default router;
