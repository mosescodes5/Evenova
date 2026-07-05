import { config } from "../config.js";

const BASE = "https://api.paystack.co";

async function ps(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.payments.paystack.secretKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok || data.status === false) {
    throw new Error(data.message || `Paystack request failed (${res.status})`);
  }
  return data;
}

/** List Nigerian banks with their Paystack bank codes. */
async function listBanks() {
  const data = await ps("/bank?country=nigeria&currency=NGN");
  return data.data.map((b) => ({ name: b.name, code: b.code }));
}

/** Resolves an account number + bank code to the account holder's name — lets the UI confirm details before submitting a withdrawal. */
async function resolveAccount(accountNumber, bankCode) {
  const data = await ps(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
  return { accountName: data.data.account_name, accountNumber: data.data.account_number };
}

/** Creates (or reuses) a transfer recipient for a bank account. */
async function createTransferRecipient({ accountNumber, bankCode, accountName }) {
  const data = await ps("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban", currency: "NGN",
      account_number: accountNumber, bank_code: bankCode, name: accountName,
    }),
  });
  return data.data.recipient_code;
}

/** Initiates an actual bank transfer out of Evenova's Paystack balance. */
async function initiateTransfer({ recipientCode, amountKobo, reason, reference }) {
  const data = await ps("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance", amount: amountKobo, recipient: recipientCode,
      reason, reference,
    }),
  });
  return { transferCode: data.data.transfer_code, status: data.data.status };
}

export const paystackTransferService = { listBanks, resolveAccount, createTransferRecipient, initiateTransfer };
