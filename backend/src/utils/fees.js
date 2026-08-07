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
───────────────────────────────────────────────────────────── */

export const SERVICE_CHARGE_PCT = 5;
export const FEE_MODE_PASS_THROUGH = "pass_through";
export const FEE_MODE_ABSORB = "absorb";

/** Returns the platform fee amount in NGN (same regardless of who pays it) */
export function calcServiceChargeNaira(ticketPriceNaira) {
  if (!ticketPriceNaira || ticketPriceNaira <= 0) return 0;
  return Math.ceil(ticketPriceNaira * SERVICE_CHARGE_PCT / 100);
}

/** Returns the total the attendee pays at checkout, in NGN */
export function calcTotalWithChargeNaira(ticketPriceNaira, feeMode = FEE_MODE_PASS_THROUGH) {
  if (!ticketPriceNaira || ticketPriceNaira <= 0) return 0;
  if (feeMode === FEE_MODE_ABSORB) return ticketPriceNaira; // fee comes out of the organizer's cut instead
  return ticketPriceNaira + calcServiceChargeNaira(ticketPriceNaira);
}

/** Returns the amount the organizer actually receives after the platform fee, in NGN */
export function calcOrganizerEarningNaira(ticketPriceNaira, feeMode = FEE_MODE_PASS_THROUGH) {
  if (!ticketPriceNaira || ticketPriceNaira <= 0) return 0;
  if (feeMode === FEE_MODE_ABSORB) return ticketPriceNaira - calcServiceChargeNaira(ticketPriceNaira);
  return ticketPriceNaira; // attendee covered the fee on top, organizer keeps the full price
}
