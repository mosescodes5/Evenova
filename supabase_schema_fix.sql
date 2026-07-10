-- ============================================================================
-- Evenova — Supabase schema fix
-- ============================================================================
-- Root cause: frontend/src/utils/db.js writes events/organizers/scan_logs
-- straight to Supabase using a flat, denormalized shape (banner, featured,
-- checkin_count, gates, ticket_types, tickets as JSON columns on `events`;
-- staff, payment_config as JSON columns on `organizers`). The live tables
-- were created from backend/src/db/migrations (Drizzle), which uses a
-- *different*, normalized shape for the same table names — so several
-- columns the frontend needs simply don't exist. Every write fails with
-- Postgres error PGRST204 ("Could not find the '...' column in the schema
-- cache"), the failure is swallowed, and the event/staff member only ever
-- existed in memory — hence it's gone after a refresh.
--
-- Run STEP 1 first and read the output before running STEP 2. STEP 2 is
-- written to be safe to re-run (IF NOT EXISTS everywhere), but STEP 1 will
-- tell you if your `id` columns are `uuid` — see the important note below.
-- ============================================================================


-- ── STEP 1 — Inspect what you actually have right now ─────────────────────
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('events', 'organizers', 'scan_logs', 'email_blasts')
order by table_name, ordinal_position;

-- IMPORTANT: check the row where table_name = 'events' and column_name = 'id'.
-- If data_type is "uuid", the app's own generated IDs (e.g. "EVK3F9A2B",
-- produced by genId() in frontend/src/utils/crypto.js) are NOT valid UUIDs
-- and inserts will keep failing even after Step 2, with a different error
-- ("invalid input syntax for type uuid"). If that's the case, run this
-- first (only if the table doesn't already have real UUID data you need to
-- keep — check row count first!):
--
--   alter table public.events     alter column id type text;
--   alter table public.organizers alter column id type text;
--
-- Same check applies to organizers.id.


-- ── STEP 2 — Add the columns the frontend actually writes to ──────────────

alter table public.events
  add column if not exists banner        text,
  add column if not exists featured      boolean default false,
  add column if not exists checkin_count integer default 0,
  add column if not exists gates         jsonb   default '{}'::jsonb,
  add column if not exists ticket_types  jsonb   default '{}'::jsonb,
  add column if not exists tickets       jsonb   default '[]'::jsonb;
  -- reg_fields already exists per migration 0000_normal_gravity.sql — fine as-is.

alter table public.organizers
  add column if not exists staff          jsonb default '[]'::jsonb,
  add column if not exists payment_config jsonb default '{}'::jsonb;
  -- account_type / expected_guests already exist per migration 0002 — fine as-is.

-- scan_logs: db.js expects columns this table doesn't have (it collides with
-- Drizzle's own scan_logs table, which has different columns for the same
-- name: event_id vs ev_id, no denormalized names, etc). Adding the frontend's
-- expected columns alongside the existing ones (harmless — Drizzle's
-- schema.js doesn't reference these, so its own queries are unaffected):
alter table public.scan_logs
  add column if not exists ts               bigint,
  add column if not exists ev_id            text,
  add column if not exists ev_title         text,
  add column if not exists holder_name      text,
  add column if not exists gate_name        text,
  add column if not exists staff_name       text,
  add column if not exists ticket_type_name text;
  -- ticket_id, gate_id, staff_id, status, reason already exist.

-- email_blasts doesn't exist at all in the Drizzle migrations — create it
-- fresh so the "Email Blasts" feature (frontend/src/utils/db.js
-- loadBlasts/insertBlast) has somewhere to write.
create table if not exists public.email_blasts (
  id            text primary key,
  ts            bigint,
  subject       text,
  recipients    jsonb default '[]'::jsonb,
  sent          integer default 0,
  failed        integer default 0,
  sender_name   text,
  sender_email  text,
  org_id        text,
  provider      text,
  mocked        boolean default false,
  preview       text
);


-- ── STEP 3 — Row Level Security ────────────────────────────────────────────
-- If these tables have RLS enabled (Supabase default for new tables) with
-- no permissive policy, every write from the frontend's anon key will fail
-- with a *different* error ("new row violates row-level security policy" /
-- 401/403), even after Step 2. Check:
--
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename in ('events','organizers','scan_logs','email_blasts');
--
-- If rowsecurity is true and you don't already have policies allowing your
-- app's writes, either add appropriate policies or (only if you understand
-- the tradeoff — anyone with your anon key can then write freely):
--
--   alter table public.events disable row level security;
--   alter table public.organizers disable row level security;
