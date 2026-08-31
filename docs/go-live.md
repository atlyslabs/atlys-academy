# Go-live checklist

Everything the code can do is done. What is left is credentials, URLs and one
set of SQL statements — all of it things only an account owner can supply.

Grouped by **who owns it**, so a section can be forwarded as-is. Each item says
what to do and how to know it worked.

Written 26 Aug 2026. The reasoning behind each item is in
[`pre-deploy.md`](pre-deploy.md); this file is just the doing.

---

## State of play

| | |
|---|---|
| Code | Typecheck, lint and production build clean. 12 verification suites passing. |
| Gates | **ON.** A new joinee sees Day 1 only; Days 2 and 3 unlock one calendar day at a time from 10:30. |
| Attempts | 3 per quiz, 3 plays per drill. Running out never blocks progress. |
| Voucher | Issued at the end of Day 3, visible on the passport and the Day 3 board, verifiable on the admin desk and in the Slack report. |
| Database | **Emptied 26 Aug 2026.** Zero profiles, zero progress. The next sign-in creates the first real row — but see 6.0 first: a stale signed-in browser will restore it. |
| Team leaders | **Empty.** Add the real roster on the admin desk — an admin can now remove entries there too. |
| Slack cron | Schedule set in config. **Not deployed, so nothing posts yet.** |

---

## 1. Supabase — the database owner

**These are SQL statements. They cannot be run from the app**, because the
service-role key reaches PostgREST only, not raw SQL. Run them in the Supabase
dashboard → **SQL Editor**.

- [ ] **1.1 Run `supabase/schema.sql` in full.** Idempotent — every statement is
  `if not exists`. It is also the only thing that adds the column below.

- [ ] **1.2 Confirm `drill_results.attempts` now exists.** This one carries the
  three-attempt drill cap.

  ```sql
  select column_name from information_schema.columns
  where table_schema = 'public' and table_name = 'drill_results';
  ```

  **Until it exists the drill cap silently does not apply.** The app detects the
  missing column and degrades rather than breaking — it logs a warning naming
  the column on every read and write — but drills stay unlimited. The *quiz* cap
  needs no schema change and works either way.

- [ ] **1.3 Run `supabase/hardening.sql`.** Constraints, indexes, and REVOKEs
  that turn a silent empty result into a hard permission error. It was audited
  on 26 Aug and two stale statements were fixed, so run the current version, not
  a copy someone saved earlier.

  Best done now: the tables are empty, so no constraint can fail on existing
  rows.

- [ ] **1.4 Validate the constraints.** `hardening.sql` adds them `not valid` so
  they can never block a deploy. On an empty database there is nothing to
  violate, so validate immediately — the four statements are in a comment block
  at the end of that file.

- [ ] **1.5 Confirm RLS is on with no policies.** It already is, and that is
  fail-closed and correct. All access is server-side through the service-role
  key, which bypasses RLS. There is no anon key anywhere in this app, so the
  browser has no path to the database at all — keep it that way.

---

## 2. Google OAuth — whoever owns the Google Cloud project

Google Cloud Console → **APIs & Services → Credentials → Create credentials →
OAuth client ID → Web application**.

- [ ] **2.1 Register both redirect URIs, exactly, including the scheme.** A
  mistyped entry here is the single most common failure and shows as
  `redirect_uri_mismatch`.

  ```
  http://localhost:3000/api/auth/callback/google
  https://<production-domain>/api/auth/callback/google
  ```

- [ ] **2.2 Hand over `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.** Sign-in stays
  switched off entirely until both are set — no redirect, no gate, every route
  open, progress browser-local. That is by design, not a bug.

- [ ] **2.3 Confirm the workspace domain.** The app admits `@atlys.com` only.
  The `hd` parameter sent to Google merely biases the account chooser and can be
  stripped from a URL; the check that counts is `isAllowedEmail` on the server,
  which also requires a **verified** address. Override with
  `AUTH_ALLOWED_DOMAIN` if it should be anything else.

---

## 3. Hosting environment variables — whoever owns the deployment

- [ ] **3.1 `AUTH_URL` — the one that fails silently.** Set it to the
  deployment's origin, scheme and host, **no trailing slash**:
  `https://academy.atlys.com`.

  Auth.js decides whether to trust the host from
  `AUTH_URL ?? AUTH_TRUST_HOST ?? VERCEL ?? CF_PAGES ?? NODE_ENV !== "production"`.
  On any host that is not Vercel or Cloudflare Pages that lands on `false` in
  production, and a false `trustHost` makes Auth.js return a non-OK session —
  which every reader treats as "not signed in". Middleware bounces everyone to
  `/signin`, nothing syncs to the database, `/admin` is unreachable, and **no
  error appears anywhere**. `next dev` never shows it.

  Deploying to Vercel or Cloudflare Pages? Their own variable covers it and this
  is optional.

  **Do not set it to an empty string.** That chain is `??`, which falls through
  on undefined but *not* on `""`, so a blank `AUTH_URL=` reads as a real value
  and forces `trustHost` false — including in development. Leave the line out
  entirely rather than blank.

  *How you know:* sign in on the deployed URL and reach `/onboarding` without
  being bounced. If sign-in appears to work but nothing shows on `/admin`, this
  is the cause. The app also logs one loud `[auth]` line at startup naming it.

- [ ] **3.2 `AUTH_SECRET`.** Generate with `npx auth secret`. **Must differ
  between production and local.** It signs session cookies; it is not from
  Google.

- [ ] **3.3 `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.** Project Settings →
  API. The service-role key bypasses row-level security: **server-side only,
  never on a `NEXT_PUBLIC_` name.**

- [ ] **3.4 `ADMIN_EMAILS`, explicitly.** Comma-separated. If it is unset the
  code falls back to a single hardcoded address, so exactly one person can reach
  the desk and nobody knows why. Admin access is by this list alone — the role
  picked at sign-in grants nothing.

- [ ] **3.5 `REPORT_TOKEN`.** `openssl rand -hex 32`. The same value goes here
  and into the Worker secret in §5. While it is empty the token path is disabled
  and only an admin session can pull the report.

- [ ] **3.6 `NEXT_PUBLIC_SLACK_TEAM_ID` — team id only.** Currently
  `T01S84FFGAW`. Anything on a `NEXT_PUBLIC_` name is inlined into JavaScript
  served to every visitor. **A full webhook URL was found in this variable and
  removed on 26 Aug** — see §4.1.

Everything is documented in `.env.example`, which is committed and carries no
real values.

---

## 4. Slack — whoever owns the workspace

- [ ] **4.1 Rotate the existing incoming webhook. Treat it as compromised.**

  It was stored in `NEXT_PUBLIC_SLACK_TEAM_ID`, and a production build put it in
  a client-side JavaScript chunk served to every visitor — confirmed by
  building and grepping the output, not assumed. Anyone who loaded the page
  could have read it and posted into that channel.

  It never reached git (`.env.local` is gitignored and has never been tracked)
  and the build containing it was deleted, but it existed in a browser-served
  file and that is enough. **Revoke it and create a new one.**

- [ ] **4.2 Point the new webhook at a PRIVATE channel.** The daily report
  carries joinees' verbatim written work — their ODPAC reports and drill
  answers — plus their scores and their team leader's name.

- [ ] **4.3 Give the new URL straight to the Worker secret in §5.2.** Never into
  the app's env, never on a `NEXT_PUBLIC_` name, never into a file in the repo.

- [ ] **4.4 Decide who reads the channel.** The report lands at **09:00 IST**
  and covers the **previous** day, which leaves 90 minutes before the next day
  unlocks at 10:30 — the window exists so a mentor can act on it before the
  joinee starts. It is only useful if somebody is actually reading at 9am.

---

## 5. Cloudflare Worker — whoever owns the Cloudflare account

The schedule is already set in `worker/wrangler.toml`:
`crons = ["30 3 * * SUN,TUE-SAT"]` — 09:00 IST, every day except Monday. **That
line alone starts nothing**; a trigger is only registered by a deploy.

Verified: `30 3` is 03:30 UTC = 09:00 IST; `SUN,TUE-SAT` is Sun plus Tue–Sat, so
the only skipped run is the Monday one that would have reported a closed Sunday;
and `istReportDate()` subtracts 24h from the scheduled instant, so each run
reports the previous IST day. Those two must always move together.

The day field read `0,2-6` until 31 Aug 2026. That is correct in standard cron
and invalid on Cloudflare, which numbers the week `1`=Sunday … `7`=Saturday, so
the API refused the trigger and the worker deploy failed. Keep the day **names**:
the plausible numeric repair, `1,2-6`, parses fine and means Mon–Fri, running on
the one day it must not and skipping Sunday and Saturday with no error.

```bash
cd worker && npm install && npx wrangler login
```

- [ ] **5.1 Set `APP_URL` in `[vars]` to the deployed app.** It is still
  `http://localhost:3000`. A deployed worker would fetch localhost and fail
  every morning.

- [ ] **5.2 Set both secrets.** `REPORT_TOKEN` must match §3.5 exactly.

  ```bash
  npx wrangler secret put REPORT_TOKEN
  npx wrangler secret put SLACK_WEBHOOK_URL
  ```

- [ ] **5.3 Dry-run against the deployed app, and read the output.** This posts
  nothing.

  ```bash
  APP_URL=https://<deployed-app> REPORT_TOKEN=<the real token> node scripts/dry-run.mjs --preview
  ```

  **Never run it without `--preview`** — bare, it posts to the real webhook.

  If it fails: `403` is a token mismatch. `404` means `ADMIN_ENABLED` is false.
  `503 … not configured` means the app has no Supabase credentials. `503 …
  unreachable` is a network fault (`EAI_AGAIN` is DNS). Non-JSON means the app
  is behind Cloudflare Access and needs the `CF_ACCESS_*` service-token secrets.

- [ ] **5.4 Deploy and watch.**

  ```bash
  npm run deploy
  npm run tail
  ```

- [ ] **5.5 Confirm the trigger registered.** Cloudflare dashboard → Workers &
  Pages → `onboarding-daily-report` → Settings → **Trigger Events**. It should
  read `30 3 * * SUN,TUE-SAT`. The first post arrives at the next 09:00 IST that
  is not a Monday. If the deploy reported `invalid cron string [code: 10100]`,
  the script shipped but **no schedule was registered** — fix the day field and
  deploy again, then re-check this screen.

  To turn it off later: set `crons = []` and deploy again. An empty list clears
  the schedule; **deleting the `[triggers]` block leaves it running.**

---

## 6. First-run smoke test — you

In this order. The first two steps must be in this order or nobody can sign in.

- [ ] **6.0 Clear the browser data on any device that used the old build
  first.** Site data for the app's origin, in every browser and profile that was
  signed in during testing.

  Wiping the database is not enough on its own, and this was proved the hard
  way: after the first wipe the tables refilled to exactly their old counts
  within minutes. Sessions are JWTs, so they survive the profile row being
  deleted; localStorage is the write-through cache; and on load
  `remoteProgressStore` merges local with server and **uploads the merge**. So
  one stale signed-in tab restores the whole thing, and `ensureProfile`
  recreates the profile row to hang it on.

  If it happens anyway: stop the app, wipe again, and only then reopen a
  browser.

- [ ] **6.1 Sign in as an admin first.** An admin's sign-in form has no
  team-leader field, so it works against an empty roster.

- [ ] **6.2 Add the real team leaders on the admin desk.** They appear in the
  joinee sign-in dropdown immediately. Right now there is exactly one entry, so
  until this is done every joinee has one option.

  Get this right before anyone signs in: the id is frozen once a joinee picks
  it, because it is what lands in `profiles.team_leader`. Names stay editable
  forever; ids do not.

- [ ] **6.3 Sign in as a joinee** (a test `@atlys.com` account, or your own with
  the presales role) and confirm: **only Day 1 is open**, Days 2 and 3 show a
  padlock reading *quiz*.

- [ ] **6.4 Walk Day 1.** Read the pages, file the checklist, request the tools,
  play the three drills, file the ODPAC report, sit the quiz.

- [ ] **6.5 Check the caps.** The quiz should show attempts remaining and refuse
  a fourth. A drill's replay control should disappear after three plays. Reload
  mid-drill: you should get your recorded result and a replay button, not a free
  fresh deck.

- [ ] **6.6 Confirm Day 2 stays shut until 10:30 tomorrow.** Finishing Day 1
  today should show a countdown, not an open Day 2. That is the calendar gate
  working.

- [ ] **6.7 Check the admin desk** shows that joinee, with their scores and
  their written work — and that your own admin row is *not* listed as a joinee.

- [ ] **6.8 After Day 3, check the voucher.** It should appear on the Day 3
  board and the passport with a copy button, and the same code should show on the
  admin desk and in the next Slack report. If the codes differ, something is
  wrong — it is derived, so they cannot disagree.

- [ ] **6.9 Delete the test joinee's rows** before real joinees start, if you
  used a throwaway account.

---

## Two things worth deciding, not doing

Neither blocks launch.

**A joinee who fails a quiz three times still finishes and still gets a
voucher.** This is deliberate. Capping attempts while gating progress on a
*pass* would wall someone in permanently with no way back in, so after three
attempts the best score stands and the day opens anyway. The 70% mark still
decides whether the stamp is earned, so the passport shows honestly who cleared
the bar. The redemption conversation with the team leader is where a weak finish
gets discussed — and that leader has the scores in the same Slack message as the
code. If you would rather a failing joinee got no voucher, say so; it is a
one-line change, but it makes the voucher unreachable for them.

**Scoring authority is on the client.** The browser sends its whole progress
state and the server stores it. Quiz *grading* is server-side and cannot be
tampered with — the answer key never leaves the server, an invented question id
is ignored, and the same question sent five times scores one. What is forgeable
is the stored attempt record. Fixing that properly means moving scoring
authority server-side, which is a product decision rather than a migration.
