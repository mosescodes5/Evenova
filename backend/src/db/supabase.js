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

// supabase-js builds every request as `${SUPABASE_URL}/rest/v1/<table>`. A
// trailing slash, or an accidentally-included `/rest/v1` (people sometimes
// copy the URL straight out of the API request example in the dashboard
// instead of the plain "Project URL" field), makes that concatenation
// produce a path Supabase's REST layer rejects outright with "Invalid path
// specified in request URL" — which otherwise looks identical to a real
// data problem. Catch and normalize/warn about that here, once, at boot,
// instead of it silently breaking every write.
let supabaseUrl = config.supabase.url;
if (supabaseUrl) {
  if (/\/rest\/v1\/?$/.test(supabaseUrl)) {
    console.error(
      `[supabase] SUPABASE_URL ("${supabaseUrl}") looks like it includes "/rest/v1" — ` +
      "it should be just the bare project URL, e.g. https://xxxxx.supabase.co " +
      "(Supabase dashboard → Settings → API → Project URL). Stripping it automatically, " +
      "but please fix the env var — this exact mistake causes \"Invalid path specified in request URL\" errors."
    );
    supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "");
  }
  if (supabaseUrl.endsWith("/")) supabaseUrl = supabaseUrl.slice(0, -1);
  if (!/^https?:\/\//.test(supabaseUrl)) {
    console.error(
      `[supabase] SUPABASE_URL ("${supabaseUrl}") doesn't start with http(s):// — ` +
      "this is very likely the wrong value (e.g. a Postgres connection string was pasted " +
      "in by mistake instead of the project's API URL)."
    );
  }
}

// IMPORTANT: createClient() throws synchronously if the URL is empty/invalid.
// Since this module is imported at server startup (not lazily, per-request),
// letting that throw escape used to crash the ENTIRE backend on boot —
// every route, including login/signup, which have nothing to do with these
// "legacy" tables. Guard it so a missing Supabase config only breaks the
// specific features that need it, not the whole app.
export const supabaseAdmin = (supabaseUrl && config.supabase.serviceRoleKey)
  ? createClient(supabaseUrl, config.supabase.serviceRoleKey, { auth: { persistSession: false } })
  : null;
