# Implementation Plan — Personal Time Tracker

## Design decisions

- **Next.js 14 App Router** with TypeScript throughout. All server logic lives in route handlers; no server actions needed for this scope.
- **Drizzle ORM + @neondatabase/serverless (neon-http)** for edge-compatible DB access. `lib/db.ts` calls `neon(process.env.DATABASE_URL!)` and wraps it with `drizzle()`.
- **jose** for JWT-based session cookie (`tt_session`). Middleware verifies the JWT on every request. Auth helpers live in `lib/auth.ts`.
- **date-fns** for all duration math and formatting. No manual arithmetic.
- **Vitest** for unit tests. Pure functions in `lib/timeUtils.ts` and `lib/summary.ts` are tested independently of Next.js.
- **Tailwind CSS v3** with `darkMode: 'media'` so dark mode works via `prefers-color-scheme` without a toggle.
- PWA manifest is served as a static file at `public/manifest.json`. Placeholder icons are minimal valid PNGs.
- Rate limiting for failed logins uses an in-memory `Map` keyed by IP — acceptable for single-user app; resets on server restart.

---

## Step-by-step plan

- [ ] 1. Replace `package.json` and install dependencies.
      Overwrite `package.json` with the spec-provided content (Next.js 14, Drizzle, jose, zod, date-fns, Vitest, Tailwind, etc.). Keep `@neon/config` in devDependencies as it is already installed.
      Files: `package.json`
      Verify: `npm install` exits 0 and `node_modules/next` exists.

- [ ] 2. Append `.gitignore` entries.
      Append the specified block (node_modules, .next, .env/.env.*, !.env.example, dist, coverage, OS files) to the existing `.gitignore`. Do NOT replace — the existing `.neon` and `.env.local` lines must stay.
      Files: `.gitignore`
      Verify: Manual inspection confirms original lines are still present and new lines were added.

- [ ] 3. Create TypeScript and Next.js config files.
      Create `tsconfig.json` (standard Next.js 14 tsconfig with `"paths": { "@/*": ["./*"] }`), `next.config.ts` (minimal, no special config needed), `postcss.config.mjs` (tailwindcss + autoprefixer), and `tailwind.config.ts` (content paths covering `app/**`, `components/**`, darkMode: 'media').
      Files: `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`
      Verify: `npx tsc --noEmit` exits 0 after later steps add source files.

- [ ] 4. Create Drizzle config and database schema.
      Create `drizzle.config.ts` pointing at `lib/schema.ts` with dialect `postgresql` and reading `DATABASE_URL` from `process.env`. Create `lib/schema.ts` defining the `entries` table: `id` (uuid, pk, default gen_random_uuid()), `start` (timestamptz, not null), `end` (timestamptz, nullable), `task` (text, not null, default ''), `created_at` (timestamptz, not null, default now()). Create `lib/db.ts` importing `neon` from `@neondatabase/serverless` and `drizzle` from `drizzle-orm/neon-http`, exporting a `db` singleton.
      Files: `drizzle.config.ts`, `lib/schema.ts`, `lib/db.ts`
      Verify: `npm run db:push` creates the `entries` table in Neon (requires live DATABASE_URL in `.env.local`). TypeScript check passes.

- [ ] 5. Create auth helpers (`lib/auth.ts`).
      Export `signSession()` — signs a JWT with `SESSION_SECRET` using `jose` `SignJWT`, sets `exp` to 24h, returns the token string. Export `verifySession(token)` — verifies with `jose` `jwtVerify`, returns the payload or throws. Export `AUTH_COOKIE_NAME = 'tt_session'`. These functions are pure and have no Next.js imports so they work in middleware and route handlers alike.
      Files: `lib/auth.ts`
      Verify: TypeScript compiles without errors; function signatures match what middleware and login route will import.

- [ ] 6. Create `lib/timeUtils.ts` with pure time helper functions.
      Export:
      - `formatDuration(ms: number): string` — converts milliseconds to "Xh Ym" (omits hours if 0, omits minutes if 0, shows "0m" for zero).
      - `calcWeekTotal(entries: Entry[], weekStart: Date, weekEnd: Date): number` — sums `(end - start)` in ms for all completed entries whose start falls within the week window.
      - `getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date }` — Monday 00:00:00 to Sunday 23:59:59 in local time, using `date-fns` `startOfWeek`/`endOfWeek` with `{ weekStartsOn: 1 }`.
      - `getTodayBounds(): { start: Date; end: Date }` — start and end of today in local time via `date-fns` `startOfDay`/`endOfDay`.
      Import only from `date-fns`. No Next.js or React imports.
      Files: `lib/timeUtils.ts`
      Verify: `npm test` — unit tests from step 16 pass (write tests first or together).

- [ ] 7. Create `lib/summary.ts` with block-merging and summary generation.
      Export:
      - `mergeConsecutiveBlocks(entries: Entry[]): Entry[]` — sorts entries by start, then merges adjacent entries that have identical `task` strings into one block spanning the earliest start to the latest end. Does not merge across gaps; does not merge entries with null end.
      - `generateSummary(entries: Entry[], weekTotalMs: number): string` — formats the timesheet text using the exact template:
        ```
        Timesheet - {Day, DD Mon}
        
        {h:mm AM} - {h:mm AM}: {task}
        
        Total today: {Xh Ym} | This week: {Xh Ym} / 40h
        ```
        Uses `date-fns` `format` for time formatting. Calls `mergeConsecutiveBlocks` internally. Skips running entries (null end). The date header derives from the first entry's start date (or today if no entries).
      Files: `lib/summary.ts`
      Verify: `npm test` — unit tests from step 16 pass.

- [ ] 8. Create Vitest config and unit tests.
      Create `vitest.config.ts` (environment: 'node', include: `__tests__/**`). Create `__tests__/timeUtils.test.ts` covering: `formatDuration` edge cases (0ms → "0m", 3600000 → "1h", 5400000 → "1h 30m", 1800000 → "30m"), `calcWeekTotal` (entries inside/outside range, running entries excluded), `getWeekBounds` (Monday start confirmed). Create `__tests__/summary.test.ts` covering: `mergeConsecutiveBlocks` (same task merges, different tasks stay separate, running entries untouched), `generateSummary` (correct header, correct line format, correct totals, empty entries case).
      Files: `vitest.config.ts`, `__tests__/timeUtils.test.ts`, `__tests__/summary.test.ts`
      Verify: `npm test` exits 0 with all tests passing.

- [ ] 9. Create `middleware.ts`.
      Import `NextResponse`, `NextRequest` from `next/server` and `jwtVerify` from `jose`. Read the cookie named `tt_session`. If missing or verification fails, redirect to `/login`. Allow through: paths starting with `/login`, `/api/logout`, `/_next/`, `/icons/`, `/manifest.json`, `/favicon.ico`. Export a `config` with `matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']`. Use `new TextEncoder().encode(process.env.SESSION_SECRET)` as the JWT secret.
      Files: `middleware.ts`
      Verify: `npx tsc --noEmit` passes.

- [ ] 10. Create API route: `app/api/logout/route.ts`.
      POST handler: deletes the `tt_session` cookie by setting it with `maxAge: 0`, returns `{ ok: true }`. No auth check needed (clearing a cookie is always safe).
      Files: `app/api/logout/route.ts`
      Verify: `npx tsc --noEmit` passes.

- [ ] 11. Create login page and its API route.
      Create `app/login/page.tsx` — client component with a password input form that POSTs to `/api/login`. Shows error message on failure. Styled with Tailwind, centered card, dark mode.
      Create `app/api/login/route.ts` — POST handler: reads `{ password }` from JSON body, validates with zod. Implements rate limiting: in-module `Map<string, { count: number; resetAt: number }>` keyed by `request.ip ?? 'unknown'`; if `count >= 5` within 15-minute window, return 429. On wrong password, add 500ms delay (`await new Promise(r => setTimeout(r, 500))`), increment counter, return 401. On correct password (compare with `process.env.APP_PASSWORD`), call `signSession()`, set `tt_session` cookie (httpOnly, secure, sameSite: 'strict', maxAge: 86400), return 200.
      Files: `app/login/page.tsx`, `app/api/login/route.ts`
      Verify: `npx tsc --noEmit` passes.

- [ ] 12. Create all clock and entries API routes.
      All routes import `db` from `lib/db.ts` and `entries` from `lib/schema.ts`. All use zod for body validation. All return JSON.

      **`app/api/clock-in/route.ts`** (POST): validates `{ task?: string }`. Checks no running entry exists (`where end IS NULL`). Inserts `{ start: new Date(), task: body.task ?? '' }`. Returns the new entry.

      **`app/api/switch/route.ts`** (POST): validates `{ task: string }`. Finds running entry; if none, returns 400. Updates running entry `end = now()`. Inserts new entry with `start = new Date(), task`. Returns both entries.

      **`app/api/clock-out/route.ts`** (POST): finds running entry; if none, returns 400. Updates `end = new Date()`. Returns updated entry.

      **`app/api/entries/route.ts`**:
      - GET: reads `?from=ISO&to=ISO` query params (zod-validate as ISO strings). Returns all entries where `start >= from AND start <= to`, ordered by `start ASC`.
      - POST: validates `{ start: string, end: string, task: string }`. Parses to Date. Validates `end > start`. Checks no overlapping entry in DB. Inserts and returns new entry.
      - PATCH: validates `{ id: string, start?: string, end?: string, task?: string }`. Fetches existing entry. Applies updates. Validates `end > start` and no overlap (excluding this entry's id). Updates and returns.
      - DELETE: validates `{ id: string }`. Deletes entry by id. Returns `{ ok: true }`.

      Overlap check query: `WHERE id != excludeId AND NOT (end <= newStart OR start >= newEnd)` — for POST use a fixed excludeId of `''` (won't match any uuid).
      Files: `app/api/clock-in/route.ts`, `app/api/switch/route.ts`, `app/api/clock-out/route.ts`, `app/api/entries/route.ts`
      Verify: `npx tsc --noEmit` passes.

- [ ] 13. Create UI components.
      All components are in `components/`. Client components (those using hooks or browser APIs) have `'use client'` at top.

      **`components/ProgressBar.tsx`** (client): accepts `value: number` (0–100), renders a styled div with inner div width set to `${value}%`. Tailwind: `bg-blue-500 h-2 rounded-full transition-all`.

      **`components/RunningTimer.tsx`** (client): accepts `startISO: string`. Uses `useEffect` + `setInterval(1000)` to set state to `Date.now() - new Date(startISO).getTime()`. Calls `formatDuration` from `lib/timeUtils.ts`. Cleans up interval on unmount.

      **`components/ClockControls.tsx`** (client): accepts `runningEntry: Entry | null`, `onAction: () => void`. Shows three buttons: "Clock In" (disabled if running), "Switch Task" (disabled if not running, prompts for new task), "Clock Out" (disabled if not running). POSTs to appropriate API routes. Calls `onAction()` after success to trigger refetch. Large buttons, full-width on mobile.

      **`components/TodayView.tsx`** (client): accepts `entries: Entry[]`. Filters to today's entries using `getTodayBounds()`. Displays each as a row: formatted start–end time, task, duration. Shows total at bottom. Running entries show "—" for end time and display `RunningTimer`.

      **`components/WeekView.tsx`** (client): accepts `entries: Entry[]`. Uses `calcWeekTotal` and `getWeekBounds`. Shows total hours, hours remaining, progress bar via `ProgressBar`. 40h = 144000000ms target.

      **`components/EntryForm.tsx`** (client): modal/inline form for manual add and edit. Accepts `entry?: Entry` (edit mode if present), `onSave: () => void`, `onCancel: () => void`. Controlled inputs for start (datetime-local), end (datetime-local), task. POSTs to `/api/entries` or PATCHes. Shows validation errors inline.

      **`components/SummaryPanel.tsx`** (client): accepts `entries: Entry[]`, `weekTotalMs: number`. Button "Generate End-of-Day Summary" that calls `generateSummary` and sets local state. Shows result in a `<textarea readOnly>`. "Copy" button calls `navigator.clipboard.writeText(text)`.

      Files: `components/ProgressBar.tsx`, `components/RunningTimer.tsx`, `components/ClockControls.tsx`, `components/TodayView.tsx`, `components/WeekView.tsx`, `components/EntryForm.tsx`, `components/SummaryPanel.tsx`
      Verify: `npx tsc --noEmit` passes after the app shell (step 14) imports them.

- [ ] 14. Create the root app shell.
      **`app/layout.tsx`**: imports Tailwind global CSS (create `app/globals.css` with `@tailwind base/components/utilities`), sets `<html lang="en">`, adds `<link rel="manifest" href="/manifest.json">` and `<meta name="theme-color">` in `<head>`. Dark mode via `class` strategy alternatively keep as `media` — use Tailwind's built-in `prefers-color-scheme` so no JS toggle is needed.

      **`app/page.tsx`** (client component `'use client'`): main dashboard. State: `entries: Entry[]`, loading flag. On mount and on `visibilitychange` (document.addEventListener), fetches `/api/entries?from=weekStart&to=weekEnd`. Derives `runningEntry` as the entry with `end === null`. Renders: `ClockControls`, `RunningTimer` (if running), `TodayView`, `WeekView`, `SummaryPanel`, "Add Entry" button that opens `EntryForm`. Logout button in header that POSTs to `/api/logout` then redirects to `/login`.

      Files: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
      Verify: `npm run build` exits 0 (no type errors, no missing imports).

- [ ] 15. Add PWA assets and manifest.
      Create `public/manifest.json` with `name: "Time Tracker"`, `short_name: "TimeTrack"`, `theme_color: "#1d4ed8"`, `background_color: "#0f172a"`, `display: "standalone"`, `start_url: "/"`, icons array pointing to `/icons/192.png` (192×192) and `/icons/512.png` (512×512).
      Create `public/icons/192.png` and `public/icons/512.png` as minimal valid PNG files (solid blue square placeholder — use a small base64-encoded PNG, not a real image tool).
      Files: `public/manifest.json`, `public/icons/192.png`, `public/icons/512.png`
      Verify: `npm run build` exits 0. Lighthouse PWA check recognizes the manifest (manual).

- [ ] 16. Create `.env.example` and `README.md`.
      **`.env.example`**:
      ```
      DATABASE_URL=postgres://...
      APP_PASSWORD=your-password-here
      SESSION_SECRET=a-long-random-secret-string
      ```
      **`README.md`**: sections for Prerequisites, Local Setup (clone, `npm install`, copy `.env.example` to `.env.local`, fill vars, `npm run db:push`, `npm run dev`), Running Tests (`npm test`), and Vercel Deploy (add DATABASE_URL, APP_PASSWORD, SESSION_SECRET as environment variables in Vercel dashboard).
      Files: `.env.example`, `README.md`
      Verify: Files exist and contain correct content.

- [ ] 17. Final build and test verification.
      Run `npm test` — all Vitest unit tests pass. Run `npm run build` — Next.js build succeeds with no TypeScript errors. Confirm `npm run db:push` completes without error (creates `entries` table).
      Files: (none new)
      Verify: `npm test` exits 0; `npm run build` exits 0.

---

## File creation order (dependency-sorted)

1. `package.json` → install deps
2. `.gitignore` (append)
3. `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`
4. `drizzle.config.ts`, `lib/schema.ts`, `lib/db.ts`
5. `lib/auth.ts`
6. `lib/timeUtils.ts`
7. `lib/summary.ts`
8. `vitest.config.ts`, `__tests__/timeUtils.test.ts`, `__tests__/summary.test.ts`
9. `middleware.ts`
10. `app/api/logout/route.ts`
11. `app/login/page.tsx`, `app/api/login/route.ts`
12. `app/api/clock-in/route.ts`, `app/api/switch/route.ts`, `app/api/clock-out/route.ts`, `app/api/entries/route.ts`
13. `components/` (all seven)
14. `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
15. `public/manifest.json`, `public/icons/192.png`, `public/icons/512.png`
16. `.env.example`, `README.md`

## Key decisions

- **`app/page.tsx` is a client component** — the dashboard needs browser APIs (`visibilitychange`, `navigator.clipboard`, `setInterval`). All data fetching is done with `fetch()` in the client. No server components in the main dashboard to keep the architecture simple for a single-user app.
- **No server actions** — plain API route handlers keep the client/server boundary explicit and make the API testable independently.
- **`darkMode: 'media'`** in Tailwind config — no theme toggle JavaScript, just respects OS preference, which is appropriate for a personal tool.
- **Overlap validation is server-side only** — simplifies the client and ensures integrity regardless of how the API is called.
- **Rate limiter is in-module memory** — a simple `Map` is sufficient for a single-user app where the server rarely restarts. No Redis needed.
- **Icons are base64-encoded placeholder PNGs** written directly — avoids any image generation tooling dependency.
