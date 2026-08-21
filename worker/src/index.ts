interface Env {
  APP_URL: string;
  REPORT_TOKEN: string;
  SLACK_WEBHOOK_URL: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

interface DailyReport {
  date: string;
  /** Joinees active on `date` - the reported day, not the day this runs. */
  activeToday: number;
  slackBlocks?: unknown[];
}

/** Cloudflare's cron argument. Only the scheduled instant is used. */
interface ScheduledController {
  /**
   * ms since epoch. Optional here, though the real cron always supplies it: the
   * local `__scheduled` test endpoint is not obliged to.
   */
  scheduledTime?: number;
}

const MAX_BLOCKS = 45;

const worker = {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const forDate = istReportDate(controller);
    try {
      const report = await fetchReport(env, forDate);
      const blocks = report.slackBlocks ?? [];

      for (const chunk of chunked(blocks, MAX_BLOCKS)) {
        await postToSlack(env, { blocks: chunk });
      }
      console.log(`posted ${blocks.length} blocks for ${report.date}`);
    } catch (error) {

      const detail = error instanceof Error ? error.message : String(error);
      // Name the day. Cron runs are not retried, so this message is the only
      // notice that a specific day is missing and needs a manual backfill -
      // `REPORT_DATE=<that day> node scripts/dry-run.mjs`.
      await postToSlack(env, {
        text: `:warning: Onboarding report for ${forDate} failed: ${detail}`,
      }).catch(() => {

      });
      throw error;
    }
  },
};

export default worker;


/**
 * The IST calendar day this run reports on: the day BEFORE the one it fires in.
 *
 * The cron fires at 09:00 IST and covers the previous working day, so Day 1's
 * report is in the channel before Day 2 opens at 10:30. Asking for "today" at
 * 9am would report a day that is 30 minutes old and empty.
 *
 * Anchored to `scheduledTime`, not `Date.now()`: a run that starts late - queued,
 * retried by hand, or fired minutes after midnight IST - still reports the day
 * the schedule meant. India has no DST, so subtracting 24h from an instant always
 * lands on the previous IST calendar day at the same IST wall-clock time.
 */
function istReportDate(controller: ScheduledController): string {
  // `||`, not `??`: a missing instant arrives as either undefined or 0 depending
  // on the caller, and epoch 0 would report a day in 1969.
  const firedAt = controller.scheduledTime || Date.now();
  const dayBefore = new Date(firedAt - 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(dayBefore);
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

    throw new Error(`slack ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

function chunked<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
