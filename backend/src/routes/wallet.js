import { Router } from "express";
import { eq } from "drizzle-orm";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { ticketLimiter } from "../middleware/rateLimiter.js";
import { db, schema } from "../db/index.js";
import { walletService } from "../services/walletService.js";
import { paystackTransferService } from "../services/paystackTransferService.js";

const { withdrawals } = schema;
const router = Router();

router.use(requireAuth, requireOrganizer);

// Every route here scopes to req.user.orgId — an organizer can only ever
// see/withdraw their own money, never another org's.

// ── GET /api/wallet/balance ─────────────────────────────────
router.get("/balance", async (req, res, next) => {
  try {
    const balanceKobo = await walletService.getBalanceKobo(req.user.orgId);
    res.json({ balanceKobo, balanceNaira: balanceKobo / 100 });
  } catch (err) { next(err); }
});

// ── GET /api/wallet/transactions ────────────────────────────
router.get("/transactions", async (req, res, next) => {
  try {
    const txns = await walletService.listTransactions(req.user.orgId);
    res.json(txns);
  } catch (err) { next(err); }
});

// ── GET /api/wallet/banks ───────────────────────────────────
// Nigerian bank list for the withdrawal form's bank picker.
router.get("/banks", async (req, res, next) => {
  try {
    const banks = await paystackTransferService.listBanks();
    res.json(banks);
  } catch (err) { next(err); }
});

// ── POST /api/wallet/resolve-account ────────────────────────
// Confirms the account holder's name before a withdrawal is submitted, so
// organizers can catch typos before money is ever involved.
router.post("/resolve-account", async (req, res, next) => {
  try {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: "accountNumber and bankCode are required" });
    }
    const result = await paystackTransferService.resolveAccount(accountNumber, bankCode);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Couldn't verify that account — double check the number and bank." });
  }
});

// ── GET /api/wallet/withdrawals ─────────────────────────────
router.get("/withdrawals", async (req, res, next) => {
  try {
    const rows = await db.query.withdrawals.findMany({
      where: eq(withdrawals.orgId, req.user.orgId),
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    });
    res.json(rows);
  } catch (err) { next(err); }
});

// ── POST /api/wallet/withdrawals ────────────────────────────
// Creates a withdrawal request. Money does NOT move yet — this just puts
// the request in the queue. Bank withdrawals can be auto-paid by an admin
// via Paystack Transfers; crypto withdrawals are always fulfilled manually
// (see admin.js for why).
router.post("/withdrawals", ticketLimiter, async (req, res, next) => {
  try {
    const { amountNaira, method } = req.body;
    const amountKobo = Math.round(Number(amountNaira) * 100);

    if (!amountKobo || amountKobo <= 0) {
      return res.status(400).json({ error: "A valid amount is required" });
    }
    if (!["bank", "crypto"].includes(method)) {
      return res.status(400).json({ error: "method must be \"bank\" or \"crypto\"" });
    }

    const balanceKobo = await walletService.getBalanceKobo(req.user.orgId);
    if (amountKobo > balanceKobo) {
      return res.status(400).json({ error: "That's more than your current balance" });
    }

    let row = { orgId: req.user.orgId, requestedBy: req.user.id, amountKobo, method };

    if (method === "bank") {
      const { bankCode, bankName, accountNumber, accountName } = req.body;
      if (!bankCode || !accountNumber || !accountName) {
        return res.status(400).json({ error: "Bank details are incomplete" });
      }
      row = { ...row, bankCode, bankName, accountNumber, accountName };
    } else {
      const { cryptoAsset, cryptoNetwork, cryptoAddress } = req.body;
      if (!cryptoAsset || !cryptoNetwork || !cryptoAddress) {
        return res.status(400).json({ error: "Crypto payout details are incomplete" });
      }
      row = { ...row, cryptoAsset, cryptoNetwork, cryptoAddress };
    }

    const [created] = await db.insert(withdrawals).values(row).returning();
    res.status(201).json(created);
  } catch (err) { next(err); }
});

export default router;
