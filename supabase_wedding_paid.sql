-- Adds the wedding_paid column to the legacy "events" table (the one
-- read by the public events_public Supabase view and written to by
-- backend/src/routes/eventsFlat.js — NOT the unused Drizzle-modeled
-- "events" table). Same situation as is_wedding/couple_names/etc. before
-- it: this table isn't tracked by Drizzle's migration system, so this
-- needs to be run manually in Supabase's SQL Editor.
--
-- Run this once, in Supabase Dashboard → SQL Editor → New query → paste
-- and run.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS wedding_paid boolean NOT NULL DEFAULT false;
