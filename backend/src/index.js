import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";

// Route modules
import authRoutes    from "./routes/auth.js";
import eventRoutes   from "./routes/events.js";
import ticketRoutes  from "./routes/tickets.js";
import webhookRoutes from "./routes/webhooks.js";
import emailRoutes     from "./routes/email.js";
import qrRoutes        from "./routes/qr.js";
import discountCodesRoutes from "./routes/discountCodes.js";
import waitlistRoutes  from "./routes/waitlist.js";
import weddingGuestsRoutes from "./routes/weddingGuests.js";
import whatsappRoutes  from "./routes/whatsapp.js";
import adminRoutes     from "./routes/admin.js";
import paymentsRoutes  from "./routes/payments.js";
import walletRoutes    from "./routes/wallet.js";
import teamRoutes        from "./routes/team.js";
import eventsFlatRoutes  from "./routes/eventsFlat.js";
import scanLogsFlatRoutes  from "./routes/scanLogsFlat.js";
import emailBlastsFlatRoutes from "./routes/emailBlastsFlat.js";
import orgProfileRoutes  from "./routes/orgProfile.js";

const app = express();

// ── Security & Logging ──────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Vercel health checks)
    if (!origin) return cb(null, true);
    const allowed = config.cors.origins;
    const isVercelPreview = /^https:\/\/evenova-[a-z0-9-]+\.vercel\.app$/.test(origin);
    if (allowed.includes(origin) || allowed.includes("*") || isVercelPreview) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
// Handle preflight for all routes
app.options("*", cors());
app.use(morgan(config.isDev ? "dev" : "combined"));

// ── Body Parsing ────────────────────────────────────────────
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: config.env, ts: new Date().toISOString() });
});

// ── API Routes ──────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/events",   eventRoutes);
app.use("/api/tickets",  ticketRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/email",     emailRoutes);
app.use("/api/qr",        qrRoutes);
app.use("/api/discount-codes", discountCodesRoutes);
app.use("/api/waitlist",  waitlistRoutes);
app.use("/api/wedding-guests", weddingGuestsRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/wallet",   walletRoutes);
app.use("/api/team",         teamRoutes);
app.use("/api/events-flat",  eventsFlatRoutes);
app.use("/api/scan-logs",    scanLogsFlatRoutes);
app.use("/api/email-blasts", emailBlastsFlatRoutes);
app.use("/api/org-profile",  orgProfileRoutes);

// ── 404 ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ── Error Handler ───────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);

  // Postgres 42P01 = "relation does not exist" — almost always means a
  // migration hasn't been run against DATABASE_URL yet (see README →
  // Database Setup). Surface this clearly instead of a generic 500 so it's
  // obvious this is an ops/deploy step, not a code bug.
  if (err.code === "42P01") {
    return res.status(503).json({
      error: "The database isn't fully set up yet — a required table is missing. Run `npm run db:migrate` against your DATABASE_URL, then try again.",
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: config.isDev ? err.message : "Internal Server Error",
    // PostgREST errors (from the legacy Supabase client) carry extra
    // detail in .code/.details/.hint beyond .message — surface them in
    // dev so misconfigurations (wrong SUPABASE_URL, bad table/column
    // names, etc.) are diagnosable instead of just a bare message.
    ...(config.isDev && err.hint && { hint: err.hint }),
    ...(config.isDev && err.details && { details: err.details }),
    ...(config.isDev && err.code && { code: err.code }),
    ...(config.isDev && { stack: err.stack }),
  });
});

// ── Start ────────────────────────────────────────────────────
// On Vercel, the platform calls the exported `app` directly as a request
// handler per-invocation — it must NOT bind to a port itself.
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`\n🚀 Evenova API running on http://localhost:${config.port}`);
    console.log(`   ENV: ${config.env}  |  Email: ${config.email.provider}`);
  });
}

export default app;