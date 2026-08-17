interface Env {
  /** Deployed app origin, e.g. https://onboarding.atlys.com. From [vars]. */
  APP_URL: string;
  /** Shared secret; must equal REPORT_TOKEN in the app's env. */
  REPORT_TOKEN: string;
  /** Slack incoming webhook. A credential with the secret in the path. */
  SLACK_WEBHOOK_URL: string;
  /** Optional Cloudflare Access service token, if the app sits behind Access. */
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

interface DailyReport {
  date: string;
  activeToday: number;
  slackBlocks?: unknown[];
}

/** Slack's hard ceiling is 50 blocks per message. Leave headroom. */
const MAX_BLOCKS = 45;

const worker = {
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    try {
      const report = await fetchReport(env, istToday());
      const blocks = report.slackBlocks ?? [];

      for (const chunk of chunked(blocks, MAX_BLOCKS)) {
        await postToSlack(env, { blocks: chunk });
      }
      console.log(`posted ${blocks.length} blocks for ${report.date}`);
    } catch (error) {
      // Cloudflare does not retry cron invocations, so a swallowed failure is a
      // report that silently never arrives, and silence is indistinguishable
      // from a quiet cohort. Say so in the channel instead.
      const detail = error instanceof Error ? error.message : String(error);
      await postToSlack(env, {
        text: `:warning: Onboarding daily report failed: ${detail}`,
      }).catch(() => {
        // Slack is down too. Nothing left but the log.
      });
      throw error; // surface it in Workers Logs as a failed invocation
    }
  },
};

export default worker;

/**
 * Today as an IST calendar date. The report covers an Indian working day, and
 * the worker runs on UTC, so this must be explicit rather than implied.
 */
function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

async function fetchReport(env: Env, date: string): Promise<DailyReport> {
  const headers: Record<string, string> = {
    "x-report-token": env.REPORT_TOKEN,
  };
  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
  }

  const url = `${env.APP_URL}/api/onboarding/admin/daily-report?date=${date}`;
  const res = await fetch(url, { headers });
  const body = await res.text();

  if (!res.ok) throw new Error(`report ${res.status}: ${body.slice(0, 300)}`);

  // A Cloudflare Access login page is HTML and still arrives with a 200, so
  // check the shape rather than trusting the status code.
  try {
    return JSON.parse(body) as DailyReport;
  } catch {
    throw new Error(
      `report returned non-JSON (behind Cloudflare Access?): ${body.slice(0, 200)}`,
    );
  }
}

async function postToSlack(env: Env, payload: unknown): Promise<void> {
  const res = await fetch(env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // Slack answers 400 `invalid_blocks` rather than describing the problem, so
    // keep the body, it is the only clue.
    throw new Error(`slack ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

function chunked<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
