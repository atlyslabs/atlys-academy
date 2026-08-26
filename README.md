# Atlys — Pre-checkout Sales University

A points-based, interactive **3-day** onboarding university for the Pre-checkout
Sales function: lessons, drag-and-drop drills, voiced chat scenarios, a daily
shadowing report, a per-cohort leaderboard, and a manager dashboard.

Scoped down from five days in Aug 2026 — see the header comment in
`src/content/onboarding/days.ts` for what moved to on-the-job learning. As it
stands: 3 days, 28 lessons, 15 checklist activities, 15 drills, 53 quiz
questions, 28 passport stamps and a voucher at the end.

Before deploying, read [`docs/pre-deploy.md`](docs/pre-deploy.md) — it carries
the launch flags, the required `AUTH_URL`, and what has and has not been
verified.

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
| File the day's ODPAC report | 15 |
| Finish a day (all activities + ODPAC filed + quiz passed) | +25 |

**Three attempts** at each day's quiz and **three plays** at each drill; the
checklist is uncapped, because ticking a box is not an attempt at anything. The
best attempt counts in both cases — a worse replay never lowers a score. 70%
passes. A perfect run across all three days scores **1184**.

Running out is not a dead end. After three attempts the best score stands and
the day opens anyway: gating on a pass would wall a joinee in permanently, with
no way back in. The 70% mark still decides whether the *stamp* is earned, so a
passport shows honestly who cleared the bar — it just never traps anyone. See
`src/lib/progress/attempts.ts`.

## Interactive pieces

- **Lessons** — each "What to learn" topic is an expandable card with teaching
  content, a real example, and "what new joiners get wrong". Every lesson has a
  body: `Lesson.body` is non-nullable, so the old "being written" placeholder
  card is not merely unused but unrepresentable. A topic with nothing to teach
  is not listed rather than shown empty.
- **Pause drill** — a customer message is read aloud (browser speech synthesis,
  no API keys), the composer locks behind a 10-second countdown ring, and the
  Send button stays live on purpose: rushing is supposed to be possible.
- **Dos vs Don'ts** — drag each statement onto a pile (buttons remain for
  keyboard/touch).
- **Tool match** — drag six tools onto the jobs they do.
- **Whose job is it?** — sort nine statements between Atlys, the consulate and
  the guest. Built strictly from the Cluster A scripts.
- **Run the loop** — walk one objection through APAC (acknowledge, probe,
  address, confirm), where the wrong-*step* answer is a good sentence in the
  wrong slot and is marked differently from a wrong one. Replaced the old
  press-and-hold objection library, which was reading rather than a drill.
- **Swipe decks** — one interaction with two configs: what is safe to say
  (Day 1) and whether a DS-160 contradicts itself (Day 3).
- **Mock scenarios** — branching conversations with voiced customer messages,
  and a Day 3 variant for the cases where the playbook is wrong.
- **ODPAC report** — the daily shadowing write-up, five stages, filed once a
  day. It is what a mentor actually reads, and it is what the Slack digest
  carries.
- **The voucher** — issued at the end of the academy once the final day's
  checklist is filed, its ODPAC report is in, and its quiz is settled. Copyable,
  redeemed in a conversation with the team leader. The code is *derived* on the
  server from the joinee's profile id rather than stored, so it is stable
  everywhere, unguessable, and never travels through the progress upload; the
  endpoint re-checks the earning conditions, so a doctored local state gets
  nothing. It reaches the admin desk and the daily Slack report only once
  earned.
- **Mentor panel** — who to follow each day, with a Slack DM deep link where
  there is a person to link to. Day 1 is Komal Rawat plus the joinee's own team
  leader, Day 2 is the team leader, and Day 3 has no panel at all — the stop is
  skipped when a day lists nobody. Cut back from eleven entries in Aug 2026:
  most had no Slack ID and rendered a disabled "ID pending" button, so the panel
  was mostly a list of people a joinee could read about and not reach.

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

`GET /api/onboarding/admin/daily-report` returns one day's report as JSON plus
ready-to-post Slack Block Kit blocks (admin session, or `x-report-token` header
matching `REPORT_TOKEN`). It reports facts — scores, completions, verbatim
writing — not generated summaries. `date` is an **IST** calendar day, defaulting
to today in IST, because an Indian working evening straddles two UTC dates.

The cron that posts it lives in [`worker/`](worker/README.md) — a Cloudflare
scheduled worker that pulls this endpoint and posts the blocks to a Slack
webhook. It fires at **09:00 IST and reports the previous day**, every day but
Monday (the office is Mon–Sat), so Day 1's report is in the channel before Day 2
unlocks at 10:30. It is separate from the app because a request-driven app has no
timer, and because it keeps the Slack credential out of the public web app. The
schedule currently ships disabled — `worker/README.md` has the one-line go-live
step.

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
      page.tsx                            # 3-day journey
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

All 29 lessons now have bodies — the placeholder lessons are gone. Two gaps
remain, both marked `TODO(content)` in the source, and both need access this
project does not have:

- **The rewrite drill's "bad reply"** is written as a foil, not a real
  transcript. Replace it with a sanitised Freshchat example when one can be
  obtained (`src/content/onboarding/drills.ts`).
- **Appointment booking logic** (§2.6) is the last B1/B2 fact the Day 3 quiz
  cannot test (`src/content/onboarding/quiz.ts`).

Six checklist activities are flagged `accessNeeded`, which renders a visible
"access needed" note rather than pretending the resource is there.

## Built since the PRD

The PRD's Phases 4–5 are done: Supabase persistence of progress, quiz attempts,
drill results and written submissions; the per-cohort leaderboard; the admin
desk; and the scheduled Slack digest in `worker/`. See `docs/pre-deploy.md` §0
for what has been verified against the live database.

Auth moved to Google OAuth, so the PRD's email-OTP flow and its `auth_otp`
table are not needed — nor is an email provider.

Still open by design, not oversight: scoring authority stays on the client (the
server stores the state it is handed), and cohorts are "whoever first signed in
that day" rather than a managed unit. Both are written up in
`docs/pre-deploy.md`.
