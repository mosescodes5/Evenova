import { eq, and, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const { walletTransactions, withdrawals } = schema;

/** Returns the organizer's current balance in kobo. */
async function getBalanceKobo(orgId) {
  const [row] = await db
    .select({
      credits: sql`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'credit' THEN ${walletTransactions.amountKobo} ELSE 0 END), 0)`,
      debits:  sql`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'debit'  THEN ${walletTransactions.amountKobo} ELSE 0 END), 0)`,
    })
    .from(walletTransactions)
    .where(eq(walletTransactions.orgId, orgId));
  return Number(row?.credits || 0) - Number(row?.debits || 0);
}

/** Returns transaction history, most recent first. */
async function listTransactions(orgId, limit = 100) {
  return db.query.walletTransactions.findMany({
    where: eq(walletTransactions.orgId, orgId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit,
  });
}

/**
 * Credits an organizer's wallet for a real, verified ticket sale.
 * Idempotent on paymentRef — calling this twice for the same payment
 * reference (e.g. a retried request) will not double-credit.
 */
async function creditForTicketSale({ orgId, amountKobo, eventId, eventTitle, ticketId, paymentRef, note }) {
  if (!orgId || !amountKobo || amountKobo <= 0) return null;

  if (paymentRef) {
    const existing = await db.query.walletTransactions.findFirst({
      where: and(eq(walletTransactions.orgId, orgId), eq(walletTransactions.paymentRef, paymentRef)),
    });
    if (existing) return existing; // already credited, don't double-count
  }

  const [row] = await db.insert(walletTransactions).values({
    orgId, type: "credit", amountKobo,
    eventId: eventId ? String(eventId) : null,
    eventTitle: eventTitle || null,
    ticketId: ticketId ? String(ticketId) : null,
    paymentRef: paymentRef || null,
    note: note || null,
  }).returning();
  return row;
}

/** Debits an organizer's wallet for a paid-out withdrawal. */
async function debitForWithdrawal({ orgId, amountKobo, withdrawalId, note }) {
  const [row] = await db.insert(walletTransactions).values({
    orgId, type: "debit", amountKobo, withdrawalId, note: note || null,
  }).returning();
  return row;
}

/**
 * Reconciles a payout's final status when Korapay's transfer webhook
 * arrives. The wallet is already debited at initiation time (see
 * admin.js), so this doesn't touch the ledger — it only flips a "paid"
 * withdrawal back to "approved" if Korapay ultimately reports the
 * transfer as failed, so an admin knows it needs manual follow-up
 * (e.g. pay out a different way) rather than treating it as settled.
 */
async function handlePayoutWebhook(event, data) {
  if (!data?.reference) return;
  const withdrawal = await db.query.withdrawals.findFirst({
    where: eq(withdrawals.providerReference, data.reference),
  });
  if (!withdrawal) return;

  if (event === "transfer.failed" && withdrawal.status === "paid") {
    await db.update(withdrawals)
      .set({
        status: "approved",
        adminNote: "Korapay reported this transfer as failed — needs manual follow-up.",
      })
      .where(eq(withdrawals.id, withdrawal.id));
  }
}

export const walletService = {
  getBalanceKobo, listTransactions, creditForTicketSale, debitForWithdrawal, handlePayoutWebhook,
};
