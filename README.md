# SiteWatch

An uptime, SSL certificate, and domain expiry monitor built for web agencies.

## Tech Stack

- **Framework**: Next.js 15 App Router + TypeScript
- **Styling**: Tailwind CSS v4 (dark theme)
- **Database / Auth**: Supabase
- **Email Alerts**: Resend
- **Domain Check**: RDAP (no external packages)
- **SSL Check**: Node.js built-in `tls` module

---

## Getting Started

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon public key** from Project Settings → API
3. Also copy the **service_role key** (keep this secret!)
4. In the **SQL Editor**, run the contents of `supabase/migration.sql`

### 2. Set up Resend

1. Go to [resend.com](https://resend.com) → API Keys → Create Key
2. Add and verify a sending domain (or use Resend's sandbox for testing)

### 3. Configure environment variables

Copy `.env.local` and fill in your values:

```bash
cp .env.local .env.local.real   # or just edit .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret!) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sending email address |
| `CRON_SECRET` | Random secret to protect the cron endpoint |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL (or `http://localhost:3000`) |

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Triggering checks

The checker runs at `GET /api/cron/check`. Pass the secret via header or query param:

```bash
# Header
curl -H "x-cron-secret: YOUR_SECRET" http://localhost:3000/api/cron/check

# Or query param
curl "http://localhost:3000/api/cron/check?secret=YOUR_SECRET"
```

### Deploying to Vercel

In Vercel → Cron Jobs, add:
```
* * * * *   GET /api/cron/check
```
And set `CRON_SECRET` as an environment variable. Add `x-cron-secret: {{CRON_SECRET}}` as a header.

Or use GitHub Actions / any external cron service to call the endpoint.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── cron/route.ts          # Checker engine (HTTP + SSL + domain)
│   │   └── monitors/
│   │       ├── route.ts           # POST/GET monitors
│   │       └── [id]/route.ts      # PATCH/DELETE monitor
│   ├── dashboard/
│   │   ├── layout.tsx             # Sidebar nav
│   │   ├── page.tsx               # Overview
│   │   └── monitors/
│   │       ├── page.tsx           # Monitor list
│   │       └── [id]/page.tsx      # Monitor detail
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── status/[slug]/page.tsx     # Public status page
├── components/
│   ├── MonitorForm.tsx            # Add/Edit form
│   ├── AddMonitorModal.tsx        # Modal wrapper
│   └── MonitorDetailClient.tsx    # Edit/delete buttons
├── lib/
│   ├── monitoring.ts              # HTTP + SSL checks
│   ├── domain.ts                  # Domain expiry via RDAP
│   ├── alerts.ts                  # Resend email alerts
│   ├── types.ts                   # Shared TypeScript types
│   └── supabase/
│       ├── client.ts              # Browser client
│       ├── server.ts              # Server component client
│       └── middleware.ts          # Session management
└── middleware.ts                  # Auth + redirect rules
supabase/
└── migration.sql                  # Run this in Supabase SQL editor
```

---

## Features

- ✅ Uptime monitoring with configurable intervals
- ✅ SSL certificate expiry alerts (7 and 30 day warnings)
- ✅ Domain expiry via RDAP (no external packages)
- ✅ Incident open/close tracking with downtime duration
- ✅ Email alert deduplication
- ✅ Public status pages at `/status/[slug]`
- ✅ Beautiful dark dashboard UI
- ✅ Supabase Auth (email + password)
- ✅ Row-level security — users only see their own data
