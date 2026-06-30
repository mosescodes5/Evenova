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
import whatsappRoutes  from "./routes/whatsapp.js";

const app = express();

// ── Security & Logging ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));
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
app.use("/api/whatsapp", whatsappRoutes);

// ── 404 ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ── Error Handler ───────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: config.isDev ? err.message : "Internal Server Error",
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