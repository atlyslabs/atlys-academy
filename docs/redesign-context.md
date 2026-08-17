# Atlys Academy — redesign context

Paste this into a new session before asking for redesign work.

---

## What this is

`D:\atlys-onboarding` — a Next.js onboarding app for the Pre-checkout Sales
function at Atlys. A joinee works through five days of material, drills and
quizzes; a manager watches progress on an admin dashboard.

**The app was deliberately stripped to a clean slate for a full visual
redesign.** Every page and layout is currently an unstyled semantic skeleton.
That is intentional — do not "restore" the old design, and do not treat the
bare markup as a bug to fix. The job is to design it anew.

Stack: Next.js 16.2 (App Router, Turbopack), React 19.2, Tailwind v4
(CSS-first `@theme`, no `tailwind.config`), TypeScript strict, Hono API,
next-auth v5 (Google), Supabase.

## The one rule

**Design freely. Do not touch what works.**

Off limits unless explicitly asked:

- **Routes** — every URL must keep resolving. Files may move (route groups
  don't affect URLs), URLs may not change.
- **Content** — `src/content/onboarding/**` is the hiring manager's source
  material, transcribed from `docs/source-journey.md`. Never invent training
  content, day counts, durations or activity text. Derive numbers from the
  data; don't hardcode them.
- **Data and logic** — `src/lib/progress/**`, `src/server/onboarding/**`,
  `src/app/api/**`, `src/auth.ts`, `src/middleware.ts`, `src/lib/auth/**`,
  env files, Supabase schema.

## Current state

### Routes (all live, unchanged)

| URL | File | Notes |
|---|---|---|
| `/` | `src/app/page.tsx` | Bare index of the five days |
| `/onboarding` | `src/app/onboarding/page.tsx` | Bare content dump of all five days |
| `/onboarding/quiz/[slug]` | `.../quiz/[slug]/page.tsx` | Mounts `QuizRunner` (functional) |
| `/onboarding/passport` | `.../passport/page.tsx` | Mounts `PassportPages` (old styling) |
| `/onboarding/leaderboard` | `.../leaderboard/page.tsx` | Mounts `LeaderboardPanel` (old styling) |
| `/signin` | `src/app/signin/page.tsx` | Google sign-in, domain-restricted |
| `/admin` | `src/app/admin/page.tsx` | Manager dashboard, admin-email gated |
| `/api/onboarding/[[...route]]` | Hono | `/health`, `/progress` (GET/PUT), `/quiz/:slug/submit`, `/leaderboard`, `/admin/overview`, `/admin/daily-report` |
| `/api/auth/[...nextauth]` | next-auth | |

`src/app/onboarding/layout.tsx` does the sign-in check and wraps children in
`ProgressProvider` (`mode="remote"` when auth + Supabase are configured,
otherwise `"local"` — browser storage). Keep both concerns wherever the
redesign puts them.

### The stylesheet is nearly empty on purpose

`src/app/globals.css` is ~50 lines: two font slots, one ink colour, one page
colour, a focus ring, and a reduced-motion block. **Everything else — palette,
spacing scale, radii, motion curves, component classes — is yours to define.**
Nothing in there is a decision to preserve.

Fonts are wired in `src/app/layout.tsx` via `next/font`: **Inter** (400/500/600)
and **Tinos** (400/700 + italic). Tinos is a metric-compatible stand-in for
Times New Roman; the Atlys design system's real display serif is **Denton**,
which is commercially licensed and not in this repo. Swapping either is a
one-line change in `layout.tsx` plus the `--font-*` mapping in `globals.css`.

### Atlys brand tokens (verified, use these)

Pulled from design-system.atlys.com in an earlier session, with contrast
measured against `#0B0B0B`. The old stylesheet is archived at commit `7b03e73`
if you want the full block: `git show 7b03e73:src/app/globals.css`

| Role | Hex | Atlys token | Contrast |
|---|---|---|---|
| Darkest surface | `#0B0B0B` | `background-dark` | — |
| Raised surface | `#1A1A1A` | `grey-900` | — |
| Deep brand wash | `#00006B` | `brand-blue-900` | — |
| Hairline / lit hairline | `#1C1F21` / `#34393D` | `border-dark-200` / `-100` | — |
| Ink | `#FFFFFF` | `pure-white` | 18.9:1 |
| Muted ink | `#CCCCCC` | `grey-200` | 12.3:1 |
| Dim ink | `#999999` | `grey-400` | 6.9:1 |
| Brand fill | `#5057EA` | `brand-blue-500` | 3.65:1 — **fills and ≥24px only** |
| Brand hover | `#7379EE` | `brand-blue-400` | — |
| Brand text | `#969AF2` | `brand-blue-300` | 7.68:1 — small accent text |
| Complete/success | `#0C9769` | `emerald-500` | — |

Radii in the system: 4 / 8 / 12 / 16 / 24 / 30px.

There is also an older light "beige paper" palette in the archived stylesheet
(`--color-page: #f2ede4`, ink `#14141a`, accent `#5057ea`). It was the previous
theme, not brand truth — reference only.

## What still exists and what doesn't

**Deleted** (recoverable from `7b03e73`): the whole `src/components/canvas/`
landing system including a WebGL glow-burn intro, `OnboardingJourney`,
`RoadmapBoard`, `DayPanel` (the briefcase day desk), `PointsHud`,
`src/lib/day-meta.ts`, `src/lib/track.ts`, `public/texture/`.

**Preserved and working** — every drill, checklist, quiz and stamp component in
`src/components/onboarding/` (21 files), `src/components/quiz/`,
`src/components/admin/`, `src/components/auth/UserBar.tsx`, and 10 primitives in
`src/components/ui/` (Badge, Button, Card, Eyebrow, PassportStamp,
PixelDialogue, SpeakButton, HoldToReveal, JoineeAvatar, AtlysMark).

**Removed in the post-redesign sanity pass** (recoverable from `7b03e73`), all
of them unreachable once the redesign replaced what mounted them: `Dialog`,
`BootScreen`, `BriefcaseFrame`, `PlaneWindow`, `ScrollCue`, `SoundToggle`,
`AvatarBuilder` and `TetrisChecklist`. Their replacements are
`journey/TrailWindow` (a native `<dialog>`), `fx/LoadingScreen`,
`journey/JourneyDesk` and `Checklist`.

Those components still carry **old styling from two dead themes** — a light
"beige paper" look and a dark canvas look. Restyle or replace them freely;
just keep their behaviour and their progress/API calls intact.

### Two things to know before you start

1. **Drills are intact but nothing mounts them.** `DayPanel` was the only thing
   that rendered them and it was deleted with the old design. The wiring was
   extracted to **`src/lib/drill-registry.ts`** — `DRILL_COMPONENTS` maps each
   `DrillId` to its component, `DRILL_LABELS` gives a plain name. Read
   `day.drills` from `days.ts` and mount by id. How a drill opens (inline,
   dialog, its own route) is an open design decision.

   The registry covers all twelve ids. Three of them — `flag-swipe` (Day 1),
   `anxiety-wall` and `reframe-deck` (Day 2) — shipped as components but were
   never reachable in the old UI. They work; wire them up.

2. **`LeaderboardPanel` and `PassportPages` are still mounted with old
   styling**, because they read live API and stamp data. They look out of place
   until the redesign reaches them.

## Content data map (`src/content/onboarding/`)

`types.ts` (`Day`, `DayId`, `DrillId`, `Activity`, `ItemKey`), `days.ts` (the
five days: objective, learn topics, responsibilities, activities, drill ids),
`lessons.ts` (`lessonsForDay`), `quiz.ts` (`QUIZZES`, `getQuizBySlug`),
`drills.ts`, `answers.ts`, `coaching.ts`, `flags.ts`, `games.ts`, `puzzles.ts`,
`mentors.ts` (`MENTORS_BY_DAY`), `tools.ts` (`TOOLS`), `journey.ts`.

`journey.ts` is a **travel staging layer**, not training content: five real
airport legs with IATA codes and lat/lon (SYD → JNB → JFK → FRA → DEL), one per
day, plus narration. The redesign **kept** the metaphor — the legs drive the
landing globe's tour, each day's dossier standfirst and the passport stamps — so
it is live data, and the only real geo data in the repo; don't invent routes or
destination counts beyond it. The boarding-pass and world-map helpers it used to
carry (`flightNumber`, `projectToMap`) went with the old design; the surviving
derivations are `legForDay` and `narrationOpener`.

Feature switches live in `src/lib/dev-flags.ts` — `DAY_GATE_ENABLED` is
currently `false`, so all five days are open. The gate (pass the quiz at 70% to
unlock the next day) is a real product feature, just switched off for review.

## Environment quirks (important)

- **The agent Browser pane does not composite frames in this environment.** It
  reports a 0×0 viewport and never paints animation. Do not trust it for
  anything visual. Use the CDP harness instead:

  ```bash
  node scripts/shoot.mjs --url http://localhost:3000/ --at 0 --settle 1200 --label check
  ```

  It drives real headless Chrome, supports `--size 390x844`, `--dpr`,
  `--motion reduce`, `--hover "<selector>"`, `--at <scroll fractions>`, and
  reports console errors. `scripts/contrast.mjs` checks contrast ratios.

- **Port 3000 is often held by another session's dev server.**
  `.claude/launch.json` has `autoPort: true` for `atlys-onboarding`. Never run
  `rm -rf .next` while another session's server is running — it kills it.

- **Git identity**: this repo needs the work account, not the global personal
  one. Check `git config user.email` before committing.

- **MCPs are not connected** — no Atlys design system, Figma, PostHog, Vercel,
  Sentry or Linear server in this environment. Don't plan around them.
  The **Higgsfield CLI** is installed and authenticated but the account is on
  the **free plan with 0 credits**, so every generation fails with
  `job_minimum_basic_plan_required`. Image generation is unavailable until that
  plan changes.

- Skills installed at `.claude/skills/`: `landing-page-design` (Elaya) and
  `agent-elements` (21st.dev). The landing-page skill bans Inter, bans italics
  and allows only one font family — which contradicts this project's Inter +
  Tinos pairing. The project's choice wins.

- `lenis` was dropped from `package.json` in the sanity pass — nothing had
  imported it since the reset. Re-add it if smooth scroll comes back.

## Verify before claiming done

```bash
npx tsc --noEmit && npx eslint src/ && npx next build
```

The build's route list must stay identical to the table above. Then screenshot
the affected pages with `scripts/shoot.mjs` and check for console errors.

## History

- `7b03e73` — snapshot of everything before the reset (old design + the
  abandoned WebGL hero). Recovery point.
- `c07c273` — the clean-slate reset: −6,876 lines, page layer emptied.
