# Before this goes in front of real joinees

Everything here is a deliberate choice made to keep the build testable, or a
known gap found while building it. None of it is a mystery to be rediscovered
later. Ordered by what bites hardest if it ships as-is.

Written 19 Aug 2026.

---

## 1. Blockers - the build is wrong in production without these

### 1.1 Staff accounts are visible on the admin desk

`HIDE_STAFF_FROM_DESK` in `src/lib/dev-flags.ts` is **`false`**.

An admin signing in to *read* the desk is not a joinee: no team leader, no
progress. Left in the cohort they drag every completion rate down and put a
staff row into a screenshot meant to credit a team.

It is off because the only account on this deployment is an admin who is also
the test joinee - with staff hidden, the desk is empty and there is nothing to
check the dashboards against.

**Do:** set it back to `true`. Then verify the desk still shows real joinees,
because with one admin-only account it will correctly look empty again.

### 1.2 The team-leader roster is placeholder names

`TEAM_LEADERS` in `src/content/onboarding/team-leaders.ts` is
`Team leader 1 … Team leader 6`, ids `placeholder_1 …`.

This is the *seed/fallback* list. The live roster is the `team_leaders` table,
editable from the admin desk, and it currently holds one real entry.

The analytics tab exists to be screenshotted into Slack to credit a leader by
name. A card reading "Team leader 3 - 100%" credits nobody.

**Do:** add the real leaders on the admin desk (they appear in the sign-in
dropdown immediately). Keep the seed list in sync, or empty it, so a fallback
never shows fake names. **Never rename an `id` once a joinee has picked it** -
the id is what is stamped on `profiles.team_leader`. Names are safe to edit.

### 1.3 The day gate is switched off

In `src/lib/dev-flags.ts`:

- `DAY_GATE_ENABLED = false` - **every day is open**, nothing is locked.
- `STAMP_GATE_ENABLED`, `CALENDAR_GATE_ENABLED`, `PAUSE_COUNTDOWN_ENABLED` are
  all `true` but only consulted while the day gate is on.

**Do:** set `DAY_GATE_ENABLED = true` and walk one day end to end to confirm
the 10:30 next-morning unlock, the seal copy and the countdown all behave.

### 1.4 `AUTH_URL` is not set

`trustHost` defaults to false on any non-Vercel production deploy
(`@auth/core/lib/utils/env.js`). When it is false Auth.js returns a non-OK
session response, which reads downstream as "not signed in": middleware bounces
to `/signin`, the onboarding layout redirects, `currentProfile()` returns null,
and every joinee silently falls back to local-only mode.

`next dev` never shows this because `NODE_ENV !== "production"` flips the
default.

**Do:** set `AUTH_URL` (or `AUTH_TRUST_HOST=true`) in production and add it to
`.env.example`.

---

## 2. Security

### 2.1 The quiz endpoint is unauthenticated and returns the answer key

`POST /api/onboarding/quiz/:slug/submit` (`src/server/onboarding/app.ts`) never
calls `auth()`, and `src/middleware.ts` only matches `/onboarding/*` and
`/admin/*`, so nothing gates `/api/*`. `gradeQuiz` puts `correctOptionId` and
`explanation` for **every** question into the response, so an anonymous POST
with `{"responses":[]}` returns the full answer key for any day.

**Do:** require a session in that handler, or omit `correctOptionId` and
`explanation` for questions the joinee did not answer.

### 2.2 `ADMIN_EMAILS` has a hardcoded fallback

`src/lib/auth/config.ts` falls back to `"shovan@atlys.com "` when the env var is
unset. On a deploy that forgets the variable, exactly one person can reach the
desk and nobody will know why.

**Do:** set `ADMIN_EMAILS` explicitly in every environment. Consider failing
loudly instead of defaulting.

### 2.3 The progress trust model is client-push

The client PUTs its whole `ProgressState` and the server stores it as-is
(`src/server/onboarding/store.ts` says so out loud). Quiz attempt ids are
client-supplied and forgeable. Fixing it properly means moving scoring
authority to the server - a product decision, not a migration.

**Do:** decide whether that matters for this programme before launch.

### 2.4 `supabase/hardening.sql` has never been run

It is a reviewed, idempotent set of constraints, indexes and revokes, and
nothing applies it automatically. It includes the `revoke all … from anon,
authenticated` statements that turn a silent empty result into a hard
permission error.

**Do:** read it, run it, then run the `validate constraint` statements it
leaves commented out.

---

## 3. Known product gaps

### 3.1 The ODPAC card is buried

On Day 1 the stop order is:

```
brief | fieldwork | kit | people | reading | drill-tool-match |
drill-flag-swipe | drill-connect-islands | odpac | passport | gate
```

The ODPAC report is 9th of 11, after every drill, despite being a required
daily activity that a mentor reads. It was hard to find in testing, and
"File the report" stays disabled until all five stages have text.

**Do:** move it up the day board and give it required-activity treatment.
Agreed in principle, not yet done.

### 3.2 Stamp totals moved

Adding the ODPAC stamp ("Shadowed", one per day) took the total from 22 to 25.
Any screenshot or note quoting the old denominator is stale.

### 3.3 Cohorts are "whoever signed in that day"

`profiles.cohort_date` defaults to `current_date` at first sign-in, so a
straggler lands in a cohort of one. Worth an explicit cohort table if cohorts
ever become a real unit of management.

### 3.4 Lesson placeholders

14 of 24 lessons still have no body. Placeholder lessons are deliberately
excluded from stamp sheets so a day stays completable - see `stamps.ts`. As
content lands, `stamps.total` grows, so completion ratios shift under people
who have already finished.

---

## 4. Things that look like bugs and are not

- **`x-admin-preview`** is a gitignored local harness with hardcoded rows. It
  `notFound()`s outside development.
- **`role` is self-declared** at sign-in. `/admin` still gates on the real
  `ADMIN_EMAILS` allowlist, so picking "Admin" grants nothing.
- **Team leader validation is a format check, not a membership check**
  (`normalizeTeamLeader`). Deliberate: the roster is editable, and a membership
  test against the static seed list silently dropped every newly added leader.
- **The `1 Issue` badge in dev** was a browser extension injecting
  `bis_skin_checked` / `bis_register` before React hydrated, not app code.

---

## 5. Fixed while building - context only, no action

Three bugs in the same class: one bad field silently rejecting an entire
progress upload, so a joinee's screen said "saved" while nothing reached the
database.

| Field | Was | Now |
|---|---|---|
| `avatar` | `.optional()` rejected `null` | `.nullish()`, normalised to `undefined` |
| `drills[].score` / `maxScore` | `.optional()` rejected `null` | `.nullish()` |
| `attempts[].submittedAt` | `z.iso.datetime()` demands a `Z` suffix; Postgres returns `+00:00`, so once an attempt round-tripped, every later upload 400'd **forever** | `z.iso.datetime({ offset: true })` |

A rejected sync now logs the validation detail, not just the status code
(`src/lib/progress/remote-store.ts`). That is what found the third one.

Also fixed: the ODPAC stamp did not exist (`StampKind` had no `odpac`), so the
one artefact a mentor reads left no mark on the passport.
