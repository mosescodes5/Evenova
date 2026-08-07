// backend/src/middleware/requireSupabase.js
// Every "legacy flat" route (events, org profile, scan logs, email blasts,
// team) reads/writes through supabaseAdmin, which is null when
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't set (see db/supabase.js).
// Without this guard, the first `supabaseAdmin.from(...)` call throws a
// bare "Cannot read properties of null (reading 'from')" straight to the
// end user. Catch it here instead with a message that says what to fix.
import { supabaseAdmin } from "../db/supabase.js";

export function requireSupabase(_req, res, next) {
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: "Server isn't configured to save this yet — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are missing on the backend. Set them and redeploy.",
    });
  }
  next();
}
