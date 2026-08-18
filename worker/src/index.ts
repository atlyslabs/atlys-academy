interface Env {
  APP_URL: string;
  REPORT_TOKEN: string;
  SLACK_WEBHOOK_URL: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

interface DailyReport {
  date: string;
  activeToday: number;
  slackBlocks?: unknown[];
}


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

      const detail = error instanceof Error ? error.message : String(error);
      await postToSlack(env, {
        text: `:warning: Onboarding daily report failed: ${detail}`,
      }).catch(() => {
        
      });
      throw error; 
    }
  },
};

export default worker;


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
