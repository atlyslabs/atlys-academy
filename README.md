# Atlys — Pre-checkout Sales University

A points-based, interactive 5-day onboarding university for the Pre-checkout
Sales function: lessons, drag-and-drop drills, voiced chat scenarios, a
per-cohort leaderboard, and a manager dashboard.

**Everything degrades gracefully.** With no env vars at all, the whole
experience runs with browser-local progress. Each capability switches on when
its configuration exists — Google sign-in, Supabase persistence, the admin
dashboard, the scheduled Slack report — with no code changes.

## Points

Points are a **pure function of progress state** (`src/lib/progress/points.ts`)
— no ledger, no stored totals, so no double-award bugs, and the server computes
leaderboard scores with the same function the on-screen tally uses. Weights:

| Action | Points |
|---|---|
| Tick an activity | 5 |
| Read a lesson | 3 |
| Complete a drill | 15 |
| Perfect drill score | +10 |
| Correct quiz answer (best attempt) | 10 |
| Finish a day (all activities + quiz passed) | +25 |

Quiz retries are free and unlimited; the best attempt counts. 70% passes and
unlocks the next day.

## Interactive pieces

- **Lessons** — each "What to learn" topic is an expandable card with teaching
  content, a real example, and "what new joiners get wrong". Topics whose
  content hasn't arrived from the manager yet show an honest placeholder with
  the request reference, never invented filler.
- **Pause drill** — a customer message is read aloud (browser speech synthesis,
  no API keys), the composer locks behind a 10-second countdown ring, and the
  Send button stays live on purpose: rushing is supposed to be possible.
- **Dos vs Don'ts** — drag each statement onto a pile (buttons remain for
  keyboard/touch).
- **Tool match** — drag six tools onto the jobs they do.
- **Whose job is it?** — sort nine statements between Atlys, the consulate and
  the guest. Built strictly from the Cluster A scripts.
- **Objection library** — the scripted lines hide behind press-and-hold
  ("think of your line first").
- **Mock scenarios** — branching conversations with voiced customer messages.
- **Mentor panel** — who to follow each day, with Slack DM deep links once
  member IDs arrive (placeholders until then).

## Leaderboard and cohorts

Everyone whose first sign-in lands on the same date shares a cohort, and the
leaderboard (`/onboarding/leaderboard`) ranks within that cohort only — day-2
joiners are never compared against day-5 ones. Visible to the cohort and the
manager. Requires sign-in + database; shows an honest placeholder otherwise.

## Admin

`/admin` — every joinee's points, days completed, per-quiz best scores,
activity counts and written exercise answers. Access is Google-sign-in only,
restricted to `ADMIN_EMAILS` (default `shovan@atlys.com`); there is
deliberately no password fallback, so it is unreachable until OAuth keys exist.

`GET /api/onboarding/admin/daily-report` returns the end-of-day report as JSON
plus ready-to-post Slack Block Kit blocks (admin session, or `x-report-token`
header matching `REPORT_TOKEN`). It reports facts — scores, completions, verbatim
writing — not generated summaries. `date` is an **IST** calendar day, defaulting
to today in IST, because an Indian working evening straddles two UTC dates.

The cron that posts it lives in [`worker/`](worker/README.md) — a Cloudflare
scheduled worker that pulls this endpoint and posts the blocks to a Slack
webhook. It is separate from the app because a request-driven app has no timer,
and because it keeps the Slack credential out of the public web app.

## Database

Supabase as plain Postgres — the app authenticates with Auth.js, so all access
goes through server routes with the service-role key and RLS locks every table
to it (`supabase/schema.sql`, run once in the SQL editor). When configured and
signed in, the client syncs whole progress states through `PUT/GET
/api/onboarding/progress`; localStorage remains a write-through cache, and
whatever a joinee did before signing in merges up automatically on first load.

## Stack

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict
- Tailwind CSS v4 (CSS-first `@theme`)
- Hono mounted at `/api/onboarding/*` via a catch-all route handler
- Zod for request validation

## Run

```bash
npm install
npm run dev
```

- App: http://localhost:3000
- Health check: http://localhost:3000/api/onboarding/health

No environment variables are needed to run it. Sign-in stays switched off until
Google credentials exist — see below.

## Google sign-in

Auth.js v5 with the Google provider, restricted to `@atlys.com`. Sessions are
signed JWTs in a cookie; there is no session table because there is no database
yet.

**It is off until it is configured.** `isAuthConfigured` in
`src/lib/auth/config.ts` is simply whether `AUTH_GOOGLE_ID` and
`AUTH_GOOGLE_SECRET` are both set. While they are absent the app behaves exactly
as it did before auth existed: no redirect, no sign-in, every route open. Set
them and the gate switches on with no code change.

### What to ask Atlys IT for

Two values from Google Cloud Console → *APIs & Services* → *Credentials* →
*Create credentials* → *OAuth client ID* → *Web application*:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

Whoever creates the client must also register the **Authorised redirect URIs**,
exactly, including scheme:

```
http://localhost:3000/api/auth/callback/google
https://<production-domain>/api/auth/callback/google
```

A missing or mistyped entry here causes `redirect_uri_mismatch`, which is the
single most common failure.

### Then, locally

```bash
cp .env.example .env.local
```

Fill in the two Google values, and generate your own session key — it does not
come from Google, and production's must differ from local's:

```bash
npx auth secret
```

Optional: `AUTH_URL` (required in production so callbacks resolve to the right
host) and `AUTH_ALLOWED_DOMAIN` (defaults to `atlys.com`; point it at a test
Workspace to try the flow before Atlys credentials arrive).

### How the restriction works

The `hd` parameter sent to Google only biases the account chooser — it travels
in a URL and can be removed. The check that counts is `isAllowedEmail`, which
requires a verified email on the configured domain and runs in the `signIn`
callback. A personal Gmail is rejected there and lands back on `/signin` with an
explanation.

Two layers enforce the gate: `src/middleware.ts` redirects early and cheaply,
and `app/onboarding/layout.tsx` re-checks on the server every render. The layout
is the authoritative one.

**Signing in does not yet move progress off `localStorage`.** Auth identifies
the joinee; it does not persist anything about them. That is still phase 4.

```bash
npm run typecheck
```

```bash
npm run lint
```

## How it fits together

**Content** is typed data in `src/content/onboarding/`, transcribed from
`docs/source-journey.md`. Editing training material is a PR, never a migration.
Every string on screen should be traceable back to a line in the source doc.

**Answers never reach the browser.** `quiz.ts` holds questions and options and
is imported by client components. `answers.ts` holds the correct options and
explanations, imports `"server-only"`, and is reachable only from the Hono
grading route. Grading happens at `POST /api/onboarding/quiz/:slug/submit`; the
response is the first place a correct answer is disclosed.

**Progress** is behind the `ProgressStore` interface in
`src/lib/progress/types.ts`. Phase 2 ships `local-store.ts` (localStorage).
Phase 4 swaps in an RPC-backed implementation and nothing above that interface
changes. State shapes already mirror the Phase 4 tables in PRD §13.

**Day gating.** Day 1 is always open; Day N opens once Day N−1's quiz is passed
at 70%. That is the only gate — see `isDayUnlocked` in
`src/lib/progress/selectors.ts`.

## Structure

```
docs/
  source-journey.md                       # verbatim Day 1–5 doc (source of truth)
src/
  app/
    page.tsx                              # landing
    error.tsx  not-found.tsx              # beige error states, never a blank page
    onboarding/
      layout.tsx                          # ProgressProvider for journey + quizzes
      page.tsx                            # 5-day journey
      quiz/[slug]/page.tsx                # quiz runner (prerendered per day)
    api/onboarding/[[...route]]/route.ts  # Hono catch-all
  content/onboarding/
    types.ts days.ts drills.ts quiz.ts    # client-safe content
    answers.ts                            # "server-only" — correct answers
    tools.ts                              # Day 1 access checklist
  server/onboarding/
    app.ts                                # Hono instance + exported RPC type
    grade.ts                              # server-side grading
  lib/
    progress/                             # store interface, reducer, selectors, provider
    shuffle.ts                            # seeded, hydration-safe
    api-client.ts  utils.ts
  components/
    onboarding/                           # DayRail, DayPanel, Checklist + 5 drills
    quiz/                                 # QuizRunner, ResultsSummary
    ui/                                   # Button, Card, Badge, Eyebrow
```

## Deviations from the PRD

Both are deliberate; neither changes the spec's intent.

1. **No `framer-motion`.** The entire motion vocabulary is a fade plus an 8px
   rise, which is a CSS keyframe (`.animate-rise-in` in `globals.css`). Doing it
   in CSS means `prefers-reduced-motion` is honoured with no JavaScript and one
   fewer dependency.
2. **`@theme` rather than `@theme inline`.** Plain `@theme` emits the custom
   properties onto `:root` *and* generates utilities, so `bg-surface` and
   `var(--color-surface)` both work. Token values are exactly as specified in
   PRD §11.

## Known content gaps

Marked `TODO(content)` in the source. Each needs access this project does not
have yet:

- **Day 3** names its visa topics but contains no visa facts (DS-160 specifics,
  document lists, booking logic). Its quiz tests process framing only and should
  be rewritten once the US Visa process doc is available.
- **Day 1 and Day 4** quizzes are thin for the same reason — the source doc is
  mostly activity lists there.
- **The rewrite drill's "bad reply"** is written as a foil, not a real
  transcript. Replace it with a sanitised Freshchat/Lime Chat example when one
  can be obtained.

## Not built yet (Phases 4–5)

The database, persistence of attempts and exercise submissions, and the
mentor-facing query path. See `PRD.md` §17 and §19.

Auth has moved to Google OAuth, so the PRD's email-OTP flow and its
`auth_otp` table are no longer needed — nor is an email provider. What remains
open is where joinee data lives once it needs to outlive a browser profile.
