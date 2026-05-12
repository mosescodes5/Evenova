/* ─────────────────────────────────────────────────────────────
   3. CRYPTO ENGINE
───────────────────────────────────────────────────────────── */
export const SECRET = "EVENOVA_PRIME_NG_2025";
export function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).toUpperCase().padStart(8, "0");
}
export function signTicket(eId, tId, uId) { return "SIG" + djb2(`${SECRET}:${eId}:${tId}:${uId}`); }
export function encodeTicket(eId, tId, uId) { return `${eId}|${tId}|${uId}|${signTicket(eId, tId, uId)}`; }
export function verifyQR(code) {
  const p = (code || "").trim().split("|");
  if (p.length !== 4) return { ok: false, reason: "Malformed QR code" };
  const [eId, tId, uId, sig] = p;
  if (sig !== signTicket(eId, tId, uId)) return { ok: false, reason: "Invalid signature — possible fake!" };
  return { ok: true, eId, tId, uId };
}
export function genId(pfx = "ID") {
  return pfx + Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

