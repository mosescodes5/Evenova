// backend/src/db/legacyMappers.js
// Mirrors frontend/src/utils/db.js's toX/fromX functions exactly. These
// write to the same "legacy" flat Supabase tables the frontend used to
// write to directly — the mapping MUST stay identical on both sides or
// writes from one side won't round-trip through reads on the other.

export const fromOrg = (o) => ({
  id:              o.id,
  name:            o.name,
  account_type:    o.accountType,
  contact_name:    o.contactName,
  phone:           o.phone,
  id_type:         o.idType,
  id_number:       o.idNumber,
  expected_guests: o.expectedGuests,
  status:          o.status,
  staff:           o.staff          ?? [],
  payment_config:  o.paymentConfig  ?? {},
});

export const toOrg = (r) => ({
  id:             r.id,
  name:           r.name,
  accountType:    r.account_type,
  contactName:    r.contact_name,
  phone:          r.phone,
  idType:         r.id_type,
  idNumber:       r.id_number,
  expectedGuests: r.expected_guests,
  status:         r.status,
  staff:          r.staff          ?? [],
  paymentConfig:  r.payment_config ?? {},
});

export const fromEvent = (e) => ({
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

export const toEvent = (r) => ({
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

export const toLog = (r) => ({
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

export const fromLog = (l) => ({
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

export const fromBlast = (b) => ({
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
