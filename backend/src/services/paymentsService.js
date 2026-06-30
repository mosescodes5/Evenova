import { config } from "../config.js";

/**
 * Verifies a payment reference directly against the provider's API.
 * This is the step that was missing before: the frontend used to be
 * trusted to say "payment succeeded", which meant anyone could call
 * POST /api/tickets/purchase with a fake paymentRef and get a free ticket.
 * Now we always re-check server-side before issuing anything.
 */
async function verifyPaystack(reference) {
  if (!config.payments.paystack.secretKey) {
    throw Object.assign(new Error("Paystack is not configured on the server"), { status: 500 });
  }
  const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${config.payments.paystack.secretKey}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data.status) {
    return { verified: false, amountKobo: 0 };
  }
  return {
    verified: data.data.status === "success",
    amountKobo: data.data.amount, // Paystack already returns kobo
    email: data.data.customer?.email,
  };
}

async function verifyFlutterwave(reference) {
  if (!config.payments.flutterwave.secretKey) {
    throw Object.assign(new Error("Flutterwave is not configured on the server"), { status: 500 });
  }
  const resp = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${config.payments.flutterwave.secretKey}` },
  });
  const data = await resp.json();
  if (!resp.ok || data.status !== "success") {
    return { verified: false, amountKobo: 0 };
  }
  return {
    verified: data.data.status === "successful",
    amountKobo: Math.round(data.data.amount * 100), // FLW returns naira, store kobo
    email: data.data.customer?.email,
  };
}

/**
 * @param {string} reference - payment reference from the client
 * @param {"paystack"|"flutterwave"} provider
 * @param {number} expectedAmountKobo - the ticket type's price, to guard against
 *   someone paying for a cheaper item and reusing that reference for a pricier one
 */
async function verifyPayment(reference, provider, expectedAmountKobo) {
  if (!reference || !provider) return { verified: false, reason: "Missing payment reference or provider" };

  const result = provider === "flutterwave"
    ? await verifyFlutterwave(reference)
    : await verifyPaystack(reference);

  if (!result.verified) return { verified: false, reason: "Payment was not successful" };

  if (typeof expectedAmountKobo === "number" && expectedAmountKobo > 0 && result.amountKobo < expectedAmountKobo) {
    return { verified: false, reason: "Amount paid does not match ticket price" };
  }

  return { verified: true, email: result.email };
}

export const paymentsService = { verifyPayment, verifyPaystack, verifyFlutterwave };
