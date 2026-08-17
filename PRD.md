# PRD — Atlys Pre-checkout Onboarding App

## 1. Context

Atlys is hiring for Pre-checkout Sales (inbound chat and calls with prospective visa customers, before purchase). Today, new joinees are trained through a Notion doc, shadowed chats, and 1:1s. The doc exists; the interactive layer does not. This project turns the existing Day 1–5 onboarding journey into a self-service web app that a new joinee can complete on their own, with the mentor (Shovan) as a reviewer of free-text exercises and a check-in at Day 5.

This is a **new, standalone project** — its own repo, its own deployment, its own auth. It is not merged into the live Atlys web app.

## 2. Users

**Primary:** New Pre-checkout Sales joinees on Day 1. Non-technical. Reading on laptop; some phone use for Day 4/5 practice.

**Secondary:** Mentors (Shovan, Santosh) reviewing free-text submissions. (Admin UI is *out of scope for v1* — the data model must support it, but no UI ships.)

## 3. Goals

1. A new joinee can complete Days 1–5 in the app, in order, without a mentor holding their hand for content delivery.
2. Every activity in the source doc is either (a) a checklist item they mark done or (b) an interactive drill they complete inline.
3. Comprehension is proven by per-day quizzes with server-side grading — the joinee cannot self-mark.
4. The single most-taught behaviour in the doc — the "Shut up for 10 seconds" pause — is drilled as a *behaviour*, not read as a fact.
5. Progress and quiz scores persist per user so a joinee can resume across sessions and mentors can see cohort status later.

## 4. Non-goals

- Live chat with mentors inside the app. (Mentors are on WhatsApp/Slack.)
- Video content authoring. (If videos are added later, they're embedded; no player build.)
- Mobile app.
- Public marketing surface. This is an internal tool behind an email allowlist.
- Admin/cohort UI in v1.
- Integration with Freshchat, Grafana, Exotel, Retool, Lime Chat. The doc *mentions* those tools; the app only *lists* them under Day 1 setup — it does not connect to them.

## 5. Source content

The full Day 1–5 journey has been provided by the hiring manager and lives, verbatim in structure, at `docs/source-journey.md`. Days, objectives, "What to learn", responsibilities, activities, dos/don'ts, mock scenarios, and the tools checklist all come from that doc. **Do not paraphrase or invent training content.** Copy edits are fine; substantive changes require the hiring manager.

## 6. Scope — pages

Two joinee-facing pages plus auth screens.

| Route | Purpose |
|---|---|
| `/` | Landing. One-sentence pitch, "Sign in with your Atlys email" CTA. |
| `/auth/signin` | Email input → allowlist check → OTP dispatched. |
| `/auth/verify` | 6-digit OTP entry → session cookie set → redirect to `/onboarding`. |
| `/onboarding` | The 5-day journey. Sticky day rail on the left, one panel per day on the right. Checklists, drills, dos/don'ts sorter, rewrite exercise, mock scenario branching. Day N unlocks when Day N-1's quiz is passed. |
| `/onboarding/quiz/[slug]` | Quiz runner. One question per screen or all-on-one-page (see §8). Submit → server grades → results screen with per-question explanation. |
| `/api/onboarding/*` | Hono catch-all handling all backend endpoints. |

Server Components render everything static; only the interactive islands are `"use client"`.

## 7. Interactive drills (the five things that make this app worth building)

Each maps to something the source doc explicitly teaches.

### 7.1 Day activity checklists
Every numbered activity in the doc becomes a checkbox with a stable `item_key` (e.g. `day1.shadow_chats`, `day3.ds160_read`). Persisted per user. No day auto-completes — the quiz gates progression.

### 7.2 "Shut up for 10 seconds" drill (Day 2)
The centrepiece. Simulated chat:
- Customer: *"Is approval guaranteed?"*
- The reply textbox is disabled for 10 seconds with a visible countdown.
- If the joinee waits, a second customer message appears: *"I was rejected once before and don't want to lose money again."* Now they compose a reply that addresses the *real* fear, and the app shows the "better" template answer alongside theirs.
- If the joinee clicks Send before the countdown ends, the app blocks it and shows: "You just answered the question. You would have missed the fear. Wait for it."
- One retry allowed. Result stored as `passed | rushed`.

This is a *behaviour drill*, not a knowledge check. It is the highest-value interaction in the app.

### 7.3 Dos vs Don'ts sorter (Day 2)
Ten statements from the doc's Dos/Don'ts list, shuffled. Click-to-sort into ✅/❌ columns. Instant feedback per click. Score persisted.

Click-based rather than drag — works on mobile and is keyboard-accessible without extra work.

### 7.4 Rewrite-a-bad-chat (Day 2)
Show a poor agent reply. Textarea for the rewrite. Submit reveals a model answer side-by-side and a "what changed and why" annotation. Not auto-graded. Stored to `exercise_submission` for mentor review.

### 7.5 Mock scenario branching (Day 5)
Four scenarios from the doc: price objection, timeline anxiety, visa rejection fear, competitor comparison. For each: 2–3 possible replies. Pick one → get in-character customer response + feedback ("this closes the objection" / "this deepens the concern") → continue. Result: replies chosen + total scenarios completed.

## 8. Quizzes

- One quiz per day (5 total), plus an optional Day 5 "final".
- Each quiz: 5–8 multiple-choice questions drawn from that day's material.
- Questions and options live in `src/content/onboarding/quiz.ts` (client-visible). Correct answers and explanations live in `src/content/onboarding/answers.ts`, which imports `"server-only"` and is unreachable from the client bundle. **The client never learns the correct answer until after submission.**
- Grading is server-side (Hono endpoint). Client posts `{ quizSlug, responses: [{questionId, selected}] }`; server returns `{ score, maxScore, breakdown: [{questionId, correct, explanation}] }`.
- Pass threshold: 70%. Below that: retry allowed, same questions in a new order. Passing unlocks the next day.
- No time limit. No penalty for retries beyond the delay of retaking.

## 9. Auth

Passwordless email OTP. No passwords stored.

**Flow:**
1. User enters work email at `/auth/signin`.
2. Server rejects if not on the allowlist (env var `AUTH_ALLOWED_DOMAINS`, default `atlys.com`).
3. Server generates a 6-digit code, stores its hash + expiry (10 min) in `auth_otp`, sends via email provider.
4. User enters code at `/auth/verify`. On match: `auth_otp` row consumed, upsert into `onboarding_user`, sign a JWT (JOSE, HS256, 30-day rolling), set as `httpOnly; SameSite=Lax; Secure` cookie.
5. Rate limits: max 5 OTPs per email per hour, max 5 verify attempts per code.

**Why not passwords:** Removes password hashing, rotation, and forgot-password flow entirely; also proves the joinee controls the company inbox (which is what "signup with company email" actually means).

**Email provider:** Resend (least setup). If Atlys already uses SES or Postmark, swap the driver — the send call is one function.

## 10. Tech stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript strict**.
- **Tailwind CSS v4**, CSS-first `@theme` tokens (see §11).
- **Hono** mounted at `src/app/api/onboarding/[[...route]]/route.ts` via `hono/vercel`'s `handle()`. Exported route type consumed on the client through `hono/client` RPC — request/response types are inferred end-to-end, no duplicated types between client and server.
- **Zod** + `@hono/zod-validator` for every input.
- **Drizzle ORM** + **Postgres**. Migrations via `drizzle-kit`.
- **JOSE** for JWTs.
- **framer-motion** for the drill animations (used sparingly; `useReducedMotion` respected).
- **Resend** SDK (or provider swap).

No UI kit. No state library. No CSS-in-JS.

## 11. Design system

The visual language is the "beige paper" theme from the Atlys careers site. Tokens below are the source of truth for this app — copy into `src/app/globals.css` under `@theme inline { ... }`.

```css
@theme inline {
  /* Paper */
  --color-page: #f2ede4;          /* beige body background */
  --color-paper: #f2ede4;
  --color-paper-ink: #14141a;
  --color-surface: #ffffff;       /* card surface */
  --color-surface-soft: #faf7f0;  /* subtle raised card */
  --color-line: #e5e2d8;          /* rules and card borders */

  /* Ink */
  --color-ink: #14141a;
  --color-ink-secondary: #4a4956;
  --color-ink-muted: #6f6e80;

  /* Accents — indigo for CTAs on paper, retro blue for italic accents */
  --color-accent: #5057ea;
  --color-accent-hover: #6e74f0;
  --color-accent-bright: #9096f9;
  --color-accent-soft: #eef0ff;
  --color-retro-blue: #5b86c4;
  --color-electric: #2b2bf5;

  /* Status badges — used sparingly for quiz pass/fail, drill outcomes */
  --color-badge-teal: #0e8f82;
  --color-badge-teal-soft: #e1f5f1;
  --color-badge-amber: #c07f16;
  --color-badge-amber-soft: #fbf0dc;
  --color-badge-coral: #d1495b;
  --color-badge-coral-soft: #fce9eb;
  --color-badge-green: #3e8e4f;
  --color-badge-green-soft: #e7f5e9;

  /* Type */
  --font-sans: var(--font-inter);         /* body + UI */
  --font-mono: var(--font-jetbrains-mono); /* eyebrows, code, meta */
  --font-display: var(--font-playfair);    /* editorial italic accents */
  --font-condensed: var(--font-anton);     /* stacked block caps */
}
```

**Typography rules:**
- Body copy: `var(--font-sans)`, weight 400/500, `color: var(--color-ink)`.
- Muted supporting copy: `color: var(--color-ink-muted)`.
- Section eyebrows: `var(--font-mono)`, uppercase, `text-xs`, `letter-spacing: 0.2em`, `color: var(--color-accent)`.
- Day/section titles: sans, `text-4xl` to `text-5xl`, weight 600, `letter-spacing: -0.02em`.
- Optional editorial italic accents inside titles (e.g. *"is one of the few"*): `var(--font-display)`, italic, `color: var(--color-retro-blue)`. Use sparingly.

**Component conventions:**
- Cards: `bg-[color:var(--color-surface)]` with `border border-[color:var(--color-line)]` and `rounded-2xl`. No shadow.
- The indigo hero cards seen on the careers page (Who / Where / When) use `bg-[color:var(--color-accent)]` with white text and `rounded-3xl`. Reuse this treatment for the day summary cards on `/onboarding`.
- Primary buttons: pill (`rounded-full`), `bg-[color:var(--color-accent)]`, white text, hover `--color-accent-hover`.
- Secondary buttons: same pill, `bg-transparent`, `border` in `--color-ink`, ink text.
- Inputs: `bg-white`, `border-[color:var(--color-line)]`, focus ring in `--color-accent`.
- Motion: subtle. Fade + 8px rise on scroll, spring on drill state changes. `useReducedMotion` disables all.

**Fonts:** load Inter, JetBrains Mono, Playfair Display, and Anton via `next/font/google` in `layout.tsx` (same pattern as the careers site).

**Layout:**
- Max content width 1200px on `/onboarding`, 720px on quiz and auth screens.
- Left day-rail is sticky on `≥ lg`, becomes a top pill row on smaller viewports.
- Generous vertical rhythm — this is a reading experience, not a dashboard.

## 12. Backend API

Mount: `/api/onboarding/*` via a single catch-all route handler that hands off to Hono.

```
GET   /me
        → { user, progress[], attempts[] }

POST  /auth/otp/request         { email }
        → { ok: true }                                           (200 even on unknown email — don't leak allowlist)

POST  /auth/otp/verify          { email, code }
        → sets cookie, { user }

POST  /auth/signout
        → clears cookie

POST  /progress                 { itemKey, done }
        → upsert into onboarding_progress

POST  /quiz/:slug/start
        → { attemptId, questions: [{ id, prompt, options }] }    (no answers included)

POST  /quiz/:slug/submit        { attemptId, responses[] }
        → { score, maxScore, passed, breakdown[] }

GET   /quiz/:slug/result/:id
        → re-read a past attempt

POST  /exercise                 { exerciseKey, body }
        → stored to exercise_submission
```

All endpoints (except the two `/auth/otp/*` routes) require a valid session cookie. Zod validates every body.

The `app` instance in `src/server/onboarding/app.ts` chains `.get()` / `.post()` calls and exports `type OnboardingApi = typeof app`; the client imports this type and calls endpoints via `hc<OnboardingApi>(...)` — RPC style.

## 13. Data model

```
onboarding_user
  id            uuid PK
  email         text unique
  name          text nullable
  cohort        text nullable          -- for future admin grouping
  created_at    timestamptz
  last_seen_at  timestamptz

auth_otp
  email         text
  code_hash     text                   -- sha256 of the code + a per-row salt
  expires_at    timestamptz
  consumed_at   timestamptz nullable
  attempts      int default 0
  PRIMARY KEY (email, expires_at)

onboarding_progress
  user_id       uuid FK
  item_key      text                   -- e.g. "day1.read_glossary"
  completed_at  timestamptz
  UNIQUE (user_id, item_key)

quiz_attempt
  id            uuid PK
  user_id       uuid FK
  quiz_slug     text                   -- "day1", "day2", ..., "final"
  score         int
  max_score     int
  passed        boolean
  started_at    timestamptz
  submitted_at  timestamptz nullable

quiz_response
  attempt_id    uuid FK
  question_id   text                   -- stable id from content module
  selected      text                   -- option id
  is_correct    boolean
  PRIMARY KEY (attempt_id, question_id)

exercise_submission
  id             uuid PK
  user_id        uuid FK
  exercise_key   text                   -- e.g. "day2.rewrite_bad_chat"
  body           text
  submitted_at   timestamptz
```

Six tables. Questions are **not** in the database; they live in the content module and are referenced by stable string IDs. This keeps content edits migration-free.

## 14. Content modules

Typed, in-code, reviewed as PRs. Under `src/content/onboarding/`:

```
days.ts       // Day[]: id, title, objective, learn[], responsibilities[], activities[]
drills.ts     // dos/donts pairs, rewrite exercises, mock scenarios (branches + feedback)
quiz.ts       // { slug, questions: [{ id, prompt, options: [{ id, label }] }] }[]
answers.ts    // import "server-only". { [quizSlug]: { [questionId]: { correct, explanation } } }
tools.ts      // Day 1 tool list: Grafana, Freshchat, Retool WT, Notion, Exotel, WhatsApp groups
```

`answers.ts` importing `server-only` is what enforces the "client never sees answers" property at build time.

## 15. Non-functional requirements

- Accessibility: keyboard navigable end-to-end; visible focus rings; all interactive drills operable without a mouse; all form fields labelled; color contrast ≥ WCAG AA on beige.
- Responsive: 375px (mobile) through 1440px (laptop). Sticky day rail collapses to a top pill row < lg.
- Reduced motion: `useReducedMotion` disables entrance animations and the 10-second countdown's visual pulse (the countdown itself still runs).
- No client-side error is ever a blank white page: 404 and error boundaries render the beige page with a link back to `/onboarding`.
- Session persistence: closing the tab and returning within 30 days lands the user back at their last-visited day (`last_seen_at` + progress).
- Rate-limit auth endpoints as specified in §9.

## 16. Environment

```
DATABASE_URL              postgres://...
AUTH_ALLOWED_DOMAINS      atlys.com                (comma-separated)
AUTH_JWT_SECRET           <32+ byte random>
EMAIL_PROVIDER            resend                    (only "resend" implemented in v1)
RESEND_API_KEY            re_...
EMAIL_FROM                onboarding@atlys.com
APP_URL                   https://onboarding.atlys.com
```

## 17. Build phases

| Phase | Deliverable | Blocked on |
|---|---|---|
| 1 | Content modules populated from source doc, `/onboarding` + `/onboarding/quiz` rendered fully static, beige theme applied. | — |
| 2 | Five interactive drills, `useReducer` state, localStorage fallback so the UX is fully demoable pre-DB. | — |
| 3 | Auth: OTP flow, JWT session cookie, allowlist gate. | DB provisioned + email provider chosen |
| 4 | Hono endpoints + Drizzle migrations. Swap localStorage for typed RPC calls. Server-side quiz grading. | Phase 3 |
| 5 | Polish, reduced-motion audit, mobile pass, error boundaries. | Phase 4 |

Phases 1–2 must run cleanly on `npm run dev` with no database. This is a hard requirement — the content structure needs to be reviewable before infra decisions land.

## 18. Repo layout

```
atlys-onboarding/
  package.json
  next.config.ts
  tsconfig.json
  postcss.config.mjs
  eslint.config.mjs
  .env.example
  drizzle.config.ts
  docs/
    source-journey.md              # verbatim Day 1–5 doc from hiring manager
  src/
    app/
      layout.tsx
      globals.css                  # @theme tokens from §11
      page.tsx                     # landing
      auth/
        signin/page.tsx
        verify/page.tsx
      onboarding/
        page.tsx                   # 5-day journey
        quiz/[slug]/page.tsx       # quiz runner + result
      api/onboarding/[[...route]]/route.ts
    server/
      onboarding/
        app.ts                     # Hono instance + type export
        routes/
          auth.ts
          me.ts
          progress.ts
          quiz.ts
          exercise.ts
        grade.ts
        db/
          client.ts
          schema.ts
          migrations/
      auth/
        otp.ts                     # generate, hash, verify
        session.ts                 # JWT sign/verify, cookie helpers
      email/
        resend.ts
    content/onboarding/
      days.ts
      drills.ts
      quiz.ts
      answers.ts                   # "server-only"
      tools.ts
    components/
      onboarding/                  # DayRail, DayPanel, Checklist, PauseDrill, DosDontsSorter, RewriteExercise, ScenarioBranch
      quiz/                        # QuizRunner, QuestionCard, ResultsSummary
      ui/                          # Button, Card, Input, Badge — thin, theme-aware
    lib/
      utils.ts                     # cn()
      api-client.ts                # hc<OnboardingApi>()
```

## 19. Open decisions (do not block Phase 1)

1. **Database host** — Neon vs Supabase vs the live app's Postgres. Postgres either way, so schema/queries don't change; only `db/client.ts` does.
2. **Email provider** — Resend by default. Swap if Atlys has an existing SES/Postmark account.
3. **Cohort tagging** — how are joinees grouped (batch date? mentor?)? Column exists; population TBD.
4. **Admin UI** — deferred. Schema supports it.

## 20. Definition of done (v1)

- A new joinee, given only their `@atlys.com` email, can sign in, complete all five days, take and pass every quiz, submit the rewrite exercise, and see their progress persist across sessions and devices.
- No client bundle contains quiz answers (verified by searching the production bundle for a known answer string).
- All content on screen is traceable to a line in `docs/source-journey.md`.
- Mentor can pull a joinee's `exercise_submission` rows and quiz attempts via a database query (admin UI not required).
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 on `/onboarding`.
