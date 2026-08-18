import "server-only";

import { DAYS } from "@/content/onboarding/days";
import { ODPAC_STAGES, parseOdpacBody } from "@/content/onboarding/odpac";
import { PASS_THRESHOLD } from "@/content/onboarding/quiz";

import type { AdminJoineeRow } from "./store";

/**
 * The end-of-day report, as Slack Block Kit.
 *
 * Read by one person on a phone at 7pm, so it is built to be skimmed: a
 * headline count, then one card per joinee, then that joinee's ODPAC report
 * underneath it. Dividers do the separating - without them each joinee's
 * summary runs straight into the previous one's written work and the message
 * reads as a wall of text.
 */

type SlackText = { type: "mrkdwn" | "plain_text"; text: string };

interface SlackBlock {
  type: "header" | "section" | "context" | "divider";
  text?: SlackText;
  elements?: SlackText[];
}

const md = (text: string): SlackText => ({ type: "mrkdwn", text });
const section = (text: string): SlackBlock => ({ type: "section", text: md(text) });
const context = (text: string): SlackBlock => ({
  type: "context",
  elements: [md(text)],
});
const divider = (): SlackBlock => ({ type: "divider" });

/**
 * Slack rejects the whole message with a bare `invalid_blocks` if any single
 * section exceeds 3000 characters, so every block interpolating joinee text is
 * capped below that.
 */
const BLOCK_CHARS = 2800;

/**
 * Per stage, not per report. Truncating the whole ODPAC body at one limit let a
 * long Opening swallow the budget and drop Closing - and Authentication with
 * it, which carries the payment breakup the exercise exists to capture. A
 * per-stage cap guarantees all five stages arrive.
 */
const ODPAC_STAGE_CHARS = 240;

/** Short written answers stay inline under the card, so they stay short. */
const SHORT_EXERCISE_CHARS = 220;

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
  const active = rows
    .filter((row) => within(row.lastActivityAt, start, end))
    // Highest first, so the cohort reads in the same order the leaderboard
    // shows it rather than in database order.
    .sort((a, b) => b.points - a.points);

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `Onboarding · ${readableDate(forDate)}` },
    },
  ];

  if (active.length === 0) {
    blocks.push(section("No joinee activity today."));
    return { date: forDate, joinees: rows, activeToday: 0, slackBlocks: blocks };
  }

  const filed = active.filter((row) => odpacToday(row, start, end).length > 0);
  const missing = active.filter((row) => odpacToday(row, start, end).length === 0);

  blocks.push(
    context(
      `*${active.length}* of ${rows.length} joinee${rows.length === 1 ? "" : "s"} active` +
        `   ·   ODPAC: *${filed.length}* filed, *${missing.length}* outstanding`,
    ),
  );
  if (missing.length > 0) {
    blocks.push(
      context(`:warning:  No ODPAC yet: ${missing.map(nameOf).join(", ")}`),
    );
  }

  for (const row of active) {
    blocks.push(divider());

    const reports = odpacToday(row, start, end);
    // A blank line under the name, and wide separators between the numbers.
    // Both are deliberate: this is the line that was unreadable when it was a
    // single run-on string.
    const stats =
      `${row.points} pts   ·   ${row.daysCompleted} of ${DAYS.length} days   ·   ` +
      `${row.activitiesDone} ${row.activitiesDone === 1 ? "activity" : "activities"}`;
    const lines = [`*${nameOf(row)}*`, "", stats];

    const quizzes = quizLine(row);
    if (quizzes) lines.push(`Quizzes:   ${quizzes}`);

    lines.push(
      reports.length > 0
        ? `ODPAC:   filed ${reports.map((r) => istTime(r.submittedAt)).join(", ")}`
        : "ODPAC:   *not filed today*",
    );

    blocks.push(section(truncate(lines.join("\n"), BLOCK_CHARS)));

    // Short answers ride under the card as small grey text, so they do not
    // compete with the ODPAC report below them.
    for (const written of otherWritingToday(row, start, end)) {
      blocks.push(
        context(`_${written.key}_ — ${truncate(written.body, SHORT_EXERCISE_CHARS)}`),
      );
    }

    for (const report of reports) blocks.push(odpacBlock(report));
  }

  return {
    date: forDate,
    joinees: rows,
    activeToday: active.length,
    slackBlocks: blocks,
  };
}

/* -------------------------------------------------------------------------- */

type Written = AdminJoineeRow["exercises"][number];

/** ODPAC reports are stored under `dayN.odpac` - see `content/onboarding/odpac.ts`. */
function isOdpac(exerciseKey: string): boolean {
  return exerciseKey.endsWith(".odpac");
}

function odpacToday(row: AdminJoineeRow, start: number, end: number): Written[] {
  return row.exercises.filter(
    (e) => isOdpac(e.key) && within(e.submittedAt, start, end),
  );
}

function otherWritingToday(
  row: AdminJoineeRow,
  start: number,
  end: number,
): Written[] {
  return row.exercises.filter(
    (e) => !isOdpac(e.key) && within(e.submittedAt, start, end),
  );
}

function nameOf(row: AdminJoineeRow): string {
  return row.name ?? row.email;
}

/**
 * One ODPAC report as its own block: each stage under its own bold heading with
 * a blank line between, rather than five labels buried inside a blockquote.
 */
function odpacBlock(report: Written): SlackBlock {
  const heading = `*ODPAC · ${dayLabel(report.key)}*   ·   ${istTime(report.submittedAt)}`;
  const sections = parseOdpacBody(report.body);

  // `parseOdpacBody` hands an unlabelled body back under `opening` rather than
  // dropping it. Printing that as "Opening" would misattribute someone's work,
  // so an unrecognised body is shown whole and labelled as such.
  const labelled =
    Object.keys(sections).length > 1 ||
    report.body.startsWith(`${ODPAC_STAGES[0].label}:`);

  if (!labelled) {
    return section(
      truncate(`${heading}\n\n_unlabelled report_\n${report.body}`, BLOCK_CHARS),
    );
  }

  const body = ODPAC_STAGES.map((stage) => {
    const written = (sections[stage.id] ?? "").trim();
    const text = written ? truncate(written, ODPAC_STAGE_CHARS) : "_left blank_";
    return `*${stage.label}*\n${text}`;
  }).join("\n\n");

  return section(truncate(`${heading}\n\n${body}`, BLOCK_CHARS));
}

/** `day2.odpac` becomes `Day 2`. Falls back to the raw key on any other shape. */
function dayLabel(exerciseKey: string): string {
  const match = /^day(\d+)\./.exec(exerciseKey);
  return match ? `Day ${match[1]}` : exerciseKey;
}

/** Best score per day, in day order, ticked when it clears the pass mark. */
function quizLine(row: AdminJoineeRow): string | null {
  const parts: string[] = [];
  for (const day of DAYS) {
    const best = row.quizBest[day.slug];
    if (!best) continue;
    const [score, max] = best.split("/").map(Number);
    const passed =
      Number.isFinite(score) &&
      Number.isFinite(max) &&
      max > 0 &&
      score / max >= PASS_THRESHOLD;
    parts.push(`Day ${day.id} \`${best}\`${passed ? " ✓" : ""}`);
  }
  return parts.length > 0 ? parts.join("   ·   ") : null;
}

/** `Mon 17 Aug 2026` in IST - the reader's own calendar day. */
function readableDate(forDate: string): string {
  const at = Date.parse(`${forDate}T12:00:00+05:30`);
  if (!Number.isFinite(at)) return forDate;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(at);
}

/** `15:30` IST. The report is read in India; UTC would mislead. */
function istTime(iso: string): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
