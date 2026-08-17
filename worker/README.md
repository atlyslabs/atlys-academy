# onboarding-daily-report

Cron worker that posts the end-of-day cohort report to Slack.

```
13:30 UTC (19:00 IST)
  → cron wakes this worker
  → GET {APP_URL}/api/onboarding/admin/daily-report?date=<IST today>   (x-report-token)
  → app reads Supabase, builds the report, returns JSON
  → POST { blocks } to the Slack incoming webhook
  → worker exits; the JSON is discarded
```

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

## Test before deploying

```
npm run dev
curl "http://localhost:8787/__scheduled?cron=30+13+*+*+*"
```

`--test-scheduled` exposes that endpoint so the cron can be fired on demand
instead of waiting until 19:00 IST.

## Deploy

```
npm run deploy
npm run tail
```

Confirm the schedule registered: Cloudflare dashboard → Workers & Pages →
`onboarding-daily-report` → Settings → Trigger Events.

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

Cron invocations are **not retried**. One failed run is one missing report, which
is why failures are posted to the channel rather than only thrown.

## Known limits

- **50 blocks per Slack message.** The report emits 2 + 1 per active joinee, so
  chunking at 45 covers a cohort of ~43 before a second message is sent.
- **A quiet day still posts** "No joinee activity today." Decide whether that is
  wanted — a daily "nothing happened" trains people to stop reading the channel.
- The report carries joinees' verbatim writing, so the destination should be a
  private channel.
