import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { db, schema, pool } from "../db/index.js";
import { walletService } from "../services/walletService.js";
import { korapayTransferService } from "../services/korapayTransferService.js";
import { calcOrganizerEarningNaira, getEffectiveServiceChargePct } from "../utils/fees.js";
import { emailService } from "../services/emailService.js";

const { organizers, users, withdrawals, discountCodes, waitlistSignups } = schema;
const router = Router();

// Every route below requires a logged-in admin.
router.use(requireAuth, requireAdmin);

// ── GET /api/admin/organizers ──────────────────────────────────
// Returns organizer applications merged with their owning user's
// email/verification/approval state (email lives on `users`, not
// `organizers`, since the schema split auth out of org profile data).
router.get("/organizers", async (req, res, next) => {
  try {
    const orgs  = await db.query.organizers.findMany({ orderBy: desc(organizers.createdAt) });
    const owners = await db.query.users.findMany({ where: eq(users.role, "organizer") });
    const ownerByOrgId = new Map(owners.map((u) => [u.orgId, u]));

    const result = orgs.map((o) => {
      const owner = ownerByOrgId.get(o.id);
      return {
        id: o.id,
        name: o.name,
        accountType: o.accountType,
        contactName: o.contactName,
        phone: o.phone,
        idType: o.idType,
        idNumber: o.idNumber,
        expectedGuests: o.expectedGuests,
        createdAt: o.createdAt,
        email: owner?.email || null,
        emailVerified: owner?.emailVerified || false,
        // This is the status that actually gates login — the user's, not the
        // organizer row's. Falls back to the organizer's own status if for
        // some reason there's no owner user yet.
        status: owner?.status || o.status,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

// ── POST /api/admin/organizers/:id/approve ─────────────────────
router.post("/organizers/:id/approve", async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.update(organizers).set({ status: "approved" }).where(eq(organizers.id, id));
    await db.update(users).set({ status: "approved" })
      .where(and(eq(users.orgId, id), eq(users.role, "organizer")));
    res.json({ message: "Organizer approved" });
  } catch (err) { next(err); }
});

// ── POST /api/admin/organizers/:id/reject ──────────────────────
router.post("/organizers/:id/reject", async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.update(organizers).set({ status: "rejected" }).where(eq(organizers.id, id));
    await db.update(users).set({ status: "rejected" })
      .where(and(eq(users.orgId, id), eq(users.role, "organizer")));
    res.json({ message: "Organizer rejected" });
  } catch (err) { next(err); }
});

// ── GET /api/admin/withdrawals ──────────────────────────────────
// Optional ?status=pending filter.
router.get("/withdrawals", async (req, res, next) => {
  try {
    const { status } = req.query;
    const rows = await db.query.withdrawals.findMany({
      where: status ? eq(withdrawals.status, status) : undefined,
      orderBy: desc(withdrawals.createdAt),
    });
    const orgs = await db.query.organizers.findMany();
    const orgById = new Map(orgs.map((o) => [o.id, o]));
    res.json(rows.map((w) => ({ ...w, orgName: orgById.get(w.orgId)?.name || "Unknown" })));
  } catch (err) { next(err); }
});

// ── POST /api/admin/withdrawals/:id/approve ─────────────────────
// Bank withdrawals: attempts an automatic payout via Korapay's disburse API,
// straight out of Evenova's Korapay balance, and debits the wallet only
// once the transfer is actually initiated. If the transfer API call fails
// (insufficient platform balance, invalid account, etc.) nothing is
// debited and the request stays pending — safe to retry.
//
// Crypto withdrawals: cannot be sent automatically — see the note on
// walletTransactions/withdrawals in schema.js. This just marks the
// request "approved" so an admin knows to fulfill it manually and come
// back to /mark-paid with the transaction hash.
router.post("/withdrawals/:id/approve", async (req, res, next) => {
  try {
    const { id } = req.params;
    const w = await db.query.withdrawals.findFirst({ where: eq(withdrawals.id, id) });
    if (!w) return res.status(404).json({ error: "Withdrawal not found" });
    if (w.status !== "pending") return res.status(400).json({ error: `Already ${w.status}` });

    if (w.method === "crypto") {
      await db.update(withdrawals)
        .set({ status: "approved", processedBy: req.user.id })
        .where(eq(withdrawals.id, id));
      return res.json({ message: "Marked approved — fulfill manually, then call /mark-paid with the tx hash." });
    }

    // Bank withdrawal — attempt the real transfer now.
    const requester = w.requestedBy ? await db.query.users.findFirst({ where: eq(users.id, w.requestedBy) }) : null;
    const reference = `wd_${w.id}`;
    const transfer = await korapayTransferService.initiatePayout({
      accountNumber: w.accountNumber, bankCode: w.bankCode, accountName: w.accountName,
      amountKobo: w.amountKobo,
      narration: `Evenova payout — withdrawal ${w.id}`,
      reference,
      email: requester?.email || "payouts@evenova.app",
    });

    await walletService.debitForWithdrawal({
      orgId: w.orgId, amountKobo: w.amountKobo, withdrawalId: w.id,
      note: "Withdrawal paid via Korapay transfer",
    });
    await db.update(withdrawals)
      .set({
        status: "paid",
        providerReference: transfer.reference,
        processedBy: req.user.id,
        processedAt: new Date(),
      })
      .where(eq(withdrawals.id, id));

    res.json({ message: "Transfer initiated", reference: transfer.reference });
  } catch (err) {
    res.status(400).json({ error: "Transfer failed: " + (err.message || "unknown error") });
  }
});

// ── POST /api/admin/withdrawals/:id/mark-paid ────────────────────
// Manual settlement path — used for crypto payouts (always) and as a bank
// fallback if an admin pays out some other way and just needs to record it.
// Body: { providerReference } (tx hash for crypto, whatever reference makes sense for bank)
router.post("/withdrawals/:id/mark-paid", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { providerReference, adminNote } = req.body;
    const w = await db.query.withdrawals.findFirst({ where: eq(withdrawals.id, id) });
    if (!w) return res.status(404).json({ error: "Withdrawal not found" });
    if (w.status === "paid") return res.status(400).json({ error: "Already paid" });

    await walletService.debitForWithdrawal({
      orgId: w.orgId, amountKobo: w.amountKobo, withdrawalId: w.id,
      note: adminNote || "Withdrawal paid manually",
    });
    await db.update(withdrawals)
      .set({
        status: "paid", providerReference: providerReference || null,
        adminNote: adminNote || null, processedBy: req.user.id, processedAt: new Date(),
      })
      .where(eq(withdrawals.id, id));

    res.json({ message: "Marked as paid" });
  } catch (err) { next(err); }
});

// ── POST /api/admin/withdrawals/:id/reject ───────────────────────
router.post("/withdrawals/:id/reject", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const w = await db.query.withdrawals.findFirst({ where: eq(withdrawals.id, id) });
    if (!w) return res.status(404).json({ error: "Withdrawal not found" });
    if (w.status === "paid") return res.status(400).json({ error: "Already paid, can't reject" });

    await db.update(withdrawals)
      .set({ status: "rejected", adminNote: adminNote || null, processedBy: req.user.id, processedAt: new Date() })
      .where(eq(withdrawals.id, id));
    res.json({ message: "Withdrawal rejected" });
  } catch (err) { next(err); }
});

// ── GET /api/admin/bank-transfers ───────────────────────────────
// Bank-transfer tickets live inside the legacy events.tickets JSONB column
// (not the normalized `tickets` table — see the note in schema.js on the
// wallet tables), so this scans that column directly rather than going
// through Drizzle's query builder, which has no visibility into it.
router.get("/bank-transfers", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT id, org_id, title, tickets, ticket_types FROM events`);
    const pending = [];
    for (const row of rows) {
      for (const t of row.tickets || []) {
        if (t.paymentStatus === "pending" && t.paymentRef === "BANK_PENDING") {
          pending.push({
            eventId: row.id, eventTitle: row.title, orgId: row.org_id,
            ticketId: t.id, holderName: t.holderName, holderEmail: t.holderEmail,
            ticketPrice: t.ticketPrice, totalPaid: t.totalPaid, feeMode: t.feeMode,
            receiptUrl: t.receiptUrl, registeredAt: t.registeredAt,
          });
        }
      }
    }
    pending.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    res.json(pending);
  } catch (err) { next(err); }
});

// ── POST /api/admin/bank-transfers/confirm ──────────────────────
// Confirms Evenova actually received the transfer: flips the ticket live,
// credits the organizer's wallet (server computes the amount — never
// trusts the ticket's own stored figures blindly beyond reading price),
// and emails the attendee their now-valid ticket.
router.post("/bank-transfers/confirm", async (req, res, next) => {
  try {
    const { eventId, ticketId } = req.body;
    const { rows } = await pool.query(
      `SELECT org_id, title, date, time, venue, city, tickets, ticket_types FROM events WHERE id = $1`, [eventId]
    );
    if (!rows.length) return res.status(404).json({ error: "Event not found" });
    const { org_id: orgId, title: eventTitle, date, time, venue, city, tickets, ticket_types: ticketTypes } = rows[0];

    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) return res.status(404).json({ error: "Ticket not found" });
    const ticket = tickets[idx];
    if (ticket.paymentStatus !== "pending") {
      return res.status(400).json({ error: `Already ${ticket.paymentStatus}` });
    }

    tickets[idx] = { ...ticket, status: "unused", paymentStatus: "paid" };
    await pool.query(`UPDATE events SET tickets = $1::jsonb WHERE id = $2`, [JSON.stringify(tickets), eventId]);

    const earningNaira = calcOrganizerEarningNaira(Number(ticket.ticketPrice || 0), ticket.feeMode, await getEffectiveServiceChargePct(orgId));
    if (earningNaira > 0) {
      await walletService.creditForTicketSale({
        orgId, amountKobo: Math.round(earningNaira * 100),
        eventId, eventTitle, ticketId, paymentRef: `bank_${ticketId}`,
        note: `Bank transfer confirmed — ${eventTitle}`,
      });
    }

    if (ticket.holderEmail) {
      const ticketType = (ticketTypes || {})[ticket.tpId] || null;
      const event = { title: eventTitle, date, time, venue, city };
      emailService.sendTicketEmail(tickets[idx], ticket.holderEmail, event, ticketType).catch(console.error);
    }

    res.json({ message: "Payment confirmed, ticket issued" });
  } catch (err) { next(err); }
});

// ── POST /api/admin/bank-transfers/reject ───────────────────────
router.post("/bank-transfers/reject", async (req, res, next) => {
  try {
    const { eventId, ticketId, reason } = req.body;
    const { rows } = await pool.query(`SELECT tickets FROM events WHERE id = $1`, [eventId]);
    if (!rows.length) return res.status(404).json({ error: "Event not found" });
    const tickets = rows[0].tickets;
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) return res.status(404).json({ error: "Ticket not found" });

    tickets[idx] = { ...tickets[idx], status: "rejected", paymentStatus: "rejected", rejectReason: reason || null };
    await pool.query(`UPDATE events SET tickets = $1::jsonb WHERE id = $2`, [JSON.stringify(tickets), eventId]);
    res.json({ message: "Payment rejected" });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// Discount codes
// ═══════════════════════════════════════════════════════════════

function randomCode(prefix = "EVN") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${suffix}`;
}

// ── GET /api/admin/discount-codes ────────────────────────────────
router.get("/discount-codes", async (req, res, next) => {
  try {
    const rows = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

// ── POST /api/admin/discount-codes ───────────────────────────────
// Body: { code?, discountPct, maxRedemptions?, maxRedemptionsPerOrg?,
//         restrictedToOrgId?, expiresAt?, notes? }
// `code` is optional — if omitted, a random one is generated so admins
// don't have to invent something memorable for a one-off promo.
router.post("/discount-codes", async (req, res, next) => {
  try {
    const { code, discountPct, maxRedemptions, maxRedemptionsPerOrg, restrictedToOrgId, expiresAt, notes } = req.body;
    const pct = Number(discountPct);
    if (!pct || pct <= 0 || pct > 100) {
      return res.status(400).json({ error: "discountPct must be a number between 1 and 100" });
    }

    const finalCode = (code && code.trim() ? code.trim() : randomCode()).toUpperCase();

    const [row] = await db.insert(discountCodes).values({
      code: finalCode,
      discountPct: Math.round(pct),
      maxRedemptions: maxRedemptions != null ? Number(maxRedemptions) : null,
      maxRedemptionsPerOrg: maxRedemptionsPerOrg != null ? Number(maxRedemptionsPerOrg) : 1,
      restrictedToOrgId: restrictedToOrgId || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes || null,
      createdBy: req.user.id,
    }).returning();

    res.status(201).json(row);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That code already exists — try a different one." });
    next(err);
  }
});

// ── PATCH /api/admin/discount-codes/:id ──────────────────────────
// Toggle active/inactive, tweak limits, extend/shorten expiry, etc.
router.patch("/discount-codes/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ["discountPct", "maxRedemptions", "maxRedemptionsPerOrg", "active", "expiresAt", "notes"];
    const updates = {};
    for (const k of allowed) {
      if (k in req.body) updates[k] = k === "expiresAt" && req.body[k] ? new Date(req.body[k]) : req.body[k];
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: "No valid fields to update" });

    const [row] = await db.update(discountCodes).set(updates).where(eq(discountCodes.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Discount code not found" });
    res.json(row);
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/discount-codes/:id ─────────────────────────
router.delete("/discount-codes/:id", async (req, res, next) => {
  try {
    const [row] = await db.delete(discountCodes).where(eq(discountCodes.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Discount code not found" });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// Waitlist
// ═══════════════════════════════════════════════════════════════

// ── GET /api/admin/waitlist ───────────────────────────────────────
router.get("/waitlist", async (req, res, next) => {
  try {
    const rows = await db.select().from(waitlistSignups).orderBy(desc(waitlistSignups.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/waitlist/:id ─────────────────────────────────
// Mainly for marking someone "invited" once you've sent them a code, or
// "converted" once they've actually registered an organizer account.
router.patch("/waitlist/:id", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["pending", "invited", "converted"].includes(status)) {
      return res.status(400).json({ error: "status must be pending, invited, or converted" });
    }
    const [row] = await db.update(waitlistSignups).set({ status }).where(eq(waitlistSignups.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Waitlist entry not found" });
    res.json(row);
  } catch (err) { next(err); }
});

export default router;
