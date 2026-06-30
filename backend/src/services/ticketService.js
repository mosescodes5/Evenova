import { config } from "../config.js";
import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const { tickets, ticketTypes, scanLogs } = schema;

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

// ── Ticket CRUD ────────────────────────────────────────────────

/**
 * Creates a ticket row. If `ticketTypeId` is supplied, capacity is checked
 * and `sold` is incremented atomically so two concurrent buyers can't both
 * claim the last seat.
 * `status` is "unused" for manual/free issuance, "pending_payment" when a
 * paid online purchase is initiated (flipped to "unused" by confirmPayment).
 */
async function createTicket({ eventId, ticketTypeId, gateId, holderName, holderEmail, holderPhone, customData, isManual, issuedBy, note, pendingPayment = false }) {
  return db.transaction(async (tx) => {
    if (ticketTypeId) {
      // Lock the row and check capacity (0 = unlimited)
      const [type] = await tx.select().from(ticketTypes).where(eq(ticketTypes.id, ticketTypeId)).for("update");
      if (!type) throw Object.assign(new Error("Ticket type not found"), { status: 404 });
      if (type.quantity > 0 && type.sold >= type.quantity) {
        throw Object.assign(new Error("This ticket type is sold out"), { status: 409 });
      }
      await tx.update(ticketTypes).set({ sold: sql`${ticketTypes.sold} + 1` }).where(eq(ticketTypes.id, ticketTypeId));
    }

    const tId = genId("TKT");
    const uId = genId("USR");
    const code = encodeTicket(eventId, tId, uId);

    const [ticket] = await tx.insert(tickets).values({
      eventId, ticketTypeId, gateId,
      code, holderName, holderEmail: holderEmail || "", holderPhone: holderPhone || "",
      customData: customData || {},
      status: pendingPayment ? "pending_payment" : "unused",
      isManual: !!isManual, issuedBy: issuedBy || null, note: note || "",
    }).returning();

    return ticket;
  });
}

async function validateScan({ qrCode, gateId, eventId, staffId }) {
  const verification = verifyQR(qrCode);
  if (!verification.ok) {
    await logScan({ eventId, gateId, staffId, status: "rejected", reason: verification.reason });
    return { status: "rejected", reason: verification.reason };
  }

  const { eId } = verification;
  if (eId !== eventId) {
    await logScan({ eventId, gateId, staffId, status: "rejected", reason: "Ticket is for a different event" });
    return { status: "rejected", reason: "Ticket is for a different event" };
  }

  // Look the ticket up by its signed code rather than trusting the raw id,
  // since the code itself is what was cryptographically verified.
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.code, qrCode.trim()) });
  if (!ticket) {
    await logScan({ eventId, gateId, staffId, status: "rejected", reason: "Ticket not found" });
    return { status: "rejected", reason: "Ticket not found" };
  }
  if (ticket.status === "used") {
    await logScan({ ticketId: ticket.id, eventId, gateId, staffId, status: "rejected", reason: `Already checked in at ${ticket.checkedInAt?.toISOString() || "?"}` });
    return { status: "rejected", reason: "Already checked in" };
  }
  if (ticket.status === "pending_payment") {
    await logScan({ ticketId: ticket.id, eventId, gateId, staffId, status: "rejected", reason: "Payment not confirmed" });
    return { status: "rejected", reason: "Payment not confirmed for this ticket" };
  }
  if (ticket.status === "refunded" || ticket.status === "void") {
    await logScan({ ticketId: ticket.id, eventId, gateId, staffId, status: "rejected", reason: `Ticket is ${ticket.status}` });
    return { status: "rejected", reason: `Ticket has been ${ticket.status}` };
  }

  await db.update(tickets).set({ status: "used", checkedInAt: new Date(), checkedInBy: staffId }).where(eq(tickets.id, ticket.id));
  await logScan({ ticketId: ticket.id, eventId, gateId, staffId, status: "admitted" });

  return { status: "admitted", ticketId: ticket.id, holderName: ticket.holderName };
}

async function logScan({ ticketId = null, eventId, gateId, staffId, status, reason = null }) {
  await db.insert(scanLogs).values({ ticketId, eventId, gateId, staffId, status, reason });
}

async function getPendingByPaymentRef(ref) {
  return db.query.tickets.findFirst({ where: eq(tickets.paymentRef, ref) });
}

async function confirmPayment(ticketId, paymentRef, provider) {
  const [ticket] = await db.update(tickets)
    .set({ status: "unused", paymentRef, paymentProvider: provider })
    .where(eq(tickets.id, ticketId))
    .returning();
  return ticket;
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
