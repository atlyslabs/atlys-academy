# Deploy — bare minimum

Goal: the app live today. Everything optional is at the bottom.

---

## First, what this repo actually is

**Two separate things.** Only the first one is the app.

| | What | Deploy |
|---|---|---|
| repo root | The Next.js 16 app. This is the site. | Any Node 20.9+ host |
| `worker/` | A 130-line Cloudflare cron script that posts a daily Slack summary | Separate, optional, later |

`worker/` is **not** the app's backend. The app has no separate backend — it is
one Next.js application with its own API routes (`/api/*`) talking to Supabase.
Running `wrangler deploy` inside `worker/` ships the cron script, not the site.

Skip `worker/` entirely for now. The app is fully functional without it; you
just don't get the 9am Slack message.

---

## Deploy it

Standard Next.js. No custom build, no Docker needed, no adapter.

```bash
git clone https://github.com/atlyslabs/atlys-academy.git
cd atlys-academy
npm ci
npm run build
npm start          # serves on :3000
```

**Requires Node 20.9 or newer** (Next 16's floor). No `engines` field is
declared, so nothing will stop you on an older Node — it will just fail
strangely.

It builds and runs with **zero environment variables**, in a degraded mode: no
sign-in, no database, progress kept in the browser. That is deliberate, so you
can deploy first and add the variables after — which you have to do anyway,
because one of them is the deployed URL itself.

---

## Environment variables

Six needed. Four are filled in below; two are secrets Ashutosh will send you
separately.

| Variable | Value |
|---|---|
| `AUTH_URL` | **Your deployed origin.** No trailing slash. e.g. `https://academy.atlys.com` |
| `AUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | `938253067196-medmbjiop2j85sat8qdujivsr77v800g.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | **From Ashutosh** — do not accept this over Slack |
| `SUPABASE_URL` | `https://dtaipvbmmsvbqvkbrkop.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **From Ashutosh** — do not accept this over Slack |
| `ADMIN_EMAILS` | `ashutosh.thakur@atlys.com,shovan.nag@atlys.com,saksham.chhabra@atlys.com,komal.rawat@atlys.com` |
| `NEXT_PUBLIC_SLACK_TEAM_ID` | `T01S84FFGAW` — optional, cosmetic |

Not needed yet: `REPORT_TOKEN`. That is only for the Slack cron worker.

### The two that will bite you

**`AUTH_URL` — sets `trustHost`, and its failure is completely silent.**
Auth.js resolves it as
`AUTH_URL ?? AUTH_TRUST_HOST ?? VERCEL ?? CF_PAGES ?? NODE_ENV !== "production"`.
On any host that is not Vercel or Cloudflare Pages, that lands on `false` in
production — and a false `trustHost` makes every session read as signed-out.
Sign-in appears to work, then bounces the user straight back. Nothing is logged
except one `UntrustedHost` line.

Set it to the exact origin, no trailing slash. If you are on Vercel or CF Pages
you can leave it out; their own variable covers it. **Never set it to an empty
string** — the chain above is `??`, which falls through on undefined but not on
`""`, so a blank value is worse than a missing one.

**`SUPABASE_SERVICE_ROLE_KEY` must stay server-side.** It bypasses all database
security. Never put it — or anything else — on a name starting with
`NEXT_PUBLIC_`; those get compiled into JavaScript sent to every visitor.

### After adding them: redeploy, not restart

`NEXT_PUBLIC_*` values are baked in at build time, so they only take effect on a
fresh build. On Vercel, *any* env change needs a new deployment.

---

## One thing outside your control

Once you have the URL, someone with Google Cloud access must add it to the
existing OAuth client — Console → APIs & Services → Credentials → the existing
Web application client → **Authorised redirect URIs**:

```
https://<your-deployed-url>/api/auth/callback/google
```

**Sign-in cannot work until this exists.** A mistyped entry shows as
`redirect_uri_mismatch`. Send Ashutosh the URL and he will chase it.

---

## If you want it on Cloudflare Workers

Doable, but it is not `wrangler deploy` — a Next.js app needs an adapter:

```bash
npm i -D @opennextjs/cloudflare
```

Then a `wrangler.jsonc` **for the app** (separate from `worker/wrangler.toml`)
with `nodejs_compat` enabled, and deploy via OpenNext rather than wrangler
directly. Two specifics for this codebase:

- `nodejs_compat` is **required**, not optional — `src/server/onboarding/voucher.ts`
  imports `node:crypto`.
- Nothing sets `export const runtime = "edge"`, so everything expects the Node
  runtime. Don't switch it.

If today is the goal, a plain Node host is less work — the app is a stock
`next build` / `next start` with no adapter, and Cloudflare can be a follow-up.
Your call.

---

## How you know it worked

Before env vars — build succeeded and the site loads:

```bash
curl -s https://<your-url>/api/onboarding/health
# {"ok":true,"service":"onboarding","sync":false}
```

`sync:false` is correct here. It means no database yet.

After env vars and the Google redirect URI:

```bash
curl -s https://<your-url>/api/onboarding/health
# {"ok":true,"service":"onboarding","sync":true}
```

`sync:true` means Supabase is connected. Then hand back to Ashutosh — he signs
in and checks the rest.

If sign-in loops back to the sign-in page, or the logs show `UntrustedHost`,
it is `AUTH_URL`. That is the only failure worth pre-empting.

---

## Heads up

While the environment variables are missing, `/onboarding` and `/admin` are
publicly reachable — there is no sign-in gate until Google is configured.
`/admin` renders an empty shell with no data, so nothing is exposed, but don't
circulate the URL until the variables are in.

Dependabot has three open PRs on the repo (hono, js-yaml, a worker update).
None blocks a deploy.
