// backend/src/db/index.js
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "./schema.js";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Missing DATABASE_URL — set it in backend/.env. See README → Database Setup."
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Most hosted Postgres providers (Supabase, Neon, Render) require SSL.
  // Disable by setting PGSSL=false in .env for local development.
  ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
  // On Vercel, each invocation can spin up a new serverless function instance,
  // each opening its own connections. Keep the pool tiny (or 1) so you don't
  // exhaust Postgres's connection limit. Supabase's pooled connection string
  // (port 6543, "pgbouncer=true") is built for exactly this — use it instead
  // of the direct connection (port 5432) when deploying to Vercel.
  max: process.env.VERCEL ? 1 : 10,
  idleTimeoutMillis: process.env.VERCEL ? 0 : 30000,
});

export const db = drizzle(pool, { schema });
export { schema };
