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

Two reasons, both about the previous timing of 19:00 the same evening:

- **The day was not over yet.** The report counts activity inside an IST calendar
  day. At 19:00 anything a joinee did that evening had not happened, so it was
  never reported at all — the next day's message covered a different day.
- **Nobody could act on it.** A mentor reading at 19:00 waits until morning
  regardless. At 09:00 they have 90 minutes with the full picture before that
  joinee starts the next day.

Two things have to agree for that to hold, and they live in different files:

| | Where | Value |
|---|---|---|
| When it fires | `crons` in `wrangler.toml` | `30 3 * * *` (03:30 UTC = 09:00 IST) |
| Which day it reports | `istReportDate()` in `src/index.ts` | the IST day before `scheduledTime` |

Change one without the other and the report is silently about the wrong day — a
9am run asking for "today" covers a day 30 minutes old and posts an empty report.
India has no DST, so the fixed UTC cron holds 09:00 IST all year.

`istReportDate` anchors to the cron's `scheduledTime`, not to `Date.now()`, so a
run that starts late still reports the day the schedule meant.

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
curl "http://localhost:8787/__scheduled?cron=30+3+*+*+*"
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
   crons = ["30 3 * * *"]
   ```

   Every day, including weekends — so a Monday 9am run posts Sunday's empty
   report. For weekdays only, `"30 3 * * 2-6"` fires Tue–Sat and therefore
   covers Mon–Fri. Update the comment above `crons` either way.

6. Deploy and watch:

   ```
   npm run deploy
   npm run tail
   ```

7. Confirm the schedule registered: Cloudflare dashboard → Workers & Pages →
   `onboarding-daily-report` → Settings → Trigger Events. It should read
   `30 3 * * *`, and the first post arrives at the next 09:00 IST — covering the
   day before it.

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
| Nothing arrives, no error | Check the cron registered at all; UTC vs IST is the usual culprit |
| Arrives, but reports the wrong day | `crons` and `istReportDate()` disagree — see the table above |
| Arrives empty every morning | Almost certainly the same thing: it is reporting the day that just started |

Cron invocations are **not retried**. One failed run is one missing report, which
is why failures are posted to the channel rather than only thrown — the failure
message names the day, so it can be backfilled with `REPORT_DATE=…`.

## Known limits

- **50 blocks per Slack message.** The report emits 2 + 1 per active joinee, so
  chunking at 45 covers a cohort of ~43 before a second message is sent.
- **A quiet day still posts** "No joinee activity on this day." Decide whether
  that is wanted — a daily "nothing happened" trains people to stop reading the
  channel. Note this now posts the morning after a weekend or holiday too.
- The report carries joinees' verbatim writing, so the destination should be a
  private channel.
