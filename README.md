# Double Cup Live Dashboard

Production-ready Next.js dashboard that simulates and tracks a coffee shop's day-to-day operations with persistent, auto-updating financial metrics.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Recharts
- Persistence:
  - **Production**: Vercel Postgres (`POSTGRES_URL` / `DATABASE_URL`)
  - **Local fallback**: SQLite (`data/dashboard.db` via `better-sqlite3`)
- Scheduled simulation ticks via Vercel Cron every 15 minutes (`/api/tick`)

## Features
- Business-day rollup anchored to **America/Chicago** with **4:00 AM reset**
- Live KPIs:
  - Drinks sold + drink mix
  - Revenue, COGS, fees, fixed costs
  - Employee pay (wages + tips)
  - Net profit
  - Capital recovery and remaining capital
  - Break-even ETA (`~X days` + date)
- Scenario selector: Conservative / Base / Base+ / Optimistic
- Owner salary include/exclude toggle
- Trend chart for today's transactions, revenue, and profit
- Fully persistent state across redeploys/restarts

## Local development
```bash
npm install
npm run dev
```

No manual DB setup is required. On first request the app auto-creates tables and seeds defaults.

Optional explicit seed:
```bash
npm run seed
```

## Environment variables
### Local (SQLite fallback)
No env vars required.

### Production (Vercel Postgres)
Set one of:
- `POSTGRES_URL`
- `DATABASE_URL`

If it starts with `postgres`, the app uses Postgres.

## Deploy to Vercel
1. Push this repository to GitHub.
2. In Vercel, **Import Project** from GitHub.
3. Add environment variable (`POSTGRES_URL` or `DATABASE_URL`) pointing to Vercel Postgres.
4. Deploy.
5. Verify cron exists from `vercel.json`:
   - `*/15 * * * *` -> `/api/tick`
6. Verify live updates:
   - `GET /api/metrics`
   - `POST /api/tick`

## API
### `GET /api/metrics`
Returns dashboard payload for today + all-time + break-even + series.

### `POST /api/tick`
Cron-safe, idempotent tick endpoint:
- skips if a tick has run in the last 14 minutes
- handles day creation/rollover
- stores event + updates rollups

### `POST /api/settings`
Updates scenario and include-owner-salary toggle.

## Assumptions
All business assumptions are centralized in:
- `src/lib/config.ts`

This includes pricing, mix model, wages, tips, fixed costs, initial capital, day reset, and scenario multipliers.

