import "server-only";

import { DAYS } from "@/content/onboarding/days";
import { ODPAC_STAGES, parseOdpacBody } from "@/content/onboarding/odpac";
import { PASS_THRESHOLD } from "@/content/onboarding/quiz";
import { UNASSIGNED_TEAM_LEADER } from "@/content/onboarding/team-leaders";

import type { AdminJoineeRow } from "./store";

/**
 * One day's cohort report, as Slack Block Kit.
 *
 * Read by one person on a phone at 9am the morning AFTER the day it covers, in
 * the gap before the next day unlocks at 10:30 - so it is built to be skimmed:
 * a headline count, then one card per joinee, then that joinee's ODPAC report
 * underneath it. Dividers do the separating - without them each joinee's
 * summary runs straight into the previous one's written work and the message
 * reads as a wall of text.
 *
 * Every date here is `forDate`, the day being reported on. Nothing in the copy
 * says "today", because to the reader it is yesterday - the caller decides which
 * day, and the scheduled worker always asks for the previous one.
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

/**
 * How long after their cohort date a joinee is still *expected* to be working.
 *
 * The course is three days; the rest absorbs holidays, a slow start, and a
 * joinee who begins mid-week. Past this window someone who never finished stops
 * being reported as idle - they are a roster problem by then, and naming them in
 * the channel every morning for a month is exactly how this report turns into
 * noise nobody reads.
 */
const EXPECTED_FOR_DAYS = 7;

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

/**
 * Did this joinee do ANYTHING on the day being reported?
 *
 * The whole activity list, not `lastActivityAt`. Asking whether the single most
 * recent timestamp lands inside the day silently drops anyone who was also
 * active later - and since this report runs at 09:00 the morning after, "later"
 * includes the reader's own morning. On 30 Aug 2026 the one joinee who had
 * passed the day's quiz was reported idle for precisely this reason, under a
 * headline saying nobody had done anything.
 */
function activeOn(row: AdminJoineeRow, start: number, end: number): boolean {
  return row.activityAt.some((at) => within(at, start, end));
}

/**
 * Their progress AS OF the end of the reported day, not right now.
 *
 * A report headed "Sun, 30 Aug" has to describe the 30th. Counting a day-1 pass
 * that happened on the Monday morning as though it had happened on the Sunday
 * puts joinees a day further along than they were, which is the difference
 * between "still on day 1 after three days" and "moving fine".
 */
function daysCompletedAsOf(row: AdminJoineeRow, end: number): number {
  return DAYS.filter((day) =>
    row.attemptsAt.some(
      (a) =>
        a.quizSlug === day.slug &&
        a.passed &&
        Number.isFinite(Date.parse(a.submittedAt)) &&
        Date.parse(a.submittedAt) < end,
    ),
  ).length;
}

/** Best mark per quiz among attempts sat by the end of the reported day. */
function quizBestAsOf(row: AdminJoineeRow, end: number): Record<string, string> {
  const best: Record<string, string> = {};
  for (const day of DAYS) {
    let top: { score: number; maxScore: number } | null = null;
    for (const a of row.attemptsAt) {
      if (a.quizSlug !== day.slug) continue;
      const at = Date.parse(a.submittedAt);
      if (!Number.isFinite(at) || at >= end) continue;
      if (!top || a.score > top.score) top = { score: a.score, maxScore: a.maxScore };
    }
    if (top) best[day.slug] = `${top.score}/${top.maxScore}`;
  }
  return best;
}

/** Had they started at all by the end of the reported day? */
function startedBy(row: AdminJoineeRow, end: number): boolean {
  return row.activityAt.some((at) => {
    const ms = Date.parse(at);
    return Number.isFinite(ms) && ms < end;
  });
}

export function buildDailyReport(rows: AdminJoineeRow[], forDate: string) {
  const { start, end } = istDayBounds(forDate);
  const active = rows
    .filter((row) => activeOn(row, start, end))
    // Highest first, so the cohort reads in the same order the leaderboard
    // shows it rather than in database order.
    .sort((a, b) => b.points - a.points);

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `Onboarding · ${readableDate(forDate)}` },
    },
  ];

  // Who *should* have been working: still mid-course, and still inside the
  // window where that is a reasonable expectation.
  const expected = expectedOn(rows, forDate);
  const activeEmails = new Set(active.map((row) => row.email));
  const idle = expected.filter((row) => !activeEmails.has(row.email));

  if (active.length === 0) {
    // Nobody mid-course at all - everyone finished and no new intake has
    // started. There is no one this report could be about, so it says so in one
    // line rather than implying that a cohort sat idle.
    if (expected.length === 0) {
      blocks.push(section("*No new joinees* — nobody is mid-course."));
      return emptyReport(forDate, rows, expected, idle, blocks);
    }

    // The opposite case, and the one worth waking up for: there IS a cohort
    // mid-course and not one of them touched it. Naming them is the whole point
    // - "no activity" alone gives the reader nothing to act on.
    blocks.push(
      context(
        `*0* of ${expected.length} joinee${expected.length === 1 ? "" : "s"} mid-course were active`,
      ),
    );
    blocks.push(
      section(
        `:warning:  *Nobody mid-course did anything on this day.*\n\n` +
          idle.map((row) => idleLine(row, forDate)).join("\n"),
      ),
    );
    return emptyReport(forDate, rows, expected, idle, blocks);
  }

  const filed = active.filter((row) => odpacOn(row, start, end).length > 0);
  const missing = active.filter((row) => odpacOn(row, start, end).length === 0);

  blocks.push(
    context(
      `*${active.length}* of ${rows.length} joinee${rows.length === 1 ? "" : "s"} active` +
        `   ·   ODPAC: *${filed.length}* filed, *${missing.length}* outstanding`,
    ),
  );
  if (missing.length > 0) {
    blocks.push(
      context(`:warning:  ODPAC not filed: ${missing.map(nameOf).join(", ")}`),
    );
  }
  // Someone mid-course who did nothing at all never reaches the cards below,
  // because those are built from `active`. Without this line they vanish from
  // the report entirely on the day it most matters that someone notices.
  if (idle.length > 0) {
    blocks.push(
      context(
        `:zzz:  No activity, still mid-course: ${idle.map(nameOf).join(", ")}`,
      ),
    );
  }

  for (const row of active) {
    blocks.push(divider());

    const reports = odpacOn(row, start, end);
    // A blank line under the name, and wide separators between the numbers.
    // Both are deliberate: this is the line that was unreadable when it was a
    // single run-on string.
    // Day count and quiz marks are as-of the reported day, for the same reason
    // the idle lines are. Points and the activity count are deliberately left
    // cumulative: they describe the person rather than the day, and a mentor
    // reading at 9am wants to know where they stand overall.
    const stats =
      `${row.points} pts   ·   ${daysCompletedAsOf(row, end)} of ${DAYS.length} days   ·   ` +
      `${row.activitiesDone} ${row.activitiesDone === 1 ? "activity" : "activities"}`;
    // The leader rides on the name line rather than a line of its own: it is
    // part of who this row is, and one more line per joinee is a whole extra
    // screen of scrolling on a phone once the cohort is real.
    const lines = [
      `*${nameOf(row)}*   ·   ${teamLeaderLabel(row)}`,
      "",
      stats,
    ];

    const quizzes = quizLine(row, end);
    if (quizzes) lines.push(`Quizzes:   ${quizzes}`);

    // The voucher only appears once it has been earned, and it goes on the
    // joinee's own card rather than in a list of its own: the team leader
    // redeems it in a conversation with that person, so the code belongs next
    // to their name and their scores, which is the context that conversation
    // needs. `store.ts` leaves it null until it is genuinely earned, so this
    // line can never quote a code to somebody who has not finished.
    if (row.voucherCode) {
      lines.push(`Voucher:   \`${row.voucherCode}\`  · ready to redeem`);
    }

    lines.push(
      reports.length > 0
        ? `ODPAC:   filed ${reports.map((r) => istTime(r.submittedAt)).join(", ")}`
        : "ODPAC:   *not filed*",
    );

    blocks.push(section(truncate(lines.join("\n"), BLOCK_CHARS)));

    // Short answers ride under the card as small grey text, so they do not
    // compete with the ODPAC report below them.
    for (const written of otherWritingOn(row, start, end)) {
      blocks.push(
        context(`_${written.key}_ — ${truncate(written.body, SHORT_EXERCISE_CHARS)}`),
      );
    }

    for (const report of reports) blocks.push(odpacBlock(report));
  }

  // `activeToday` counts activity on `forDate`, not on the day this is called.
  // The name is the published field the worker and dry-run script already read;
  // renaming it buys nothing and breaks a deployed worker mid-rollout.
  return {
    date: forDate,
    joinees: rows,
    activeToday: active.length,
    expectedToday: expected.length,
    idleToday: idle.length,
    slackBlocks: blocks,
  };
}

/* -------------------------------------------------------------------------- */

/**
 * The two no-activity outcomes share a shape; only their blocks differ.
 *
 * Both still publish `activeToday: 0`. The worker no longer decides anything
 * from that number - every case here is worth posting - but the admin desk and
 * the dry-run script both read it.
 */
function emptyReport(
  forDate: string,
  rows: AdminJoineeRow[],
  expected: AdminJoineeRow[],
  idle: AdminJoineeRow[],
  blocks: SlackBlock[],
) {
  return {
    date: forDate,
    joinees: rows,
    activeToday: 0,
    expectedToday: expected.length,
    idleToday: idle.length,
    slackBlocks: blocks,
  };
}

/**
 * Joinees who should plausibly have been working on `forDate`: still short of
 * finishing, and still inside `EXPECTED_FOR_DAYS` of their cohort date.
 *
 * A cohort date in the future relative to the reported day is excluded too - a
 * joinee cannot be idle on a day before they were due to start.
 */
function expectedOn(rows: AdminJoineeRow[], forDate: string): AdminJoineeRow[] {
  const day = Date.parse(`${forDate}T00:00:00+05:30`);
  if (!Number.isFinite(day)) return [];
  const end = day + 24 * 60 * 60 * 1000;

  return rows.filter((row) => {
    // As of that day, not as of now: somebody who finished the course the
    // following week was still mid-course on the day being reported.
    if (daysCompletedAsOf(row, end) >= DAYS.length) return false;
    const started = Date.parse(`${row.cohortDate}T00:00:00+05:30`);
    if (!Number.isFinite(started)) return false;
    const elapsed = (day - started) / 86_400_000;
    return elapsed >= 0 && elapsed <= EXPECTED_FOR_DAYS;
  });
}

/**
 * One idle joinee, as a line the reader can act on: who, how far in, how long
 * they have been on the roster, and whether they ever started at all.
 */
function idleLine(row: AdminJoineeRow, forDate: string): string {
  const end = Date.parse(`${forDate}T00:00:00+05:30`) + 24 * 60 * 60 * 1000;
  const onDay = Math.min(daysCompletedAsOf(row, end) + 1, DAYS.length);
  const elapsed = daysBetween(row.cohortDate, forDate);
  const joined =
    elapsed === 0
      ? "joined that day"
      : elapsed === 1
        ? "joined the day before"
        : `joined ${elapsed} days earlier`;
  const started = startedBy(row, end) ? "" : " · *never started*";
  return `•  *${nameOf(row)}* — day ${onDay} of ${DAYS.length}, ${joined}${started}`;
}

/** Whole IST days from `from` to `to`. Negative when `from` is later. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00+05:30`);
  const b = Date.parse(`${to}T00:00:00+05:30`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

type Written = AdminJoineeRow["exercises"][number];

/** ODPAC reports are stored under `dayN.odpac` - see `content/onboarding/odpac.ts`. */
function isOdpac(exerciseKey: string): boolean {
  return exerciseKey.endsWith(".odpac");
}

function odpacOn(row: AdminJoineeRow, start: number, end: number): Written[] {
  return row.exercises.filter(
    (e) => isOdpac(e.key) && within(e.submittedAt, start, end),
  );
}

function otherWritingOn(
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
 * The joinee's team leader, for the name line.
 *
 * `teamLeaderName` is already resolved against the live roster in `store.ts`, so
 * nothing here has to know about the roster. Two of its three cases are worth
 * printing rather than hiding:
 *
 * - **null** - no leader on file. Printed as "Unassigned" (the same word the
 *   admin desk uses) instead of omitted, because a joinee whose sign-in did not
 *   capture a leader is a gap someone should close, and a segment that silently
 *   disappears is indistinguishable from a rendering fault.
 * - **a raw id** - the leader was removed from the roster while joinees still
 *   point at them. `store.ts` falls back to the id on purpose; a visible slug is
 *   actionable in a way a blank is not.
 */
function teamLeaderLabel(row: AdminJoineeRow): string {
  return `Team leader: ${row.teamLeaderName ?? UNASSIGNED_TEAM_LEADER}`;
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
function quizLine(row: AdminJoineeRow, end: number): string | null {
  const parts: string[] = [];
  const bestByDay = quizBestAsOf(row, end);
  for (const day of DAYS) {
    const best = bestByDay[day.slug];
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
