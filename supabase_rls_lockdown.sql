-- ============================================================================
-- Evenova — RLS lockdown + PII-safe public views
-- ============================================================================
-- Run AFTER deploying the updated backend (needs the new /events-flat/mine,
-- /org-profile, /scan-logs/mine, /team endpoints) and frontend (needs the
-- updated db.js reading from the *_public views below, and the App.jsx
-- effect that merges in an organizer's own full data after login).
-- Running this before deploying that code will break the app — the anon
-- key's write access (and unrestricted table reads) get cut off here.
-- ============================================================================

alter table public.events     enable row level security;
alter table public.organizers enable row level security;
alter table public.scan_logs  enable row level security;
-- email_blasts already has RLS enabled from earlier.

drop policy if exists "anon read/write email_blasts" on public.email_blasts;

-- No policies at all for anon/authenticated on the four base tables →
-- deny by default. The backend's service-role client (backend/src/db/
-- supabase.js) bypasses RLS entirely and is the only thing that can read
-- or write these tables directly. Public/anonymous access goes through
-- the views below instead, which simply don't select the sensitive
-- columns — so even direct REST calls to the raw tables now return
-- nothing for anon, while the views return the safe subset.


-- ── Public-safe views ──────────────────────────────────────────────────────

-- Every column except `tickets` (attendee names/emails/phones/custom form
-- data). Public explore/event pages only ever needed the rest of this.
create or replace view public.events_public as
select id, org_id, title, description, category, date, time, end_time,
       venue, city, status, featured, banner, checkin_count, gates,
       ticket_types, reg_fields, created_at
from public.events;

-- Only what public pages actually display — no contact_name, phone,
-- id_type, id_number (KYC/government ID), or staff (team emails).
create or replace view public.organizers_public as
select id, name, account_type, status, payment_config, expected_guests, created_at
from public.organizers;

grant select on public.events_public     to anon, authenticated;
grant select on public.organizers_public to anon, authenticated;

-- These views are owned by whichever role runs this script (normally the
-- Supabase `postgres`/service role), so — per standard Postgres view
-- semantics — they read the underlying tables with the *owner's*
-- privileges, not the querying anon role's. That's what lets anon read
-- through the view even though it now has zero direct policies on the
-- base tables. If you ever recreate these views under a different role,
-- re-run the `grant select` lines above.


-- ── Sanity check ────────────────────────────────────────────────────────────
-- After running this, confirm from a fresh (logged-out) browser tab that:
--   1. The explore/event pages still load events and organizer names.
--   2. Opening browser devtools → Network → the request to
--      /rest/v1/events (raw table, not events_public) returns an empty
--      array or a permissions error — NOT ticket data.
--   3. Logged in as an organizer, the dashboard still shows attendee
--      lists, check-in counts, and team members (via the new backend
--      endpoints, not the anon key).
