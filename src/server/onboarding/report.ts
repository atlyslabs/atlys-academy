import "server-only";

import type { AdminJoineeRow } from "./store";

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
}

/** Today as a YYYY-MM-DD IST calendar date. `en-CA` formats in that order. */
export function istToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now);
}

function istDayBounds(forDate: string): { start: number; end: number } {
  const start = Date.parse(`${forDate}T00:00:00+05:30`);
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

function within(timestamp: string | null | undefined, start: number, end: number) {
  if (!timestamp) return false;
  const at = Date.parse(timestamp);
  return Number.isFinite(at) && at >= start && at < end;
}

export function buildDailyReport(rows: AdminJoineeRow[], forDate: string) {
  const { start, end } = istDayBounds(forDate);
  const active = rows.filter((row) => within(row.lastActivityAt, start, end));

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Onboarding daily report, ${forDate}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: active.length
          ? `*${active.length}* joinee${active.length === 1 ? "" : "s"} active today.`
          : "No joinee activity today.",
      },
    },
  ];

  for (const row of active) {
    const quizzes =
      Object.entries(row.quizBest)
        .map(([slug, score]) => `${slug} ${score}`)
        .join(" · ") || "no quizzes yet";
    const latestWriting = row.exercises
      .filter((e) => within(e.submittedAt, start, end))
      .map((e) => `\n>• _${e.key}_: ${truncate(e.body, 280)}`)
      .join("");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*${row.name ?? row.email}*: ${row.points} pts · ` +
          `${row.daysCompleted}/5 days · ${row.activitiesDone} activities\n` +
          `Quizzes: ${quizzes}${latestWriting}`,
      },
    });
  }

  return {
    date: forDate,
    joinees: rows,
    activeToday: active.length,
    slackBlocks: blocks,
  };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
