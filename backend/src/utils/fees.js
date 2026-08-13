/* ─────────────────────────────────────────────────────────────
   SERVICE CHARGE UTILS (server-side mirror of frontend/src/styles/theme.js)

   Platform collects 5% on every paid ticket. Organizer balance = ticket
   price (95%) — unless the organizer opts to absorb the fee themselves,
   in which case the attendee pays exactly the listed ticket price and the
   fee is deducted from what the organizer receives instead. Controlled
   per-event via `event.feeMode`:
     "pass_through" (default) — fee added on top, attendee pays more.
     "absorb"                 — fee deducted from the ticket price.

   This file must stay in sync with the frontend copy — it exists so the
   server can independently recompute the organizer's payout instead of
   trusting whatever the client sends.

   An organizer can redeem a discount code (see routes/discountCodes.js)
   that reduces their effective service-fee percentage below the platform
   base rate. All three functions below take an optional `servicePct`
   override — callers that care about a specific organizer's discounted
   rate should look it up with getEffectiveServiceChargePct() first and
   pass it through; callers that don't (e.g. a quick estimate with no
   organizer context) fall back to the flat platform rate.
───────────────────────────────────────────────────────────── */
import { db } from "../db/index.js";
import { discountCodes, discountRedemptions } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export const SERVICE_CHARGE_PCT = 5;
export const FEE_MODE_PASS_THROUGH = "pass_through";
export const FEE_MODE_ABSORB = "absorb";

/** Returns the platform fee amount in NGN (same regardless of who pays it) */
export function calcServiceChargeNaira(ticketPriceNaira, servicePct = SERVICE_CHARGE_PCT) {
  if (!ticketPriceNaira || ticketPriceNaira <= 0) return 0;
  return Math.ceil(ticketPriceNaira * servicePct / 100);
}

/** Returns the total the attendee pays at checkout, in NGN */
export function calcTotalWithChargeNaira(ticketPriceNaira, feeMode = FEE_MODE_PASS_THROUGH, servicePct = SERVICE_CHARGE_PCT) {
  if (!ticketPriceNaira || ticketPriceNaira <= 0) return 0;
  if (feeMode === FEE_MODE_ABSORB) return ticketPriceNaira; // fee comes out of the organizer's cut instead
  return ticketPriceNaira + calcServiceChargeNaira(ticketPriceNaira, servicePct);
}

/** Returns the amount the organizer actually receives after the platform fee, in NGN */
export function calcOrganizerEarningNaira(ticketPriceNaira, feeMode = FEE_MODE_PASS_THROUGH, servicePct = SERVICE_CHARGE_PCT) {
  if (!ticketPriceNaira || ticketPriceNaira <= 0) return 0;
  if (feeMode === FEE_MODE_ABSORB) return ticketPriceNaira - calcServiceChargeNaira(ticketPriceNaira, servicePct);
  return ticketPriceNaira; // attendee covered the fee on top, organizer keeps the full price
}

/**
 * Looks up this organizer's currently-active discount(s) and returns their
 * effective service-fee percentage. "X% off" is applied multiplicatively to
 * the base rate — a 20%-off code on a 5% base fee gives 5 * (1 - 20/100) =
 * 4%, not a flat 5-point cut. If an organizer has redeemed more than one
 * still-active code, the best (largest) discount wins — discounts don't
 * stack.
 */
export async function getEffectiveServiceChargePct(orgId, basePct = SERVICE_CHARGE_PCT) {
  if (!orgId) return basePct;
  const now = new Date();
  const rows = await db
    .select({ discountPct: discountCodes.discountPct, expiresAt: discountCodes.expiresAt })
    .from(discountRedemptions)
    .innerJoin(discountCodes, eq(discountRedemptions.codeId, discountCodes.id))
    .where(and(
      eq(discountRedemptions.orgId, orgId),
      eq(discountCodes.active, true),
      eq(discountCodes.appliesTo, "service_fee"),
    ));
  if (!rows.length) return basePct;

  // Filter out expired codes here in JS rather than in the query above —
  // this list is always tiny (one org rarely holds more than a couple of
  // redeemed codes), so a plain filter is simpler than expressing a
  // nullable-column "not expired" condition in the query builder.
  const stillActive = rows.filter(r => !r.expiresAt || new Date(r.expiresAt) > now);
  if (!stillActive.length) return basePct;

  const bestDiscountPct = stillActive.reduce((max, r) => Math.max(max, r.discountPct), 0);
  const effective = basePct * (1 - bestDiscountPct / 100);
  return Math.max(0, Math.round(effective * 100) / 100);
}
