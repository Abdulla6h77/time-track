# Time Tracker

A single-user personal time tracker web app built with Next.js, Drizzle ORM, and Neon Postgres. Tracks work hours against a 40h/week target and generates daily timesheet summaries.

## Prerequisites

- Node.js 18+
- A Neon Postgres database (with `DATABASE_URL`)

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `.env.local`:
   ```
   DATABASE_URL=postgres://...       # Neon connection string
   APP_PASSWORD=your-password-here   # Password to protect the app
   SESSION_SECRET=a-long-random-32-char-string  # JWT signing secret
   ```

3. **Create database tables**
   ```bash
   npm run db:push
   ```

4. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Running Tests

```bash
npm test
```

Tests cover: `formatDuration`, `calcWeekTotal`, `mergeConsecutiveBlocks`, `getWeekBounds`, and `generateSummary`.

## Vercel Deploy

1. Push your code to GitHub.
2. Import the repo in Vercel.
3. Add these environment variables in the Vercel dashboard:
   - `DATABASE_URL` — your Neon connection string
   - `APP_PASSWORD` — password to protect the app
   - `SESSION_SECRET` — a long random string (32+ chars)
4. Before the first deploy (or after schema changes), run:
   ```bash
   DATABASE_URL=<production-url> npm run db:push
   ```
5. Deploy.

## PWA Install

On mobile (Chrome/Safari): open the app, then use your browser's "Add to Home Screen" option. The app supports offline display thanks to the web manifest.

## Features

- **Clock In / Switch Task / Clock Out** — large buttons at the top
- **Live running timer** — stays accurate after tab closes/reopens
- **Today view** — list of today's blocks with durations and totals
- **Week view** — progress toward 40h goal with a progress bar
- **Manual entries** — add, edit, and delete entries (handles forgotten clock-outs)
- **End-of-day summary** — generates a formatted timesheet, one-click copy
- **Office Days Checklist** — Mon to Sun attendance checkboxes with week navigation, auto-checks on clock in, with manual toggle support
- **Off & Leave Tracker** — log paid and unpaid leaves, tracks leave history, and calculates remaining paid leave quota in real time
- **Dark mode** — automatic via `prefers-color-scheme`
- **Password protection** — single-user auth with rate limiting
