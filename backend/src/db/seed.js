// backend/src/db/seed.js
// Seeds the demo accounts referenced in the README so local/dev login works.
// Run with: npm run db:seed   (after npm run db:migrate)

import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, pool, schema } from "./index.js";
import { eq } from "drizzle-orm";

const { users, organizers } = schema;

async function upsertUser({ email, password, name, role, orgId, status = "approved" }) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    console.log(`↺  ${email} already exists — skipping`);
    return existing;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({
    email, passwordHash, name, role, orgId, status, emailVerified: true,
  }).returning();
  console.log(`✓  created ${role} ${email}`);
  return user;
}

async function main() {
  console.log("Seeding Evenova demo accounts…\n");

  // Admin — no organizer attached
  await upsertUser({
    email: "admin@evenova.ng",
    password: "AdminPass#2025",
    name: "Evenova Admin",
    role: "admin",
    orgId: null,
  });

  // Organizer's company
  let org = await db.query.organizers.findFirst({ where: eq(organizers.name, "Amara Events") });
  if (!org) {
    [org] = await db.insert(organizers).values({
      name: "Amara Events",
      contactName: "Amara Okafor",
      phone: "+2348012345678",
      status: "approved",
    }).returning();
    console.log("✓  created organizer Amara Events");
  } else {
    console.log("↺  Amara Events already exists — skipping");
  }

  // Organizer owner login
  await upsertUser({
    email: "amara@amaraevents.ng",
    password: "Amara@Ev3nt$24",
    name: "Amara Okafor",
    role: "organizer",
    orgId: org.id,
  });

  // Staff login (gate scanner only)
  await upsertUser({
    email: "kalu@amaraevents.ng",
    password: "Kalu#Gate01",
    name: "Kalu Eze",
    role: "staff",
    orgId: org.id,
  });

  console.log("\nDone. You can now log in with the credentials in the README.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});