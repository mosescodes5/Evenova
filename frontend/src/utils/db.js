import { supabase } from "./supabase.js";

/* ── Mappers ─────────────────────────────────────────────────
   DB uses snake_case columns; app uses camelCase objects.
──────────────────────────────────────────────────────────── */
const toOrg = (r) => ({
  id:            r.id,
  name:          r.name,
  accountType:   r.account_type,
  contactName:   r.contact_name,
  phone:         r.phone,
  idType:        r.id_type,
  idNumber:      r.id_number,
  expectedGuests: r.expected_guests,
  status:        r.status,
  staff:         r.staff          ?? [],
  paymentConfig: r.payment_config ?? {},
});

const fromOrg = (o) => ({
  id:             o.id,
  name:           o.name,
  account_type:   o.accountType,
  contact_name:   o.contactName,
  phone:          o.phone,
  id_type:        o.idType,
  id_number:      o.idNumber,
  expected_guests: o.expectedGuests,
  status:         o.status,
  staff:          o.staff          ?? [],
  payment_config: o.paymentConfig  ?? {},
});

const toEvent = (r) => ({
  id:           r.id,
  orgId:        r.org_id,
  title:        r.title,
  desc:         r.description,
  date:         r.date,
  time:         r.time,
  endTime:      r.end_time,
  venue:        r.venue,
  city:         r.city,
  category:     r.category,
  status:       r.status,
  featured:     r.featured,
  banner:       r.banner,
  checkinCount: r.checkin_count,
  gates:        r.gates        ?? {},
  ticketTypes:  r.ticket_types ?? {},
  regFields:    r.reg_fields   ?? [],
  tickets:      r.tickets      ?? [],
});

const fromEvent = (e) => ({
  id:            e.id,
  org_id:        e.orgId,
  title:         e.title,
  description:   e.desc,
  date:          e.date,
  time:          e.time,
  end_time:      e.endTime,
  venue:         e.venue,
  city:          e.city,
  category:      e.category,
  status:        e.status,
  featured:      e.featured,
  banner:        e.banner,
  checkin_count: e.checkinCount ?? 0,
  gates:         e.gates        ?? {},
  ticket_types:  e.ticketTypes  ?? {},
  reg_fields:    e.regFields    ?? [],
  tickets:       e.tickets      ?? [],
});

const toLog = (r) => ({
  id:             r.id,
  ts:             r.ts,
  evId:           r.ev_id,
  evTitle:        r.ev_title,
  ticketId:       r.ticket_id,
  holderName:     r.holder_name,
  gateId:         r.gate_id,
  gateName:       r.gate_name,
  staffId:        r.staff_id,
  staffName:      r.staff_name,
  ticketTypeName: r.ticket_type_name,
  status:         r.status,
  reason:         r.reason,
});

const fromLog = (l) => ({
  id:               l.id,
  ts:               l.ts,
  ev_id:            l.evId,
  ev_title:         l.evTitle,
  ticket_id:        l.ticketId,
  holder_name:      l.holderName,
  gate_id:          l.gateId,
  gate_name:        l.gateName,
  staff_id:         l.staffId,
  staff_name:       l.staffName,
  ticket_type_name: l.ticketTypeName,
  status:           l.status,
  reason:           l.reason,
});

const toBlast = (r) => ({
  id:          r.id,
  ts:          r.ts,
  subject:     r.subject,
  recipients:  r.recipients,
  sent:        r.sent,
  failed:      r.failed,
  senderName:  r.sender_name,
  senderEmail: r.sender_email,
  orgId:       r.org_id,
  provider:    r.provider,
  mocked:      r.mocked,
  preview:     r.preview,
});

const fromBlast = (b) => ({
  id:           b.id,
  ts:           b.ts,
  subject:      b.subject,
  recipients:   b.recipients,
  sent:         b.sent,
  failed:       b.failed,
  sender_name:  b.senderName,
  sender_email: b.senderEmail,
  org_id:       b.orgId,
  provider:     b.provider,
  mocked:       b.mocked,
  preview:      b.preview,
});

/* ── Organizers ──────────────────────────────────────────── */
// Reads the public-safe VIEW (no id_number/id_type/phone/contactName/staff)
// — the anon key can no longer read the raw `organizers` table at all.
// A logged-in organizer's own full record comes from api.getMyOrgProfile()
// instead (see App.jsx).
export async function loadOrganizers() {
  const { data, error } = await supabase.from("organizers_public").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []).map(toOrg);
}

export async function getOrganizerByEmail(email) {
  const { data, error } = await supabase
    .from("organizers")
    .select("id, email, status")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveOrganizer(org) {
  const { error } = await supabase.from("organizers").upsert(fromOrg(org));
  if (error) throw error;
}

export async function deleteOrganizer(id) {
  const { error } = await supabase.from("organizers").delete().eq("id", id);
  if (error) throw error;
}

/* ── Events ──────────────────────────────────────────────── */
// Reads the public-safe VIEW (no `tickets` column — attendee names/emails/
// phones). A logged-in organizer's own events with full attendee data come
// from api.getMyEvents() instead (see App.jsx).
export async function loadEvents() {
  const { data, error } = await supabase.from("events_public").select("*");
  if (error) throw error;
  return (data ?? []).map(toEvent);
}

export async function saveEvent(event) {
  const { error } = await supabase.from("events").upsert(fromEvent(event));
  if (error) throw error;
}

/* ── Scan Logs ───────────────────────────────────────────── */
export async function loadScanLogs() {
  const { data, error } = await supabase.from("scan_logs").select("*");
  if (error) throw error;
  return (data ?? []).map(toLog);
}

export async function insertScanLog(log) {
  const { error } = await supabase.from("scan_logs").insert(fromLog(log));
  if (error) throw error;
}

/* ── Email Blasts ────────────────────────────────────────── */
export async function loadBlasts(orgId) {
  let q = supabase.from("email_blasts").select("*");
  if (orgId) q = q.eq("org_id", orgId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toBlast);
}

export async function insertBlast(blast) {
  const { error } = await supabase.from("email_blasts").insert(fromBlast(blast));
  if (error) throw error;
}

/* ── Seed helper (called on first load if DB is empty) ───── */
export async function seedIfEmpty(defaultOrgs, defaultEvents) {
  const { count: orgCount } = await supabase
    .from("organizers").select("id", { count: "exact", head: true });

  if (orgCount === 0) {
    for (const org of defaultOrgs) await saveOrganizer(org);
    for (const ev  of defaultEvents) await saveEvent(ev);
    console.log("[Evenova] Database seeded with sample data.");
  }
}