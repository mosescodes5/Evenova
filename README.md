# Evenova 🎟

> Professional event ticketing & management platform — built for Nigeria, ready for Africa.

---

## What's inside

```
evenova/
├── frontend/                # React 19 + Vite — public site & dashboard
│   ├── src/
│   │   ├── App.jsx          # Root component — all routing & global state
│   │   ├── main.jsx         # React DOM entry point
│   │   ├── styles/
│   │   │   ├── theme.js     # Design tokens (colors, gradients, banners)
│   │   │   └── StyleInjector.jsx  # Injects global CSS at runtime
│   │   ├── utils/
│   │   │   ├── crypto.js    # Ticket signing — djb2, encodeTicket, verifyQR
│   │   │   ├── storage.js   # Persistent key-value store helpers
│   │   │   ├── export.js    # CSV export (attendees, scan logs)
│   │   │   ├── email.js     # Client-side email (Resend / SES / Brevo / mock)
│   │   │   └── payment.js   # Paystack & Flutterwave checkout helpers
│   │   ├── data/
│   │   │   └── seedData.js  # Demo events, organizers, tickets
│   │   ├── hooks/
│   │   │   └── useMedia.js  # Responsive breakpoint hook
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   └── index.jsx  # Btn, Inp, Card, Bdg, StatCard, Toast, Modal, QRDisplay
│   │   │   ├── LoadingScreen.jsx
│   │   │   ├── PublicHeader.jsx
│   │   │   ├── PublicFooter.jsx
│   │   │   └── AppNav.jsx
│   │   └── pages/
│   │       ├── Landing.jsx
│   │       ├── About.jsx
│   │       ├── Contact.jsx
│   │       ├── Explore.jsx
│   │       ├── PublicEventPage.jsx
│   │       ├── Register.jsx
│   │       ├── Login.jsx
│   │       ├── admin/
│   │       │   ├── AdminDash.jsx
│   │       │   ├── AdminRevenue.jsx
│   │       │   ├── AdminScanLogView.jsx
│   │       │   ├── AdminOrgs.jsx
│   │       │   └── EmailBlast.jsx
│   │       └── organizer/
│   │           ├── OrgDashboard.jsx
│   │           ├── CreateEvent.jsx
│   │           ├── EventDetail.jsx
│   │           ├── RevenueDashboard.jsx
│   │           ├── ScanLog.jsx
│   │           ├── TeamManagement.jsx
│   │           ├── Scanner.jsx
│   │           └── LiveDashboard.jsx
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                 # Node.js 18 + Express API
│   ├── src/
│   │   ├── index.js         # Express entry point
│   │   ├── config.js        # All config from environment variables
│   │   ├── routes/
│   │   │   ├── auth.js      # POST /api/auth/login|register|logout
│   │   │   ├── events.js    # CRUD /api/events
│   │   │   ├── tickets.js   # POST /api/tickets/purchase|scan|manual
│   │   │   └── webhooks.js  # POST /api/webhooks/paystack|flutterwave
│   │   ├── services/
│   │   │   ├── emailService.js   # Send transactional emails
│   │   │   └── ticketService.js  # Create & validate signed tickets
│   │   ├── middleware/
│   │   │   ├── auth.js       # requireAuth, requireAdmin, requireOrganizer
│   │   │   └── rateLimiter.js
│   │   └── functions/
│   │       └── emailBlast.js # AWS Lambda handler for bulk email
│   ├── .env.example
│   └── package.json
│
├── shared/                  # Shared between frontend and backend
│   ├── utils/
│   │   └── crypto.js        # Ticket signing algorithm
│   └── types/
│       └── index.js         # JSDoc type definitions
│
├── .gitignore
├── package.json             # Monorepo root with concurrently scripts
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9 (or pnpm / yarn)

### 1. Clone & install

```bash
git clone https://github.com/your-org/evenova.git
cd evenova

# Install all workspaces at once
npm run install:all
```

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Open backend/.env and fill in your values (see sections below)
```

### 3. Start development servers

```bash
# Both frontend (port 5173) and backend (port 4000) together:
npm run dev

# Or individually:
npm run dev:frontend
npm run dev:backend
```

---

## Environment Variables Guide

### Email — choose one provider

| Provider | Required vars | Notes |
|----------|--------------|-------|
| **Resend** (recommended) | `RESEND_API_KEY` | Set `EMAIL_PROVIDER=resend`. Free tier: 100 emails/day |
| **AWS SES** | `SES_ENDPOINT_URL`, `SES_API_KEY` | Requires API Gateway + Lambda (see `backend/src/functions/emailBlast.js`) |
| **Brevo** | `BREVO_API_KEY` | Set `EMAIL_PROVIDER=brevo`. 300 emails/day free |
| **SMTP** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Works with Gmail, Zoho, etc. |
| **Mock** | — | Default. Logs emails to console — great for development |

### Payments

**Paystack** (easiest for Nigeria):
1. Sign up at [paystack.com](https://paystack.com)
2. Copy your Test keys from Settings → API Keys
3. Set `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` in `backend/.env`
4. Set `PAYSTACK_PUBLIC_KEY` in `frontend/.env.local` too (used in `utils/payment.js`)

**Flutterwave** (multi-currency):
1. Sign up at [flutterwave.com](https://flutterwave.com)
2. Get keys from Dashboard → Settings → API
3. Set `FLW_SECRET_KEY`, `FLW_PUBLIC_KEY`, `FLW_SECRET_HASH`

### Ticket Signing Security

The `TICKET_SECRET` in your backend `.env` **must match** the `SECRET` constant in `frontend/src/utils/crypto.js`. In production:
1. Generate a strong random string: `openssl rand -hex 32`
2. Set it as `TICKET_SECRET` in `backend/.env`
3. Replace the hardcoded `"EVENOVA_PRIME_NG_2025"` in `frontend/src/utils/crypto.js` with the same value, or better — load it from a build-time env variable via Vite: `import.meta.env.VITE_TICKET_SECRET`

---

## Database Setup

The backend is wired to **PostgreSQL via Drizzle ORM** — `auth`, `events`, `tickets`, and `scan logs` all read/write to real tables now (no more `// TODO: DB` stubs in those files).

```bash
cd backend
npm install

# 1. Point DATABASE_URL at a real Postgres instance (local, Supabase, Neon, Render, etc.)
cp .env.example .env
# edit .env → DATABASE_URL=postgresql://user:pass@host:5432/evenova

# 2. Generate & apply the schema
npm run db:generate   # writes SQL migration files from src/db/schema.js
npm run db:migrate    # applies them to DATABASE_URL

# 3. Seed the demo accounts from the User Roles table below
npm run db:seed
```

`npm run db:studio` opens Drizzle Studio, a local GUI for browsing/editing rows.

### What changed
- **`auth.js`** — real bcrypt-hashed passwords, looked up from the `users` table. `register` creates a `pending` organizer that needs manual approval before login succeeds (flip `status` to `approved` in `db:studio` or build an admin-approval endpoint).
- **`events.js`** — full CRUD against `events`, `ticket_types`, and `gates`, with ownership checks (an organizer can only edit/cancel their own events; admins can touch any).
- **`ticketService.js`** — `createTicket` now runs inside a DB transaction with a row lock on the ticket type, so concurrent buyers can never oversell a sold-out tier. `validateScan` checks real ticket status (rejects already-used, unpaid, refunded, or void tickets) and writes every attempt — admitted or rejected — to `scan_logs`.
- **`paymentsService.js`** (new) — `tickets.js` now calls Paystack/Flutterwave's verify-transaction API server-side before issuing any paid ticket, and cross-checks the amount paid against the ticket type's price. The client can no longer mint a ticket just by claiming a payment succeeded.
- Free tickets (`priceKobo: 0`) and organizer-issued manual/comp tickets skip payment verification, as before.

If you'd rather use MongoDB or a hosted option instead, the same patterns apply — swap `src/db/index.js` and `src/db/schema.js` for your driver of choice, and the route/service files only need their query calls updated, not their structure.

---


## Deployment

### Frontend — Vercel / Netlify

```bash
cd frontend
npm run build
# Upload dist/ to Vercel, Netlify, or any static host
```

Set these environment variables in your hosting dashboard:
```
VITE_API_URL=https://api.evenova.ng
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
```

### Backend — Vercel (serverless)

The backend is set up to deploy on Vercel as-is:
- `backend/api/index.js` exports the Express app as a serverless function
- `backend/vercel.json` rewrites all requests to that function
- `src/index.js` only calls `app.listen()` when `process.env.VERCEL` is **not** set, so it won't try to bind a port in the serverless environment

```bash
cd backend
vercel        # first deploy, follow prompts (set root directory to backend/)
vercel --prod
```

Set these in the Vercel project's Environment Variables (not in a committed `.env`):
```
DATABASE_URL=<your Supabase pooled connection string — see below>
PGSSL=true
JWT_SECRET=<openssl rand -hex 32>
TICKET_SECRET=<openssl rand -hex 32>
PAYSTACK_SECRET_KEY=...
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

#### Supabase connection string — use the **pooled** one

Vercel serverless functions are short-lived and can spin up many instances at once. If you use Supabase's direct connection (port `5432`), you'll quickly hit Postgres's connection limit and start seeing `too many clients already` errors.

In your Supabase project → **Settings → Database → Connection Pooling**, copy the pooled connection string instead — it uses port `6543` and includes `?pgbouncer=true`:
```
DATABASE_URL=postgresql://postgres.xxxxxxxx:[password]@aws-0-xx-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true
```
`backend/src/db/index.js` already caps the local `pg` pool to a single connection when `VERCEL` is set, which pairs correctly with Supabase's pooler — you don't need to change anything else.

Run migrations once from your local machine (not from Vercel) using the **direct** connection string (port `5432`) so the migration has a stable, non-pooled session:
```bash
DATABASE_URL="postgresql://postgres:[password]@db.xxxxxxxx.supabase.co:5432/postgres" npm run db:migrate
DATABASE_URL="postgresql://postgres:[password]@db.xxxxxxxx.supabase.co:5432/postgres" npm run db:seed
```

### Other backend hosts — Railway / Render / Fly.io

```bash
cd backend
# Set all env vars in your platform dashboard
# Start command: node src/index.js
```

### AWS Lambda (email blast function)

The `backend/src/functions/emailBlast.js` is ready to deploy as a Lambda:
```bash
zip -r function.zip backend/src/functions/emailBlast.js node_modules/aws-sdk
aws lambda update-function-code --function-name evenova-email --zip-file fileb://function.zip
```

---

## User Roles

| Role | Login | Access |
|------|-------|--------|
| **Admin** | `admin@evenova.ng` / `AdminPass#2025` | All organizers, all events, revenue, scan logs, email blasts |
| **Organizer** | `amara@amaraevents.ng` / `Amara@Ev3nt$24` | Own events, team, scanner, revenue |
| **Staff** | `kalu@amaraevents.ng` / `Kalu#Gate01` | Scanner only (can also view Live Dashboard) |

---

## Architecture Notes

- **Ticket signing** uses a DJB2 hash (`eId|tId|uId|SIG_HASH`). Tickets are signed at creation and verified offline at scan time — no network call required for gate validation.
- **Offline scanning** is supported: `Scanner.jsx` validates QR codes locally using `utils/crypto.js`. Staff can cache event data and scan without internet.
- **Email provider** is selected at runtime via `window._evEmailCfg` on the frontend and `config.email.provider` on the backend — no code change needed to switch providers.
- **Payments**: Paystack and Flutterwave SDKs are loaded dynamically (no bundle bloat). Webhook verification is handled in `backend/src/routes/webhooks.js`.

---

## Contributing

1. Fork → create a feature branch → PR
2. Follow the existing code style (no TypeScript, JSDoc for types)
3. Run `npm run lint` before submitting

---

Built with ❤️ in Lagos.
