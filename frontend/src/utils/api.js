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
    err.hint = data?.hint;
    err.details = data?.details;
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
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (email, code, newPassword) =>
    request("/auth/reset-password", { method: "POST", body: { email, code, newPassword } }),

  // Admin — reviewing organizer applications
  listOrganizerApplications:   (token) => request("/admin/organizers", { token }),
  approveOrganizerApplication: (id, token) => request(`/admin/organizers/${id}/approve`, { method: "POST", token }),
  rejectOrganizerApplication:  (id, token) => request(`/admin/organizers/${id}/reject`,  { method: "POST", token }),

  // Payments — server-side re-verification before issuing a paid ticket,
  // and (if orgId/ticketPriceNaira are given) crediting the org's wallet.
  verifyPayment: (reference, provider, expectedAmountKobo, extra = {}) =>
    request("/payments/verify", { method: "POST", body: { reference, provider, expectedAmountKobo, ...extra } }),

  // Wedding hosting fee — the couple pays this directly to activate their
  // wedding; guests never pay anything.
  getWeddingFee: () => request("/payments/wedding-fee"),
  verifyWeddingFee: (eventId, reference, token) =>
    request("/payments/verify-wedding-fee", { method: "POST", body: { eventId, reference }, token }),

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

  // Discount codes — organizer redeems, admin manages
  getDiscountStatus: (token) => request("/discount-codes/status", { token }),
  redeemDiscountCode: (code, token) => request("/discount-codes/redeem", { method: "POST", body: { code }, token }),
  listDiscountCodes: (token) => request("/admin/discount-codes", { token }),
  createDiscountCode: (payload, token) => request("/admin/discount-codes", { method: "POST", body: payload, token }),
  updateDiscountCode: (id, payload, token) => request(`/admin/discount-codes/${id}`, { method: "PATCH", body: payload, token }),
  deleteDiscountCode: (id, token) => request(`/admin/discount-codes/${id}`, { method: "DELETE", token }),

  // Waitlist — signups are closed (public page removed), admin can still
  // review who already joined before that happened.
  listWaitlist: (token) => request("/admin/waitlist", { token }),
  updateWaitlistStatus: (id, status, token) => request(`/admin/waitlist/${id}`, { method: "PATCH", body: { status }, token }),

  // Wedding guest list — organizer manages, guests RSVP via their personal link
  listWeddingGuests: (eventId, token) => request(`/wedding-guests/manage/${eventId}`, { token }),
  addWeddingGuest: (eventId, guest, token) => request(`/wedding-guests/manage/${eventId}`, { method: "POST", body: guest, token }),
  addWeddingGuestsBulk: (eventId, guests, token) => request(`/wedding-guests/manage/${eventId}/bulk`, { method: "POST", body: { guests }, token }),
  updateWeddingGuest: (eventId, guestId, updates, token) => request(`/wedding-guests/manage/${eventId}/${guestId}`, { method: "PATCH", body: updates, token }),
  deleteWeddingGuest: (eventId, guestId, token) => request(`/wedding-guests/manage/${eventId}/${guestId}`, { method: "DELETE", token }),
  getWeddingInvite: (eventId, code) => request(`/wedding-guests/invite/${eventId}/${code}`),
  submitRsvp: (eventId, code, payload) => request(`/wedding-guests/invite/${eventId}/${code}/rsvp`, { method: "POST", body: payload }),

  // Bank transfers — Evenova's own account, never an organizer's
  getPlatformBankDetails: () => request("/payments/bank-details"),
  listPendingBankTransfers: (token) => request("/admin/bank-transfers", { token }),
  confirmBankTransfer: (eventId, ticketId, token) =>
    request("/admin/bank-transfers/confirm", { method: "POST", body: { eventId, ticketId }, token }),
  rejectBankTransfer: (eventId, ticketId, reason, token) =>
    request("/admin/bank-transfers/reject", { method: "POST", body: { eventId, ticketId, reason }, token }),

  // Team — organizer staff management (goes through the backend now, not
  // straight to Supabase, so it's scoped to the caller's own org)
  listTeam:   (token) => request("/team", { token }),
  addTeamMember:    (member, token) => request("/team", { method: "POST", body: member, token }),
  removeTeamMember: (staffId, token) => request(`/team/${staffId}`, { method: "DELETE", token }),

  // Events — create/update goes through the backend now (was direct-to-Supabase)
  saveEvent: (event, token) => request("/events-flat", { method: "PUT", body: event, token }),
  deleteEvent: (id, token) => request(`/events-flat/${id}`, { method: "DELETE", token }),
  registerForEvent: (eventId, ticket) => request(`/events-flat/${eventId}/register`, { method: "POST", body: { ticket } }),
  getMyEvents: (token) => request("/events-flat/mine", { token }),

  // Scan logs / email blasts — same reasoning
  saveScanLog: (log, token) => request("/scan-logs", { method: "POST", body: log, token }),
  saveEmailBlast: (blast, token) => request("/email-blasts", { method: "POST", body: blast, token }),
  getMyScanLogs: (token) => request("/scan-logs/mine", { token }),

  // Organizer account/payment settings
  updateOrgProfile: (updates, token) => request("/org-profile", { method: "PUT", body: updates, token }),
  getMyOrgProfile: (token) => request("/org-profile", { token }),
};