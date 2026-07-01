import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";

const { organizers, users } = schema;
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

export default router;