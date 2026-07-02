// Mirrors frontend/src/styles/theme.js's calcServiceCharge / calcOrganizerEarning.
// If you change the fee percentage or formula there, update it here too —
// this is what actually determines wallet credits, so it must be the
// server's own source of truth rather than trusting a client-sent figure.

export const SERVICE_CHARGE_PCT = 5;
export const FEE_MODE_PASS_THROUGH = "pass_through";
export const FEE_MODE_ABSORB = "absorb";

export function calcServiceCharge(ticketPriceNaira) {
  if (!ticketPriceNaira || ticketPriceNaira <= 0) return 0;
  return Math.ceil((ticketPriceNaira * SERVICE_CHARGE_PCT) / 100);
}

export function calcOrganizerEarningNaira(ticketPriceNaira, feeMode = FEE_MODE_PASS_THROUGH) {
  if (!ticketPriceNaira || ticketPriceNaira <= 0) return 0;
  if (feeMode === FEE_MODE_ABSORB) return ticketPriceNaira - calcServiceCharge(ticketPriceNaira);
  return ticketPriceNaira;
}
