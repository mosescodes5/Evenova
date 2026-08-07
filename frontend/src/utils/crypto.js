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

// The Supabase "events" table's `id` column is a real `uuid` type, so it
// rejects genId()'s short prefixed strings ("EVT...") outright with
// "invalid input syntax for type uuid". Ticket/gate/ticket-type ids don't
// need this — they live inside the `tickets`/`ticketTypes` jsonb columns,
// not as their own typed DB columns — so only the top-level event id needs
// to be a real UUID.
export function genUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for environments without crypto.randomUUID (older browsers).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

