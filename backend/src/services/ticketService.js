import { config } from "../config.js";
import crypto from "crypto";

// ── Ticket Signing (mirrors frontend crypto.js) ──────────────
const SECRET = config.ticket.secret;

function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, "0");
}

function signTicket(eId, tId, uId) {
  return "SIG" + djb2(`${SECRET}:${eId}:${tId}:${uId}`);
}

function encodeTicket(eId, tId, uId) {
  return `${eId}|${tId}|${uId}|${signTicket(eId, tId, uId)}`;
}

function verifyQR(code) {
  const p = (code || "").trim().split("|");
  if (p.length !== 4) return { ok: false, reason: "Malformed QR code" };
  const [eId, tId, uId, sig] = p;
  if (sig !== signTicket(eId, tId, uId)) {
    return { ok: false, reason: "Invalid signature — possible counterfeit!" };
  }
  return { ok: true, eId, tId, uId };
}

function genId(prefix = "ID") {
  return prefix + Date.now().toString(36).slice(-4).toUpperCase() +
    crypto.randomBytes(2).toString("hex").toUpperCase();
}

// ── Ticket CRUD (stubs — wire up to your DB) ─────────────────
async function createTicket({ eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone, customData, isManual, issuedBy, note }) {
  const tId = genId("TKT");
  const uId = genId("USR");
  const code = encodeTicket(eventId, tId, uId);

  // TODO: persist to DB
  const ticket = {
    id: tId, evId: eventId, uId,
    gId: gateId, tpId: ticketTypeId, code,
    holderName, holderEmail: holderEmail || "", holderPhone: holderPhone || "",
    status: "unused", customData: customData || {},
    isManual: !!isManual, issuedBy: issuedBy || null, note: note || "",
    registeredAt: new Date().toISOString(),
  };

  return ticket;
}

async function validateScan({ qrCode, gateId, eventId, staffId }) {
  const verification = verifyQR(qrCode);
  if (!verification.ok) {
    return { status: "rejected", reason: verification.reason };
  }

  const { tId, eId } = verification;

  if (eId !== eventId) {
    return { status: "rejected", reason: "Ticket is for a different event" };
  }

  // TODO: fetch ticket from DB and check status
  // const ticket = await db.tickets.findOne({ id: tId });
  // if (!ticket) return { status: "rejected", reason: "Ticket not found" };
  // if (ticket.status === "used") return { status: "rejected", reason: "Already checked in" };

  // TODO: mark ticket as used and log the scan
  // await db.tickets.update({ id: tId }, { status: "used", checkedInAt: new Date(), checkedInBy: staffId });
  // await db.scanLogs.create({ ticketId: tId, eventId, gateId, staffId, status: "admitted", ts: Date.now() });

  return { status: "admitted", ticketId: tId };
}

async function getPendingByPaymentRef(ref) {
  // TODO: DB lookup
  return null;
}

async function confirmPayment(ticketId, paymentRef) {
  // TODO: DB update — set status to "paid" / "unused"
  return null;
}

export const ticketService = {
  createTicket,
  validateScan,
  getPendingByPaymentRef,
  confirmPayment,
  verifyQR,
  encodeTicket,
  genId,
};
