-- ============================================================================
-- Evenova — RLS lockdown (run AFTER deploying the backend changes)
-- ============================================================================
-- Do NOT run this until the new backend routes (team, events-flat,
-- scan-logs, email-blasts, org-profile) are deployed and working — until
-- then, the frontend is still writing some of these tables directly with
-- the anon key, and this will break that.
-- ============================================================================

alter table public.events     enable row level security;
alter table public.organizers enable row level security;
alter table public.scan_logs  enable row level security;
-- email_blasts already has RLS enabled from earlier.

-- Drop the temporary "anon can do anything" policy on email_blasts —
-- writes now go through the backend's service-role client, which bypasses
-- RLS entirely, so no anon/authenticated policy is needed for writes.
drop policy if exists "anon read/write email_blasts" on public.email_blasts;

-- No INSERT/UPDATE/DELETE policies for anon/authenticated on any of these
-- four tables — that's what makes writes backend-only. The service role
-- key (used only in backend/src/db/supabase.js) bypasses RLS by design.

-- The frontend reads events (for BOTH the public explore page and an
-- organizer's own dashboard) via the same anon-key call, with no way to
-- prove "I'm this event's owner" at the database level (no Supabase Auth
-- session — only your separate JWT). So this has to allow full read access
-- for now, same as today (RLS was already off, so this isn't a new
-- exposure) — it just formalizes it and blocks writes.
create policy "public can read events"
on public.events
for select
to anon, authenticated
using (true);

-- ⚠️ KNOWN GAP, not fixed by this script: the `tickets` column on each
-- event row contains attendee names/emails/phone numbers. With the policy
-- above, anyone with your anon key can read every event's full attendee
-- list via the Supabase REST API directly — same as before this script,
-- but worth fixing properly: the real fix is a Postgres VIEW that exposes
-- only public-safe columns (id, title, date, venue, ticket_types pricing —
-- NOT tickets/gates) for anon reads, while the organizer's own dashboard
-- reads through a new authenticated backend endpoint instead. Ask me to
-- build that when you're ready — it's a genuine privacy issue worth
-- prioritizing before this app has real attendee data in it.

-- Same reasoning for organizers: allow read (matches today's already-open
-- behavior), but flag it — `payment_config` likely holds bank account
-- details, which the anon key can currently read for every organizer.
create policy "public can read organizers"
on public.organizers
for select
to anon, authenticated
using (true);
-- ⚠️ Same gap as above: split this into a public-safe view (name, logo)
-- vs. an authenticated backend read of payment_config, when you're ready.

-- scan_logs has no SELECT policy for anon/authenticated at all — no page
-- needs public read access to check-in logs, so it stays fully private,
-- readable only via the backend's service role.
