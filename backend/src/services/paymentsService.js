import { config } from "../config.js";

const KORAPAY_BASE = "https://api.korapay.com/merchant/api/v1";

/**
 * Verifies a payment reference directly against Korapay's API.
 * This is the step that was missing before: the frontend used to be
 * trusted to say "payment succeeded", which meant anyone could call
 * POST /api/tickets/purchase with a fake paymentRef and get a free ticket.
 * Now we always re-check server-side before issuing anything.
 */
async function verifyKorapay(reference) {
  if (!config.payments.korapay.secretKey) {
    throw Object.assign(new Error("Korapay is not configured on the server"), { status: 500 });
  }
  const resp = await fetch(`${KORAPAY_BASE}/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${config.payments.korapay.secretKey}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data.status) {
    return { verified: false, amountKobo: 0 };
  }
  // Korapay returns amounts in whole Naira (e.g. "2000.00"), not kobo.
  return {
    verified: data.data.status === "success",
    amountKobo: Math.round(parseFloat(data.data.amount_paid ?? data.data.amount) * 100),
  };
}

/**
 * @param {string} reference - payment reference from the client
 * @param {"korapay"} provider
 * @param {number} expectedAmountKobo - the ticket type's price, to guard against
 *   someone paying for a cheaper item and reusing that reference for a pricier one
 */
async function verifyPayment(reference, provider, expectedAmountKobo) {
  if (!reference || !provider) return { verified: false, reason: "Missing payment reference or provider" };

  const result = await verifyKorapay(reference);

  if (!result.verified) return { verified: false, reason: "Payment was not successful" };

  if (typeof expectedAmountKobo === "number" && expectedAmountKobo > 0 && result.amountKobo < expectedAmountKobo) {
    return { verified: false, reason: "Amount paid does not match ticket price" };
  }

  return { verified: true, email: result.email };
}

export const paymentsService = { verifyPayment, verifyKorapay };
