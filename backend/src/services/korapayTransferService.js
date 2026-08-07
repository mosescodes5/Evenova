import { config } from "../config.js";

const KORAPAY_BASE = "https://api.korapay.com/merchant/api/v1";

async function kp(path, options = {}) {
  const resp = await fetch(`${KORAPAY_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.payments.korapay.secretKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await resp.json();
  if (!resp.ok || data.status === false) {
    throw new Error(data.message || `Korapay request failed (${resp.status})`);
  }
  return data;
}

/** Nigerian bank list for the withdrawal form's bank picker. */
async function listBanks() {
  const data = await kp("/misc/banks?countryCode=NG");
  return (data.data || []).map((b) => ({ name: b.name, code: b.code }));
}

/** Confirms the account holder's name before a withdrawal is submitted. */
async function resolveAccount(accountNumber, bankCode) {
  const data = await kp("/misc/banks/resolve", {
    method: "POST",
    body: JSON.stringify({ bank: bankCode, account: accountNumber, currency: "NG" }),
  });
  return { accountName: data.data.account_name, accountNumber: data.data.account_number };
}

/**
 * Initiates a payout (disbursement) straight out of Evenova's Korapay
 * balance. Korapay confirms completion later via the `transfer.success` /
 * `transfer.failed` webhook (see routes/webhooks.js).
 */
async function initiatePayout({ accountNumber, bankCode, accountName, amountKobo, narration, reference, email }) {
  const data = await kp("/transactions/disburse", {
    method: "POST",
    body: JSON.stringify({
      reference,
      destination: {
        type: "bank_account",
        amount: Number((amountKobo / 100).toFixed(2)),
        currency: "NGN",
        narration,
        bank_account: { bank: bankCode, account: accountNumber },
        customer: { name: accountName, email },
      },
    }),
  });
  return { reference: data.data.reference, status: data.data.status };
}

export const korapayTransferService = { listBanks, resolveAccount, initiatePayout };
