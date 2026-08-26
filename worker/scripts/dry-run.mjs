
const preview = process.argv.includes("--preview");
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const token = process.env.REPORT_TOKEN ?? "";
const webhook = process.env.SLACK_WEBHOOK_URL ?? "";

// The report's day boundary is a working day in India, not UTC - and the
// scheduled run covers the PREVIOUS day, so this default matches the cron
// rather than the calendar. Set REPORT_DATE=YYYY-MM-DD to report any other day
// (that is also how a missed day is backfilled).
const date = process.env.REPORT_DATE ?? previousIstDay();
const MAX_BLOCKS = 45;

if (!token) {
  fail("REPORT_TOKEN is not set. It must match REPORT_TOKEN in the app's .env.local.");
}
if (!preview && !webhook) {
  fail("SLACK_WEBHOOK_URL is not set. Use --preview to skip posting.");
}

const url = `${appUrl}/api/onboarding/admin/daily-report?date=${date}`;
console.log(`→ GET ${url}`);

const res = await fetch(url, { headers: { "x-report-token": token } });
const raw = await res.text();

if (!res.ok) fail(`report endpoint ${res.status}\n${raw.slice(0, 400)}\n\n${hint(res.status)}`);

let report;
try {
  report = JSON.parse(raw);
} catch {
  fail(
    `expected JSON, got:\n${raw.slice(0, 200)}\n\n` +
      "If that is an HTML login page, the app is behind Cloudflare Access and\n" +
      "needs CF-Access-Client-Id / CF-Access-Client-Secret service-token headers.",
  );
}

const blocks = report.slackBlocks ?? [];
console.log(
  `← ${res.status} · ${report.activeToday} active, ${report.idleToday ?? 0} idle ` +
    `of ${report.expectedToday ?? 0} mid-course on ${report.date} · ` +
    `${blocks.length} blocks · ${report.joinees?.length ?? 0} rows in payload`,
);

// Mirrors `scheduled()` in src/index.ts. Every outcome the app produces is worth
// posting - a day with nobody mid-course is one line, a day where a live cohort
// went idle names them - so the only skip is a response carrying no blocks.
if (blocks.length === 0) {
  console.log("No blocks returned. Nothing to post — same as the cron would do.");
  process.exit(0);
}

if (preview) {
  console.log("\n--- message that would be posted ---\n");
  console.log(JSON.stringify({ blocks }, null, 2));
  console.log("\nPreview only. Nothing was sent.");
  process.exit(0);
}

const chunks = [];
for (let i = 0; i < blocks.length; i += MAX_BLOCKS) {
  chunks.push(blocks.slice(i, i + MAX_BLOCKS));
}

for (const [i, chunk] of chunks.entries()) {
  const post = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks: chunk }),
  });
  const body = await post.text();
  if (!post.ok) fail(`slack ${post.status}: ${body.slice(0, 300)}`);
  console.log(`→ posted chunk ${i + 1}/${chunks.length} (${chunk.length} blocks): ${body}`);
}

console.log("Done.");

function hint(status) {
  if (status === 403) {
    return (
      "403 means the token did not match. Set REPORT_TOKEN in the app's .env.local\n" +
      "to the same value used here, then restart the dev server. Env is read at boot."
    );
  }
  if (status === 404) return "404 means ADMIN_ENABLED is false in src/lib/dev-flags.ts.";
  if (status === 503) {
    return (
      '503 "not configured" means SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing.\n' +
      '503 "unreachable" is a network fault. If it is EAI_AGAIN, your DNS resolver\n' +
      "cannot answer for *.supabase.co. Check with: Resolve-DnsName <host> -Server 1.1.1.1"
    );
  }
  return "";
}

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

/** Yesterday as a YYYY-MM-DD IST date. Mirrors `istReportDate` in src/index.ts. */
function previousIstDay() {
  const dayBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    dayBefore,
  );
}
