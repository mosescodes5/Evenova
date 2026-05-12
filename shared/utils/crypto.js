/**
 * shared/utils/crypto.js
 * Ticket signing logic shared between frontend and backend.
 * Keep in sync — both sides must use the same algorithm.
 *
 * NOTE: SECRET must match TICKET_SECRET env var on the backend
 *       and the hardcoded value in frontend/src/utils/crypto.js
 */

const DEFAULT_SECRET = "EVENOVA_PRIME_NG_2025";

export function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, "0");
}

export function signTicket(eId, tId, uId, secret = DEFAULT_SECRET) {
  return "SIG" + djb2(`${secret}:${eId}:${tId}:${uId}`);
}

export function encodeTicket(eId, tId, uId, secret = DEFAULT_SECRET) {
  return `${eId}|${tId}|${uId}|${signTicket(eId, tId, uId, secret)}`;
}

export function verifyQR(code, secret = DEFAULT_SECRET) {
  const p = (code || "").trim().split("|");
  if (p.length !== 4) return { ok: false, reason: "Malformed QR code" };
  const [eId, tId, uId, sig] = p;
  if (sig !== signTicket(eId, tId, uId, secret)) {
    return { ok: false, reason: "Invalid signature — possible counterfeit!" };
  }
  return { ok: true, eId, tId, uId };
}
