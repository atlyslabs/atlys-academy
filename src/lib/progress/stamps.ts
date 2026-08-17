import { DAYS } from "@/content/onboarding/days";
import { LESSONS } from "@/content/onboarding/lessons";
import { TOOLS } from "@/content/onboarding/tools";
import type { DayId, DrillId } from "@/content/onboarding/types";
import type { ProgressState } from "./types";

/**
 * Passport stamps - the souvenir a joinee collects for each thing they finish.
 *
 * Like points, stamps are a **pure function of progress state**: nothing is
 * stored, so a stamp can never be awarded twice, go stale, or disagree with the
 * progress it represents. Recomputing is the only source of truth.
 *
 * This module deliberately imports no selectors. It derives quiz passes itself
 * from `state.attempts`, which keeps the dependency one-way - `selectors.ts`
 * imports *this*, so the day gate can require a full sheet without a cycle.
 *
 * The rule that matters most: **a stamp must be obtainable.** 14 of 24 lessons
 * are still placeholders awaiting Shovan's content, and a placeholder has no
 * "mark as read" control - so counting it would make its day impossible to
 * complete. Only lessons with a written body count, and a day with none gets no
 * reading stamp at all rather than an uncollectable one.
 */

export type StampKind = "reading" | "activities" | "tools" | "drill" | "quiz";

export interface Stamp {
  /** Stable id, e.g. `"day2.drill.pause-10s"`. Derived, never persisted. */
  id: string;
  dayId: DayId;
  kind: StampKind;
  /** Printed across the stamp face. Short enough for a rubber stamp. */
  label: string;
  /** What earns it - used for the tooltip and the accessible name. */
  requirement: string;
  earned: boolean;
}

/** A drill counts once it reaches a terminal status. Matches `points.ts`. */
const TERMINAL_DRILL_STATUSES = new Set(["passed", "complete"]);

/** Stamp face wording per drill. Keeps the desk and the passport consistent. */
const DRILL_STAMP_LABELS: Partial<Record<DrillId, string>> = {
  "pause-10s": "Gate hold",
  "dos-donts": "Screened",
  "rewrite-chat": "Rebooked",
  "objection-library": "Fare rules",
  "mock-scenarios": "Counter",
  "tool-match": "Baggage",
  "ownership-sort": "Control",
  "ownership-run": "Fast track",
  "connect-islands": "Routed",
  // Wired up with the day-desk redesign; before it these three drills were
  // unreachable and their stamps printed the generic face.
  "flag-swipe": "Red flags",
  "anxiety-wall": "Calmed",
  "reframe-deck": "Reframed",
};

function hasPassed(state: ProgressState, quizSlug: string): boolean {
  return state.attempts.some(
    (attempt) => attempt.quizSlug === quizSlug && attempt.passed,
  );
}

/** Lessons a joinee can actually finish - placeholders are not collectable. */
function readableLessons(dayId: DayId) {
  return LESSONS.filter((lesson) => lesson.dayId === dayId && lesson.body);
}

/**
 * Every stamp on one day's page, in the order they print.
 *
 * Days differ: only Day 1 issues a travel-kit stamp, drill stamps follow
 * whatever `days.ts` lists, and the reading stamp appears only where lessons
 * have been written.
 */
export function stampsForDay(state: ProgressState, dayId: DayId): Stamp[] {
  const day = DAYS.find((candidate) => candidate.id === dayId);
  if (!day) return [];

  const stamps: Stamp[] = [];
  const lessons = readableLessons(dayId);

  if (lessons.length > 0) {
    stamps.push({
      id: `${day.slug}.reading`,
      dayId,
      kind: "reading",
      label: "Reading",
      requirement: `Read all ${lessons.length} in-flight pages`,
      earned: lessons.every((lesson) => lesson.itemKey in state.completedItems),
    });
  }

  if (day.activities.length > 0) {
    stamps.push({
      id: `${day.slug}.activities`,
      dayId,
      kind: "activities",
      label: "Checklist",
      requirement: `File all ${day.activities.length} trip-checklist items`,
      earned: day.activities.every(
        (activity) => activity.key in state.completedItems,
      ),
    });
  }

  // The travel kit is a Day 1 concern only - tool access is requested once.
  if (dayId === 1) {
    stamps.push({
      id: `${day.slug}.tools`,
      dayId,
      kind: "tools",
      label: "Travel kit",
      requirement: `Request all ${TOOLS.length} tool accesses`,
      earned: TOOLS.every((tool) => tool.key in state.completedItems),
    });
  }

  for (const drillId of day.drills) {
    const result = state.drills[drillId];
    stamps.push({
      id: `${day.slug}.drill.${drillId}`,
      dayId,
      kind: "drill",
      label: DRILL_STAMP_LABELS[drillId] ?? "Drill",
      requirement: "Finish the drill",
      earned: Boolean(result && TERMINAL_DRILL_STATUSES.has(result.status)),
    });
  }

  stamps.push({
    id: `${day.slug}.quiz`,
    dayId,
    kind: "quiz",
    label: "Boarded",
    requirement: "Pass the day's quiz at 70%",
    earned: hasPassed(state, day.slug),
  });

  return stamps;
}

export interface StampSheet {
  dayId: DayId;
  stamps: Stamp[];
  earned: number;
  total: number;
  /** Every stamp on the page collected. */
  complete: boolean;
}

export function stampSheet(state: ProgressState, dayId: DayId): StampSheet {
  const stamps = stampsForDay(state, dayId);
  const earned = stamps.filter((stamp) => stamp.earned).length;
  return {
    dayId,
    stamps,
    earned,
    total: stamps.length,
    // `every` on an empty list is true, which would silently pass a day with
    // no stamps at all - require at least one so that cannot happen.
    complete: stamps.length > 0 && earned === stamps.length,
  };
}

/** Whether the day's page is fully stamped. The souvenir completion rule. */
export function dayStampsComplete(
  state: ProgressState,
  dayId: DayId,
): boolean {
  return stampSheet(state, dayId).complete;
}

/** Every sheet, for the passport view. */
export function allStampSheets(state: ProgressState): StampSheet[] {
  return DAYS.map((day) => stampSheet(state, day.id));
}

export interface StampTotals {
  earned: number;
  total: number;
  /** Days whose page is fully stamped. */
  daysComplete: number;
}

export function stampTotals(state: ProgressState): StampTotals {
  const sheets = allStampSheets(state);
  return {
    earned: sheets.reduce((sum, sheet) => sum + sheet.earned, 0),
    total: sheets.reduce((sum, sheet) => sum + sheet.total, 0),
    daysComplete: sheets.filter((sheet) => sheet.complete).length,
  };
}
