# Before this goes in front of real joinees

Everything here is a deliberate choice made to keep the build testable, or a
known gap found while building it. None of it is a mystery to be rediscovered
later. Ordered by what bites hardest if it ships as-is.

Written 19 Aug 2026. Rewritten 21 Aug 2026. **Updated 26 Aug 2026: the gates
are ON, the cron schedule is set, and the database has been emptied for
production.** See §0 for what was checked and how, §1 for what is still
outstanding, and §6 for the commands to re-run it.

The step-by-step hand-off list — auth, Supabase, Cloudflare, Slack, and who owns
each — is in [`go-live.md`](go-live.md). This file is the *why*; that one is the
*do*.

---

## 0. What the sanity pass proved

Run on **21 Aug 2026** against this checkout and the live Supabase project.
Everything in this section is a measured result, not a reading of the code.

| Checked | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint` | clean (1 pre-existing style warning in `eslint.config.mjs` itself) |
| `next build` | succeeds, 13 routes, no build-time errors |
| Quiz grading | 53 questions (Day 1 **13**, Day 2 **18**, Day 3 **22**), every one has an answer key **under its own slug**, and every key names a real option id |
| Pass marks | Day 1 10/13, Day 2 13/18, Day 3 16/22 (70% threshold) |
| Stamps | **28** total — Day 1 **8**, Day 2 **11**, Day 3 **9**. All 28 earnable by a joinee who does the work; **0** earned on an empty state |
| Stamp faces | all 28 have their own sprite, none repeated anywhere in the passport, 2 spares unused |
| Drills | all **15** listed on exactly one day, wired to a component, given a stamp label, and holding enough content to finish. All 15 render in `/x-drill-preview` with no errors |
| Drill statuses | `complete` and `passed` earn the stamp; `rushed` and `in-progress` correctly earn nothing |
| Lessons | **28**, all written. **Zero placeholders** — this changed since 19 Aug |
| Checklist | **15** activities (Day 1 **5**, Day 2 **6**, Day 3 **4**) and 6 tools, every key namespaced to its day and unique across the whole programme |
| Mentors | Day 1 Komal Rawat + the joinee's team leader, Day 2 the team leader, Day 3 none. **One Slack ID in the codebase** |
| Points | a perfect run scores **1184**; an empty state scores 0; no category scores 0 on a finished day |
| Database | every column `store.ts` selects exists; all five upsert conflict targets update in place rather than inserting duplicates |
| Sync schema | accepts every payload a real client sends, including all three historical null/timestamp cases; still rejects bad version, non-uuid ids, negative scores, offset-less timestamps |
| Slack report | endpoint returns 200 on the real token, renders a real joinee card with team leader, points, quiz line and the full five-stage ODPAC body, every block inside Slack's 3000-char limit. **Nothing was posted** |
| Routes | public pages 200; `/onboarding/*` and `/admin/*` 307 to `/signin?next=…`; unknown page 404; `/api/onboarding/progress` and `/leaderboard` 503 without a session; `/admin/overview` 403 without an admin email |
| Anon DB exposure | this app carries no anon key at all, so the browser has no path to the database |
| Attempts | quizzes and drills both capped at **3**. Verified through the real reducer: first play counts 1, a mid-play reset is free, a replay after finishing costs one, no 4th is offered, and the best score survives every replay |
| No dead end | at the harshest flag setting, a joinee who fails every quiz 3× **and** rushes the pause drill 3× still walks Day 1 → 3 and still earns the voucher. The passport stays honest at 7/8 for that day |
| Pre-cap joinees | a stored drill row with no attempt count reads as **one** play used, not three - nobody is retroactively locked out |
| Voucher | earned only on all final-day activities + ODPAC + settled quiz; blocked by any one of them; not issued by finishing an earlier day; code stable per profile, 20,000 profiles → 20,000 distinct codes, no I/L/O/U |
| Voucher plumbing | reaches the admin desk and the Slack report only once earned; every block still inside Slack's 3000-char limit |
| Missing DB column | verified against the live database: the read falls back and returns all 14 drill rows, the write strips the field and updates in place. Without the fallback both paths fail silently |
| Placeholder text | swept out on 26 Aug. Every string literal in tracked `src/` scanned for placeholder language, then a production build's client chunks re-scanned to confirm the removed strings cannot ship. Nothing placeholder-shaped renders |

Re-verified 26 Aug 2026 against the committed launch flags and an emptied
database: 12 suites, `tsc`, `eslint` and a production build, all clean. What is
still outstanding is §1 — and every item there is a credential, a URL or a SQL
statement that only the account owner can supply.

---

## 1. Blockers — the build is wrong in production without these

### 1.1 The launch flags — now ON

Set 26 Aug 2026. `src/lib/dev-flags.ts`:

| Flag | Value |
|---|---|
| `DAY_GATE_ENABLED` | `true` |
| `STAMP_GATE_ENABLED` | `true` |
| `ODPAC_GATE_ENABLED` | `true` |
| `CALENDAR_GATE_ENABLED` | `true` |
| `PAUSE_COUNTDOWN_ENABLED` | `true` |
| `HIDE_STAFF_FROM_DESK` | `true` |
| `ADMIN_ENABLED` | `true` |

Verified against the committed values, not a simulation: a brand-new joinee has
**exactly one day open, and it is Day 1**; Days 2 and 3 report the padlock
reason `quiz`; `resumeDay` lands them on Day 1; and no voucher is issued.

The gate then opens one calendar day at a time. Finishing Day 1 yesterday opens
Day 2 this morning; finishing it *this* morning holds Day 2 until 10:30
tomorrow, with the countdown resolving. Unread lessons, an untouched drill or a
missing ODPAC report each hold it shut. Three failed quiz attempts do **not** —
see §3.3.

**No flag is a review switch any more.** The only reason to touch this file is a
deliberate product change.

### 1.2 The team-leader roster is empty, on purpose

**Emptied 26 Aug 2026.** The `team_leaders` table has zero rows and the seed
list `TEAM_LEADERS` in `src/content/onboarding/team-leaders.ts` is empty too.
The two test entries went first, then the last real one, so production starts
from nothing.

That fallback list is empty deliberately. It is only consulted when the database
cannot answer, and plausible fake names are the worst possible thing to fall
back to: a joinee picks one, the fake id lands in `profiles.team_leader`, and
the analytics tab credits "Team leader 3" for a real team's work. An empty
dropdown is a visible problem; fake names are an invisible one.

**Do, in this order:**

1. Sign in as an **admin** — the admin sign-in form has no team-leader field, so
   it works against an empty roster.
2. Add the real leaders on the desk. They appear in the sign-in dropdown
   immediately.

Until step 2 the presales sign-in dropdown is empty, and it is a required field
— so no joinee can finish signing in. That is the one ordering that matters.

**An admin can now remove leaders too** (added 26 Aug). A cross beside each name
in the roster fold opens a confirmation naming the consequence: the leader
disappears from the dropdown, and any joinee already pointing at that id keeps
their progress but shows the raw slug on the desk until they pick again. The
dialog says so explicitly, and warns separately when the leader being removed is
the last one.

**Never rename or delete an `id` once a joinee has picked it** — it is what is
stamped on `profiles.team_leader`. Right now nothing points at anything, because
the profiles table is empty, so this is the one moment when the roster can be
reshaped freely.

### 1.3 `AUTH_URL` must be set on the host

This was the silent one, and the code side of it is now fixed (§3.1) — but the
variable itself still has to exist in the production environment.

Auth.js derives `trustHost` from, in order:

```
AUTH_URL ?? AUTH_TRUST_HOST ?? VERCEL ?? CF_PAGES ?? NODE_ENV !== "production"
```

(`@auth/core/lib/utils/env.js`, verified against the installed copy.) On any
host that is not Vercel or Cloudflare Pages, that lands on `false` in
production. A false `trustHost` makes Auth.js return a non-OK session response,
which every reader downstream treats as "not signed in": middleware bounces to
`/signin`, the onboarding layout redirects, `currentProfile()` returns null, and
every joinee silently falls back to browser-only progress that never reaches the
database. `next dev` never shows it, because `NODE_ENV` flips that last default.

**Do:** set `AUTH_URL` to the deployment's origin — scheme and host, no
trailing slash. Deploying to Vercel or Cloudflare Pages? Their own variable
covers it and this is optional.

**Do not set it to an empty string.** The chain above is `??`, which falls
through on `undefined` but **not** on `""`. An `AUTH_URL=` copied over blank
reads as a real value, short-circuits the chain, and forces `trustHost` false
even in development — breaking local sign-in in a way a missing line does not.
This was verified against `@next/env`: a blank line loads as `""`. That is why
`.env.example` carries it commented out rather than empty.

### 1.4 One SQL line is outstanding: `drill_results.attempts`

Added 26 Aug 2026 with the three-attempt cap. **The live database does not have
it yet** — confirmed by probe, not assumed.

```sql
alter table public.drill_results add column if not exists attempts integer;
```

It is already in `supabase/schema.sql`, so re-running that file applies it.
Nullable and with no default on purpose: null means "written before the cap
existed", which the app reads as **one** play used rather than three, so nobody
is retroactively locked out of a drill they had already done once.

**Nothing breaks while it is missing**, and that took work — the naive version
of this change was a hard, silent failure. `loadProgress` selects the column, so
without it Postgres returns `42703`, `drills.data` comes back null, and **every
drill result vanishes from the loaded state**; `saveProgress` upserts it, so
PostgREST returns `PGRST204`, the upsert throws, and **every progress sync
500s** while the joinee's screen still says saved. That is the same failure shape
as the three incidents in §7.

Both paths now feature-detect and retry without the column, the same way
`ensureProfile` already tolerates a missing `profiles.team_leader`. Verified
against the live (un-migrated) database: the fallback read returned all 14 drill
rows, and the stripped upsert updated in place without adding duplicates.

**Do:** run the line. Until then the cap simply is not enforced on drills, and a
warning naming the column is logged on every read and write.

### 1.5 The Slack report cron is scheduled, but not yet running

`crons = ["30 3 * * SUN,TUE-SAT"]` in `worker/wrangler.toml`, set 26 Aug 2026,
day field corrected 31 Aug 2026.

**Setting that line starts nothing.** A cron trigger is only registered on the
Worker by `npm run deploy`, and a deployed run still needs both secrets and a
real `APP_URL`. Three things are still outstanding, all in
[`go-live.md`](go-live.md):

1. **`APP_URL` in `[vars]` is still `http://localhost:3000`.** A deployed worker
   would fetch localhost and fail every morning.
2. **The two secrets** (`REPORT_TOKEN`, `SLACK_WEBHOOK_URL`) are not set on the
   Worker.
3. **The old webhook must be rotated** before the new one is used — see §2.0.

Verified, since this is the pairing the worker README calls the number-one
silent failure: `30 3` is 03:30 UTC = **09:00 IST**; the day field
`SUN,TUE-SAT` is Sun + Tue–Sat, i.e. **every day except Monday**, which is the
only run that would have reported a closed Sunday; and `istReportDate()`
subtracts 24h from `scheduledTime`, so each run reports the **previous** IST
day. A 9am run asking for "today" would report a day 30 minutes old.

**The day field was wrong until 31 Aug 2026, and this section previously called
it verified.** It read `0,2-6`, which is correct in standard cron and invalid on
Cloudflare, whose week runs `1`=Sunday … `7`=Saturday. The Cloudflare API
rejected the trigger outright (`invalid cron string [code: 10100]`) and failed
the worker deploy, so no schedule was ever registered — the run set was never
actually wrong, it simply did not exist. It is named here because the original
check reasoned about the intended days and the UTC offset but took standard cron
numbering for granted, and because the obvious repair is a worse bug than the
original: `1,2-6` parses cleanly and means Mon–Fri. Named days are now used
throughout for this reason; in Cloudflare's numbering every day except Monday is
`1,3-7`.

To switch it back off: set `crons = []` and deploy again. An empty list clears
the registered schedule; **deleting the `[triggers]` block leaves it running.**

---

## 2. Security

### 2.0 A Slack webhook was exposed in the client bundle — rotate it

Found 26 Aug 2026. `.env.local` had a full Slack **incoming-webhook URL** as the
value of `NEXT_PUBLIC_SLACK_TEAM_ID`.

Anything on a `NEXT_PUBLIC_` name is inlined by Next into JavaScript served to
every visitor, and `MentorPanel.tsx` is a client component that reads it — so a
production build put the webhook into `.next/static/chunks/*.js`. Confirmed by
building and grepping the client chunks, not inferred. Anyone who loaded the page
could have read it and posted arbitrary messages into that channel.

It was also simply the wrong value: the mentor DM link came out as
`slack://user?team=https://hooks.slack.com/...&id=U0...`, which no client opens.

**Fixed:** the variable now holds the actual team id, `T01S84FFGAW`, which is
what it is for and is not a secret. The webhook was **not** carried over
anywhere.

**Still to do, by hand:**

1. **Rotate that webhook in Slack.** Treat it as compromised. It never reached
   git — `.env.local` is gitignored and has never been tracked — and the build
   output that contained it has been deleted, but it existed in a browser-served
   chunk and that is enough.
2. When the report should start posting, put the new one where it belongs:
   `cd worker && npx wrangler secret put SLACK_WEBHOOK_URL`. Never on a
   `NEXT_PUBLIC_` name.

### 2.1 `ADMIN_EMAILS` has a hardcoded fallback

`src/lib/auth/config.ts` falls back to `"shovan@atlys.com "` when the env var is
unset. On a deploy that forgets the variable, exactly one person can reach the
desk and nobody will know why. (The trailing space is harmless — the list is
trimmed — but it is a tell that this was never meant to be load-bearing.)

**Do:** set `ADMIN_EMAILS` explicitly in every environment. Consider failing
loudly instead of defaulting.

### 2.2 The progress trust model is client-push

The client PUTs its whole `ProgressState` and the server stores it as-is
(`src/server/onboarding/store.ts` says so out loud). Quiz attempt ids are
client-supplied and forgeable. Fixing it properly means moving scoring
authority to the server — a product decision, not a migration.

Worth knowing what this does *not* let a joinee do, because the sanity pass
checked: the grader iterates the quiz's own question list, so an invented
question id is ignored and cannot move the denominator, and the same question
sent five times scores 1, not 5. The forgeable part is the stored *attempt
record*, not the grading.

**Do:** decide whether that matters for this programme before launch.

### 2.3 `supabase/hardening.sql` has never been run

**Confirmed still un-applied on 21 Aug 2026** — the `joinee_activity` view it
creates does not exist in the database.

It is a reviewed, idempotent set of constraints, indexes and revokes. It
includes the `revoke all … from anon, authenticated` statements that turn a
silent empty result into a hard permission error.

Lower urgency than it reads: RLS is already enabled on all seven tables with no
policies, and this app ships **no anon key at all**, so there is no browser path
to the data today. The revokes are defence in depth for the day one appears.

**Do:** read it, run it, then run the `validate constraint` statements it
leaves commented out.

---

## 3. Fixed on 21 Aug 2026

### 3.1 The `AUTH_URL` failure is now loud

Two changes, neither of which alters behaviour when the variable *is* set:

- `.env.example` documents `AUTH_URL`, commented out rather than blank, with
  the `??`-versus-`""` trap written down (§1.3).
- `src/lib/auth/config.ts` exports `willTrustHost`, mirroring the Auth.js chain,
  and prints one loud `console.error` at startup when production has sign-in
  configured and no trusted host.

A warning and not a throw, because `next build` runs without production
variables in most pipelines and failing the build would trade a silent runtime
fault for broken CI. It is also skipped during `next build` itself — the build
sets `NODE_ENV=production` and evaluates the module once per worker, so without
that guard it printed nine identical warnings about a variable the build machine
is not supposed to have, which teaches the reader to ignore it exactly where it
needs to be read.

The host still has to set the variable. This only makes forgetting it
diagnosable in seconds instead of looking like "sign-in mysteriously does not
work".

### 3.2 The quiz endpoint no longer hands out the answer key

`POST /api/onboarding/quiz/:slug/submit` had no auth of any kind —
`src/middleware.ts` matches `/onboarding/*` and `/admin/*`, not `/api/*` — and
`gradeQuiz` put `correctOptionId` and `explanation` for **every** question into
the response. An anonymous `{"responses":[]}` returned the full answer key for
any day.

Two guards now, and the second is the one that matters:

- **A session is required**, gated on `isAuthConfigured` the same way the
  middleware is, so a local run with no Google credentials still grades.
- **The key is released per question, and only for a question that was actually
  answered.** A session check alone fixes nothing here: every joinee has a
  session, so any of them could have posted an empty `responses` array and
  harvested the lot.

Verified after the change: an anonymous POST gets `401` and no key. A
submission answering one question gets that one key back and nothing for the
other twelve. A full submission — which is all the UI can send, since Submit
stays disabled until every question has a selection — gets an answer and
explanation for every question exactly as before, so the review screen is
unchanged. A perfect paper still scores full marks and passes; an all-wrong
paper still scores zero.

---

### 3.3 Three attempts, and the dead end that had to be designed around

Added 26 Aug 2026: every day's quiz allows **3 submissions**, every drill allows
**3 plays**. The checklist is uncapped — ticking a box is not an attempt at
anything.

The interesting part is what a naive cap would have done. Three gates all
required a **pass**: `isDayUnlocked`, the stamp gate via `dayStampsComplete`,
and (now) the voucher. So a joinee who missed 70% three times would have been
held on that day permanently, by the app, with no way back in — and the pause
drill made it worse, because it can end on the non-terminal status `"rushed"`,
so rushing three times left an unearnable stamp and the same wall.

The agreed policy is **best attempt counts, the day opens anyway**. Concretely:

- `quizSettled` = passed **or** three attempts used. The gate, the day-board
  tick and the voucher all hang off this, not off `quizPassed`.
- `drillSettled` = terminal **or** three plays used.
- `dayWorkFinished` (new, in `selectors.ts`) is what the stamp gate asks. It is
  deliberately weaker than `dayStampsComplete`: the reading, the checklist, the
  travel kit and the report must still genuinely be done, but the two *capped*
  stamps are allowed to be settled-and-unearned.
- The calendar gate counts its next-morning from `quizSettledDateKey`, which
  falls back to the last submission when nobody passed — otherwise there is no
  date to count from and the countdown renders nothing.

**The passport stays honest.** The quiz stamp still requires 70% and the drill
stamp still requires finishing, so a joinee who failed shows 7 of 8 on that day
forever. The gate lets them through; the souvenir does not lie about it.

Verified by simulation at the harshest flag setting (all four gates on): a
joinee who fails every quiz three times **and** rushes the pause drill three
times still walks Day 1 → 2 → 3 and still earns the voucher.

**The cap is enforced at the drill's mount, not just on its replay button.** Every
drill derived "have I finished this play" from local component state, so
finishing one and pressing F5 handed out a brand-new deck without the replay
control ever being clicked — the cap was bypassable by reloading. All seven
drills with a replay control now lock to their stored result on mount and
require a deliberate replay to get a fresh one.

That lock has one subtlety worth not re-learning the hard way. Its local
counterweight must be **"untouched in this session"**, never **"finished"**.
`ready` starts false and in remote mode `store.load()` is a network round-trip,
so a joinee can mount, start playing, and only *then* have hydration land — and
a `!finished` counterweight would replace their half-played run with the
recorded panel mid-play, making them spend a play to continue. Five of the seven
were written with the wrong clause first time and caught in review; they now key
on an empty local-progress collection (`sorted.length === 0`,
`Object.keys(placements).length === 0`, `answeredHere === 0`, and so on).

Two consequences worth knowing:

- **A worse replay no longer lowers a drill score.** The reducer keeps the best
  score across plays. Before the cap a replay simply overwrote, so practising
  could cost you points — the wrong incentive on a drill whose purpose is
  practice, and indefensible once plays are finite.
- **A failing joinee still gets a voucher.** That is deliberate: the voucher
  marks finishing, and the redemption conversation with the team leader is where
  a weak finish gets discussed. The team leader has the scores in front of them
  in the same Slack report that carries the code.

### 3.4 The end-of-academy voucher

Issued once the final day's checklist is fully filed, its ODPAC report is in,
and its quiz is settled. Shown on the Day 3 board and on the passport page,
with a copy button.

**The code is derived, never stored** — `sha256("atlys-academy-voucher:v1:" +
profiles.id)` mapped into a 32-letter alphabet with I, L, O and U removed,
formatted `ATLYS-XXXX-XXXX-XXXX`. That choice is doing three jobs:

- **Stability.** Same code on every render, after a re-sync, on both surfaces,
  and on the admin desk. Nothing to get out of step.
- **It never touches the progress schema.** A generated-and-stored code would
  have to travel through the client-push upload — the one part of this codebase
  with a history of rejecting whole syncs over a single new field (§7). Deriving
  it avoids that entirely.
- **Unguessable, and unforgeable.** `profiles.id` is a database-generated UUID
  that appears in no API response, cookie or client bundle. And
  `GET /api/onboarding/voucher` re-checks the earning conditions against
  *stored* progress, so editing localStorage into a finished state returns
  nothing.

`AdminJoineeRow.voucherCode` is **null until earned**, so a team leader can
never read out a code to somebody who has not finished, and the Slack report's
voucher line only appears for a joinee who has.

Local-only mode has no server identity to derive from, so the card says so
rather than showing nothing.

---

## 4. Known product gaps

### 4.1 The ODPAC card is buried

Unchanged since 19 Aug. On Day 1 the stop order in
`src/components/onboarding/journey/stops.tsx` is:

```
brief | fieldwork | kit | people | reading |
drill-tool-match | drill-flag-swipe | drill-connect-islands |
odpac | passport | gate
```

The ODPAC report is 9th of 11, after every drill, despite being a required
daily activity that a mentor reads. Day 2 is worse — seven drills sit in front
of it, putting it 13th of 15. It was hard to find in testing, and "File the
report" stays disabled until all five stages have text.

**Do:** move it up the day board and give it required-activity treatment.
Agreed in principle, not yet done.

### 4.2 Stamp totals moved again

**28**, not the 25 this document claimed on 19 Aug, and not the 22 before that.
Day 1 **8**, Day 2 **11**, Day 3 **9**. The count moved because every lesson now
has a body, so all three days issue a reading stamp, and because the Day 2/Day 3
drill lists changed.

Any screenshot or note quoting 22 or 25 is stale.

### 4.3 Cohorts are "whoever signed in that day"

`profiles.cohort_date` defaults to `current_date` at first sign-in, so a
straggler lands in a cohort of one. Worth an explicit cohort table if cohorts
ever become a real unit of management.

### 4.4 Two content TODOs remain

Every placeholder a joinee could see is **gone** as of 26 Aug. What went, and
why the mechanism went with the content rather than being left dormant:

- **The lesson placeholder card.** `Lesson.body` was `string[] | null`, and a
  null rendered a dashed "Being written — this page arrives with §N of the
  content request" card with no "mark as read" button. Every lesson has a body,
  so `body` is now `string[]`: the placeholder is unrepresentable rather than
  merely unused, and the four `body !== null` filters that guarded it are gone.
- **Three lesson paragraphs that admitted their own gaps** — "what is still
  missing from this lesson…", "nobody has yet written down…", "has not been
  written down yet. Until it is…". These were live body text a joinee read.
  Rewritten to teach what is actually known.
- **The `accessNeeded` flag** and its amber "Needs tool access" note, on five
  activities. It marked resources the author could not reach while building;
  once the content landed it was flagging a gap that no longer existed and
  reading, to a joinee, as though the academy were unfinished.
- **`Tool.grantedBy`**, which printed "Access from <name>." under Walkie Talkie.
  Who grants what is a rota question the academy is the wrong place to answer,
  and a stale name sends a joinee to somebody who has moved team.
- **The `TEAM_LEADERS` seed names** — see §1.2.

Two real gaps are left, both marked `TODO(content)` in the source and neither
visible to a joinee:

- `src/content/onboarding/drills.ts` — the rewrite drill's "bad reply" is a
  written foil, not a real sanitised transcript.
- `src/content/onboarding/quiz.ts` — appointment booking logic (§2.6) is the
  last B1/B2 fact the Day 3 quiz cannot test.

One thing deliberately kept: `Lesson.ref` still records where each lesson came
from ("Manual §1.1", "Snehasish, Aug 2026"). It is **rendered nowhere** — the
placeholder card was its only reader — so it is invisible provenance. It does
still ship in the client data bundle, so if internal names in browser-readable
JavaScript matter, that field is the one to strip.

---

## 5. Things that look like bugs and are not

- **`x-admin-preview` and `x-drill-preview`** are gitignored local harnesses.
  Both `notFound()` outside development, and they are not in the repo at all, so
  they cannot reach a deployment.
- **Quiz question ids do not match their day.** Day 1's quiz contains `d4.q1`,
  Day 2's contains `d5.q1`, and so on — leftovers from the five-day scoping,
  moved into the three surviving quizzes. Cosmetic only: keys are looked up per
  slug, and all 53 resolve.
- **A stored attempt can have a smaller denominator than today's quiz.** The
  Slack report currently shows `Day 1 5/8` while Day 1 has 13 questions. Old
  attempts keep the denominator they were graded against, by design.
- **`progress_items` holds rows for activities that no longer exist** —
  `day4.monitor_pipeline`, `lesson.day4.*`, `day3.read_us_visa_doc` from the
  five-day scoping, and `day3.ops_failure_points` / `day3.qa_ops_lead` since the
  Ops Lead items were dropped in Aug 2026. Harmless: nothing reads a row for an
  activity that is not listed on a day, and `saveProgress` never deletes. The
  cost is that a joinee who ticked a since-removed item sees their points drop
  by 5 each — the tally is a pure function of what exists *now*, which is the
  same property that stops double-awards.
- **Renaming an activity's label is safe; renaming its key is not.** That is why
  `day1.intro_shovan` still reads `shovan` after the meeting moved to Komal
  Rawat, and `day2.sync_shovan` after that sync moved to the team leader. The
  key is what `progress_items.item_key` stores.
- **`role` is self-declared** at sign-in. `/admin` still gates on the real
  `ADMIN_EMAILS` allowlist, so picking "Admin" grants nothing.
- **Team leader validation is a format check, not a membership check**
  (`normalizeTeamLeader`). Deliberate: the roster is editable, and a membership
  test against the static seed list silently dropped every newly added leader.
- **`worker/README.md`'s block-budget estimate is optimistic.** It says the
  report emits "2 + 1 per active joinee"; a joinee with a report and two short
  written answers costs 5 blocks, not 1. The message chunks at 45 blocks
  regardless, so this affects how many Slack messages a big cohort produces, not
  whether it works.
- **The `1 Issue` badge in dev** was a browser extension injecting
  `bis_skin_checked` / `bis_register` before React hydrated, not app code.

---

## 6. Re-running the checks

Nothing here needs a fixture or a test runner. In order of what catches most:

```bash
npx tsc --noEmit && npx eslint
```

For a production build **while a dev server holds `.next`** — do not just run
`next build`, it will fight the dev server. Add
`...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {})`
to `next.config.ts`, then:

```bash
NEXT_DIST_DIR=.next-sanity npx next build
```

Afterwards `git checkout -- next.config.ts tsconfig.json` and
`rm -rf .next-sanity`. Two traps in that cleanup, both hit during this pass:

- **`next build` silently rewrites `tsconfig.json`**, appending
  `<distDir>/types/**/*.ts` to `include`. Always revert it, or a scratch distDir
  leaks into a tracked file.
- **Delete the scratch dir or ESLint lints it.** `.gitignore` and the ESLint
  config ignore `.next`, not `.next-sanity`, so leaving it behind turns a clean
  `npx eslint` into "37 errors" — every one of them in generated Turbopack
  chunks, none in the app. Alarming and entirely fake.

The Slack path, proving it works **without posting**:

```bash
REPORT_TOKEN=<the real token> SLACK_WEBHOOK_URL="" APP_URL="http://localhost:3000" node worker/scripts/dry-run.mjs --preview
```

`--preview` exits before the POST. **Without it the script posts to the real
webhook — never run it bare.** Set `REPORT_DATE=YYYY-MM-DD` to inspect another
day; that is also how a missed day is backfilled. A `404` from the endpoint
means `ADMIN_ENABLED` is false, a `403` means the token did not match.

The sync schema, without needing a session — `zValidator` runs before the
handler's session check, so `400` means the schema rejected the body and `503`
means it accepted it and only the session was missing:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:3000/api/onboarding/progress -H "Content-Type: application/json" -d '{"version":1,"completedItems":{},"attempts":[],"drills":{},"exercises":{},"lastVisitedDay":1}'
```

The three-attempt and voucher logic, exercised through the real reducer and the
real gate at launch flag settings, is the largest of the scratch suites - it is
the one to rewrite first if these rules are ever changed. It covers the quiz
cap, drill accounting, pre-cap rows, the no-dead-end guarantee, every voucher
earning condition, code stability and collisions, and the Slack line.

Every drill mounts, in one request — expect **15**:

```bash
curl -s http://localhost:3000/x-drill-preview | grep -o "Drill ·" | wc -l
```

`grep -o … | wc -l` and not `grep -c`: the rendered HTML is effectively one
line, so `-c` counts lines and answers `1` no matter how many drills mounted.

The deeper checks in §0 — stamp earnability, the launch-gate walk, per-slug
answer-key coverage, DB column and upsert-target verification — were one-off
scripts written to a scratch directory, not the repo. They compile
`src/content/onboarding/*` and the pure logic in `src/lib/progress/*` with
`tsc` into a temp dir, stub `server-only`, and shim the `@/` alias through
`Module._resolveFilename`. Rewrite them if needed; none of it needs to live
here.

---

## 7. Fixed earlier — context only, no action

Three bugs in the same class: one bad field silently rejecting an entire
progress upload, so a joinee's screen said "saved" while nothing reached the
database.

| Field | Was | Now |
|---|---|---|
| `avatar` | `.optional()` rejected `null` | `.nullish()`, normalised to `undefined` |
| `drills[].score` / `maxScore` | `.optional()` rejected `null` | `.nullish()` |
| `attempts[].submittedAt` | `z.iso.datetime()` demands a `Z` suffix; Postgres returns `+00:00`, so once an attempt round-tripped, every later upload 400'd **forever** | `z.iso.datetime({ offset: true })` |

All three were re-tested on 21 Aug against the live endpoint and stay fixed. The
timestamp case was checked against what this database actually returns —
`2026-08-16T21:07:58.98+00:00`, two-digit milliseconds — and against every other
shape Postgres can emit; Zod 4.4.3 accepts them all.

A rejected sync now logs the validation detail, not just the status code
(`src/lib/progress/remote-store.ts`). That is what found the third one.

Also fixed: the ODPAC stamp did not exist (`StampKind` had no `odpac`), so the
one artefact a mentor reads left no mark on the passport.
