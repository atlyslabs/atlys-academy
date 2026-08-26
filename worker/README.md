# onboarding-daily-report

Cron worker that posts each day's cohort report to Slack **the next morning**.

```
03:30 UTC (09:00 IST)
  → cron wakes this worker
  → GET {APP_URL}/api/onboarding/admin/daily-report?date=<PREVIOUS IST day>   (x-report-token)
  → app reads Supabase, builds the report, returns JSON
  → POST { blocks } to the Slack incoming webhook
  → worker exits; the JSON is discarded
```

## Why 9am, for yesterday

```
Day 1   10:30  day opens ──── joinee works ────┐
Day 1   24:00  IST day closes ────────────────-┘
Day 2   09:00  Day 1's report posts
Day 2   10:30  Day 2 unlocks
```

Two reasons, both about the earlier timing of 19:00 the same evening:

- **The day was not over yet.** The report counts activity inside an IST calendar
  day. At 19:00 anything a joinee did that evening had not happened, so it was
  never reported at all — the next day's message covered a different day.
- **Nobody could act on it.** A mentor reading at 19:00 waits until morning
  regardless. At 09:00 they have 90 minutes with the full picture before that
  joinee starts the next day.

Two things have to agree for that to hold, and they live in different files:

| | Where | Value |
|---|---|---|
| When it fires | `crons` in `wrangler.toml` | `30 3 * * 0,2-6` (03:30 UTC = 09:00 IST) |
| Which day it reports | `istReportDate()` in `src/index.ts` | the IST day before `scheduledTime` |

Change one without the other and the report is silently about the wrong day — a
9am run asking for "today" covers a day 30 minutes old and posts an empty report.
India has no DST, so the fixed UTC cron holds 09:00 IST all year.

`istReportDate` anchors to the cron's `scheduledTime`, not to `Date.now()`, so a
run that starts late still reports the day the schedule meant.

### Which days it fires

The office runs **Monday to Saturday**, and every run reports the day before, so
the schedule is **every day except Monday** — a Monday run would report Sunday.

| Fires | Reports |
|---|---|
| Tue | Mon |
| Wed | Tue |
| Thu | Wed |
| Fri | Thu |
| Sat | Fri |
| Sun | Sat |
| — | *(no Monday run; Sunday is not a working day)* |

`0,2-6` is Sunday plus Tuesday–Saturday. Cron numbers the week from Sunday
(`0`=Sun … `6`=Sat), so a wrapping `2-0` range does not exist and Sunday has to
be listed separately. Every day is covered, which is the point: a joinee can
start on any day of the week and their first day still gets a report.

Nothing is stored. Slack's channel history is the only durable copy of the
report; Supabase remains the only copy of the underlying data.

It lives outside the Next app on purpose. A request-driven web app has no timer
of its own, and this keeps the Slack credential out of the public app — only this
worker can post.

## Setup

```
npm install
npx wrangler login
npm run types            # generates worker-configuration.d.ts from wrangler.toml
```

Generate the shared token and set the **same value** in the app's env as
`REPORT_TOKEN` and here:

```
openssl rand -hex 32
npx wrangler secret put REPORT_TOKEN
npx wrangler secret put SLACK_WEBHOOK_URL
```

Point `APP_URL` in `wrangler.toml` at the deployed app.

## Test against a local app, before any of the above

Proves the webhook and the endpoint work together with no Cloudflare involved.
Set `REPORT_TOKEN` in the app's `.env.local` to any value, restart the dev server,
then:

```
REPORT_TOKEN=localtest node scripts/dry-run.mjs --preview
SLACK_WEBHOOK_URL='https://hooks.slack.com/services/…' REPORT_TOKEN=localtest node scripts/dry-run.mjs
```

`--preview` prints the exact message and posts nothing — worth using first, since
the report contains joinees' verbatim writing.

It defaults to **yesterday** in IST, matching the cron. `REPORT_DATE` overrides
that, and is also how a missed day is backfilled:

```
REPORT_DATE=2026-08-21 REPORT_TOKEN=localtest node scripts/dry-run.mjs --preview
```

## Test before deploying

```
npm run dev
curl "http://localhost:8787/__scheduled?cron=30+3+*+*+0,2-6"
```

`--test-scheduled` exposes that endpoint so the cron can be fired on demand
instead of waiting until 09:00 IST. It reports yesterday whenever you fire it,
same as the real run.

## Go live

The schedule ships **disabled** (`crons = []`). Turning it on is one line and one
deploy — the rest of this list is what has to be true first.

1. `HIDE_STAFF_FROM_DESK` and the other launch flags are set — see
   [`docs/pre-deploy.md`](../docs/pre-deploy.md). Staff rows otherwise appear in
   the report as joinees with no progress.
2. `APP_URL` in `wrangler.toml` points at the deployed app, not `localhost:3000`.
3. `REPORT_TOKEN` matches between the app's env and `wrangler secret`, and
   `SLACK_WEBHOOK_URL` points at a **private** channel.
4. A `--preview` dry-run against the deployed app looks right:

   ```
   APP_URL=https://<deployed-app> REPORT_TOKEN=<the real token> node scripts/dry-run.mjs --preview
   ```

5. In `wrangler.toml`, replace `crons = []` with:

   ```toml
   crons = ["30 3 * * 0,2-6"]
   ```

6. Deploy and watch:

   ```
   npm run deploy
   npm run tail
   ```

7. Confirm the schedule registered: Cloudflare dashboard → Workers & Pages →
   `onboarding-daily-report` → Settings → Trigger Events. It should read
   `30 3 * * 0,2-6`, and the first post arrives at the next 09:00 IST that is not
   a Monday — covering the day before it.

To switch it back off, set `crons = []` and deploy again. An empty list clears
the registered schedule; **deleting the `[triggers]` block leaves it running.**

## When it breaks

| Symptom | Cause |
|---|---|
| `report 403` | `REPORT_TOKEN` mismatch, or unset in the app (the token path is off while empty) |
| `report 404` | `ADMIN_ENABLED` is `false` in `src/lib/dev-flags.ts` |
| `report 503 … not configured` | App has no `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` |
| `report 503 … unreachable` | Network fault reaching Supabase. `EAI_AGAIN` means DNS — a resolver that will not answer for `*.supabase.co` |
| `non-JSON (behind Cloudflare Access?)` | App is behind Access — set the `CF_ACCESS_*` secrets |
| `slack 400: invalid_blocks` | Malformed Block Kit, or a section over 3000 chars |
| Nothing arrives, no error | The cron never fired. Every outcome posts something now — even a day with nobody on the course — so silence is always a scheduling fault, not a quiet day. Check Trigger Events, then `npm run tail` |
| Arrives, but reports the wrong day | `crons` and `istReportDate()` disagree — see the table above |
| `No new joinees` every morning, but a cohort exists | Nobody is inside the expected window: either their cohort date is more than `EXPECTED_FOR_DAYS` old, or `daysCompleted` already reads 3 for all of them |

Cron invocations are **not retried**. One failed run is one missing report, which
is why failures are posted to the channel rather than only thrown — the failure
message names the day, so it can be backfilled with `REPORT_DATE=…`.

## Known limits

- **50 blocks per Slack message.** The report emits 2–3 fixed blocks (header,
  the counts line, and an ODPAC-outstanding warning when there is one), then
  per active joinee: a divider, the summary card, one block per short written
  answer, and one per ODPAC report. So a joinee who filed their report and
  nothing else costs 3 blocks, and one with three short answers costs 6 — the
  measured figure on 21 Aug was 8 blocks for a single joinee.
  Chunking at 45 therefore covers roughly **12–15** joinees per message, not the
  ~43 a flat "1 per joinee" estimate suggests. Bigger cohorts simply send more
  messages; nothing breaks.
- **A day with no activity still posts — but it says which kind of quiet it
  was.** "Nothing happened" is useless on its own; these two are not the same
  event and the report distinguishes them:

  | Situation | What posts |
  |---|---|
  | Nobody is mid-course — everyone finished, no new intake | one line: *No new joinees — nobody is mid-course* |
  | A cohort **is** mid-course and none of them worked | a warning naming each of them, with how far in they are |

  The second is the one worth waking up for, and the reason the worker does not
  simply skip quiet days: a joinee who goes dark on day 2 is exactly what a
  mentor needs to catch, and silence would hide it.

  A joinee stops counting as "expected" `EXPECTED_FOR_DAYS` (7) after their
  cohort date — see `report.ts`. Past that they are a roster problem, not a daily
  Slack line; without the bound, one joinee who abandoned the course would be
  named every morning forever.

  Because every outcome now posts, the worker's only skip is a response carrying
  no blocks at all, which should not happen.
- The report carries joinees' verbatim writing, so the destination should be a
  private channel.
