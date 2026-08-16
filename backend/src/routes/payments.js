import { Router } from "express";
import { ticketLimiter } from "../middleware/rateLimiter.js";
import { paymentsService } from "../services/paymentsService.js";
import { walletService } from "../services/walletService.js";
import { calcOrganizerEarningNaira, getEffectiveServiceChargePct, WEDDING_HOSTING_FEE_NAIRA } from "../utils/fees.js";
import { config } from "../config.js";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { supabaseAdmin } from "../db/supabase.js";
import { requireSupabase } from "../middleware/requireSupabase.js";

const router = Router();

// ── GET /api/payments/bank-details ──────────────────────────────
// Public — the checkout flow needs this before the attendee is logged in
// to anything. Always Evenova's own account, never an organizer's, so a
// compromised or careless organizer can never redirect attendee money to
// themselves.
router.get("/bank-details", (req, res) => {
  res.json(config.payments.platformBank);
});

// ── POST /api/payments/verify ──────────────────────────────────
// Re-checks a payment reference directly against Korapay's API before
// the client is allowed to proceed with issuing a ticket, and
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
//   reference, provider: "korapay", expectedAmountKobo,
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
      const effectivePct = await getEffectiveServiceChargePct(orgId);
      const earningNaira = calcOrganizerEarningNaira(Number(ticketPriceNaira), feeMode, effectivePct);
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

// ── GET /api/payments/wedding-fee ────────────────────────────────
// So the frontend never hardcodes the price in two places — it asks the
// server, which is the actual source of truth used at verification time.
router.get("/wedding-fee", (req, res) => {
  res.json({ amountNaira: WEDDING_HOSTING_FEE_NAIRA });
});

// ── POST /api/payments/verify-wedding-fee ────────────────────────
// The couple/organizer pays Evenova directly to activate a wedding —
// guests never pay anything for weddings. This is a flat fee, not a
// percentage skim off ticket sales (there's no ticket revenue to skim
// from), so unlike /verify above, nothing gets credited to the
// organizer's wallet — the payment IS Evenova's revenue, in full.
//
// Body: { eventId, reference }
router.post("/verify-wedding-fee", requireAuth, requireOrganizer, requireSupabase, ticketLimiter, async (req, res, next) => {
  try {
    const { eventId, reference } = req.body;
    if (!eventId || !reference) {
      return res.status(400).json({ verified: false, reason: "eventId and reference are required" });
    }

    const { data: event, error: loadErr } = await supabaseAdmin
      .from("events").select("org_id, is_wedding, wedding_paid").eq("id", eventId).maybeSingle();
    if (loadErr) throw loadErr;
    if (!event) return res.status(404).json({ verified: false, reason: "Event not found" });
    if (req.user.role !== "admin" && event.org_id !== req.user.orgId) {
      return res.status(403).json({ verified: false, reason: "Not your event" });
    }
    if (!event.is_wedding) {
      return res.status(400).json({ verified: false, reason: "This isn't a wedding event" });
    }
    if (event.wedding_paid) {
      return res.json({ verified: true, alreadyPaid: true });
    }

    const result = await paymentsService.verifyPayment(reference, "korapay", WEDDING_HOSTING_FEE_NAIRA * 100);
    if (!result.verified) return res.json(result);

    const { error: updateErr } = await supabaseAdmin
      .from("events").update({ wedding_paid: true }).eq("id", eventId);
    if (updateErr) throw updateErr;

    res.json({ verified: true, alreadyPaid: false });
  } catch (err) { next(err); }
});

export default router;
