// backend/src/db/schema.js
// Drizzle ORM schema — Postgres
// Run `npm run db:generate` then `npm run db:migrate` after editing this file.

import {
  pgTable, text, varchar, integer, boolean, timestamp, jsonb, uuid, pgEnum,
  uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const roleEnum   = pgEnum("role", ["admin", "organizer", "staff"]);
export const orgStatusEnum = pgEnum("org_status", ["pending", "approved", "rejected"]);
export const accountTypeEnum = pgEnum("account_type", ["individual", "organisation"]);
export const eventStatusEnum = pgEnum("event_status", ["draft", "upcoming", "live", "ended", "cancelled"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["pending_payment", "unused", "used", "refunded", "void"]);

// ── Organizers (the company/brand running events) ─────────────
export const organizers = pgTable("organizers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  accountType: accountTypeEnum("account_type").default("individual").notNull(),
  contactName: varchar("contact_name", { length: 200 }),
  phone: varchar("phone", { length: 30 }),
  idType: varchar("id_type", { length: 50 }),
  idNumber: varchar("id_number", { length: 100 }),
  expectedGuests: integer("expected_guests"), // how many attendees they expect per event, asked at sign-up
  status: orgStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Users (admin / organizer-owner / staff — all log in here) ─
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 200 }),
  role: roleEnum("role").notNull(),
  orgId: uuid("org_id").references(() => organizers.id, { onDelete: "cascade" }),
  status: orgStatusEnum("status").default("approved").notNull(), // org owners start pending; staff approved by default
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationExpires: timestamp("verification_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

// ── Events ──────────────────────────────────────────────────
export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizers.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  date: varchar("date", { length: 20 }).notNull(), // ISO date
  time: varchar("time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  venue: varchar("venue", { length: 300 }).notNull(),
  city: varchar("city", { length: 120 }),
  bannerUrl: text("banner_url"),
  status: eventStatusEnum("status").default("draft").notNull(),
  regFields: jsonb("reg_fields").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  orgIdx: index("events_org_idx").on(t.orgId),
  statusIdx: index("events_status_idx").on(t.status),
}));

// ── Gates (entry points per event, e.g. "VIP Gate", "General") ─
export const gates = pgTable("gates", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
});

// ── Ticket types (pricing tiers per event) ─────────────────────
export const ticketTypes = pgTable("ticket_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  priceKobo: integer("price_kobo").notNull().default(0), // store in kobo/cents — never floats for money
  quantity: integer("quantity").notNull().default(0),     // 0 = unlimited
  sold: integer("sold").notNull().default(0),
  gateId: uuid("gate_id").references(() => gates.id),
  salesStart: timestamp("sales_start"),
  salesEnd: timestamp("sales_end"),
}, (t) => ({
  eventIdx: index("ticket_types_event_idx").on(t.eventId),
}));

// ── Tickets ─────────────────────────────────────────────────
export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  ticketTypeId: uuid("ticket_type_id").references(() => ticketTypes.id),
  gateId: uuid("gate_id").references(() => gates.id),
  code: text("code").notNull(),       // signed QR payload — eId|tId|uId|SIG
  holderName: varchar("holder_name", { length: 200 }).notNull(),
  holderEmail: varchar("holder_email", { length: 255 }),
  holderPhone: varchar("holder_phone", { length: 30 }),
  customData: jsonb("custom_data").default({}),
  status: ticketStatusEnum("status").default("pending_payment").notNull(),
  paymentRef: varchar("payment_ref", { length: 200 }),
  paymentProvider: varchar("payment_provider", { length: 30 }),
  isManual: boolean("is_manual").default(false),
  issuedBy: uuid("issued_by").references(() => users.id),
  note: text("note"),
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: uuid("checked_in_by").references(() => users.id),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
}, (t) => ({
  eventIdx: index("tickets_event_idx").on(t.eventId),
  paymentRefIdx: index("tickets_payment_ref_idx").on(t.paymentRef),
  codeIdx: uniqueIndex("tickets_code_idx").on(t.code),
}));

// ── Scan logs (every attempted check-in, admitted or rejected) ─
export const scanLogs = pgTable("scan_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  gateId: uuid("gate_id").references(() => gates.id),
  staffId: uuid("staff_id").references(() => users.id),
  status: varchar("status", { length: 20 }).notNull(), // admitted | rejected
  reason: text("reason"),
  scannedAt: timestamp("scanned_at").defaultNow().notNull(),
}, (t) => ({
  eventIdx: index("scan_logs_event_idx").on(t.eventId),
}));