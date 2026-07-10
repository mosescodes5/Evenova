// frontend/src/utils/api.js
// Thin wrapper around fetch for talking to the Express/Drizzle backend.
// Used for everything security-sensitive (auth) — NOT the Supabase-direct
// reads in db.js, which remain for public, non-sensitive data.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* empty body, e.g. some 204s */ }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.code;
    // A 401 here means the stored token is missing/invalid/expired — every
    // subsequent authenticated call will fail the same way until the user
    // logs in again. Broadcast it so App.jsx can log out + notify instead
    // of each caller failing quietly on its own (e.g. wallet screens).
    if (res.status === 401 && typeof window !== "undefined" && path !== "/auth/login") {
      window.dispatchEvent(new CustomEvent("evenova:unauthorized"));
    }
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  verifyEmail: (token) => request("/auth/verify-email", { method: "POST", body: { token } }),
  resendVerification: (email) => request("/auth/resend-verification", { method: "POST", body: { email } }),
  logout: (token) => request("/auth/logout", { method: "POST", token }),

  // Admin — reviewing organizer applications
  listOrganizerApplications:   (token) => request("/admin/organizers", { token }),
  approveOrganizerApplication: (id, token) => request(`/admin/organizers/${id}/approve`, { method: "POST", token }),
  rejectOrganizerApplication:  (id, token) => request(`/admin/organizers/${id}/reject`,  { method: "POST", token }),

  // Payments — server-side re-verification before issuing a paid ticket,
  // and (if orgId/ticketPriceNaira are given) crediting the org's wallet.
  verifyPayment: (reference, provider, expectedAmountKobo, extra = {}) =>
    request("/payments/verify", { method: "POST", body: { reference, provider, expectedAmountKobo, ...extra } }),

  // Wallet — organizer-facing balance, history, and withdrawals
  getWalletBalance: (token) => request("/wallet/balance", { token }),
  getWalletTransactions: (token) => request("/wallet/transactions", { token }),
  listBanks: (token) => request("/wallet/banks", { token }),
  resolveBankAccount: (accountNumber, bankCode, token) =>
    request("/wallet/resolve-account", { method: "POST", body: { accountNumber, bankCode }, token }),
  listMyWithdrawals: (token) => request("/wallet/withdrawals", { token }),
  requestWithdrawal: (payload, token) => request("/wallet/withdrawals", { method: "POST", body: payload, token }),

  // Admin — withdrawal review/payout
  listAllWithdrawals: (status, token) =>
    request(`/admin/withdrawals${status ? `?status=${status}` : ""}`, { token }),
  approveWithdrawal: (id, token) => request(`/admin/withdrawals/${id}/approve`, { method: "POST", token }),
  markWithdrawalPaid: (id, providerReference, adminNote, token) =>
    request(`/admin/withdrawals/${id}/mark-paid`, { method: "POST", body: { providerReference, adminNote }, token }),
  rejectWithdrawal: (id, adminNote, token) =>
    request(`/admin/withdrawals/${id}/reject`, { method: "POST", body: { adminNote }, token }),

  // Bank transfers — Evenova's own account, never an organizer's
  getPlatformBankDetails: () => request("/payments/bank-details"),
  listPendingBankTransfers: (token) => request("/admin/bank-transfers", { token }),
  confirmBankTransfer: (eventId, ticketId, token) =>
    request("/admin/bank-transfers/confirm", { method: "POST", body: { eventId, ticketId }, token }),
  rejectBankTransfer: (eventId, ticketId, reason, token) =>
    request("/admin/bank-transfers/reject", { method: "POST", body: { eventId, ticketId, reason }, token }),
};