// backend/src/db/supabase.js
// Service-role Supabase client for the "legacy" flat tables (events,
// organizers, scan_logs, email_blasts) that the frontend used to write to
// directly. The service-role key bypasses Row Level Security entirely, so
// this client must NEVER be exposed to the frontend — it's only used here,
// after requireAuth/requireOrganizer has already checked who's asking.
import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  console.error(
    "[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — " +
    "team/event/scan-log/blast writes will fail. Set them in your backend's env."
  );
}

// IMPORTANT: createClient() throws synchronously if the URL is empty/invalid.
// Since this module is imported at server startup (not lazily, per-request),
// letting that throw escape used to crash the ENTIRE backend on boot —
// every route, including login/signup, which have nothing to do with these
// "legacy" tables. Guard it so a missing Supabase config only breaks the
// specific features that need it, not the whole app.
export const supabaseAdmin = (config.supabase.url && config.supabase.serviceRoleKey)
  ? createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false } })
  : null;
