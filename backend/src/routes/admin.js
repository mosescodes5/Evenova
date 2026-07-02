import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";
import { walletService } from "../services/walletService.js";
import { paystackTransferService } from "../services/paystackTransferService.js";

const { organizers, users, withdrawals } = schema;
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
// Bank withdrawals: attempts an automatic payout via Paystack Transfers,
// straight out of Evenova's Paystack balance, and debits the wallet only
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
    const recipientCode = await paystackTransferService.createTransferRecipient({
      accountNumber: w.accountNumber, bankCode: w.bankCode, accountName: w.accountName,
    });
    const transfer = await paystackTransferService.initiateTransfer({
      recipientCode, amountKobo: w.amountKobo,
      reason: `Evenova payout — withdrawal ${w.id}`,
      reference: `wd_${w.id}`,
    });

    await walletService.debitForWithdrawal({
      orgId: w.orgId, amountKobo: w.amountKobo, withdrawalId: w.id,
      note: "Withdrawal paid via Paystack transfer",
    });
    await db.update(withdrawals)
      .set({
        status: "paid",
        paystackTransferCode: transfer.transferCode,
        providerReference: transfer.transferCode,
        processedBy: req.user.id,
        processedAt: new Date(),
      })
      .where(eq(withdrawals.id, id));

    res.json({ message: "Transfer initiated", transferCode: transfer.transferCode });
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

export default router;
