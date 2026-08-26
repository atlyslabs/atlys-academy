import { DAYS } from "@/content/onboarding/days";
import type { Day, DayId, DrillId, QuizSlug } from "@/content/onboarding/types";
import { toLocalDateKey, unlockInstantAfter } from "@/lib/dates";
import { odpacExerciseKey } from "@/content/onboarding/odpac";
import {
  CALENDAR_GATE_ENABLED,
  DAY_GATE_ENABLED,
  ODPAC_GATE_ENABLED,
  STAMP_GATE_ENABLED,
} from "@/lib/dev-flags";
import { drillSettled, quizSettled } from "./attempts";
import { stampSheet } from "./stamps";
import type { ProgressState, QuizAttemptRecord } from "./types";

/** The highest-scoring submitted attempt for a quiz, or `undefined`. */
export function bestAttempt(
  state: ProgressState,
  quizSlug: QuizSlug,
): QuizAttemptRecord | undefined {
  return state.attempts
    .filter((attempt) => attempt.quizSlug === quizSlug)
    .reduce<QuizAttemptRecord | undefined>(
      (best, attempt) =>
        !best || attempt.score > best.score ? attempt : best,
      undefined,
    );
}

export function hasPassedQuiz(
  state: ProgressState,
  quizSlug: QuizSlug,
): boolean {
  return state.attempts.some(
    (attempt) => attempt.quizSlug === quizSlug && attempt.passed,
  );
}

/**
 * Local date (`YYYY-MM-DD`) the quiz stopped being open to the joinee: the day
 * they first passed it, or - if they never did - the day they used their last
 * attempt. Undefined while goes remain and none has passed.
 *
 * The calendar gate counts its "next morning" from this. Using the first PASS
 * would leave a joinee who exhausted three attempts with no date to count from,
 * so `dayUnlockInstant` would return null and the next day would never open.
 */
function quizSettledDateKey(
  state: ProgressState,
  quizSlug: QuizSlug,
): string | undefined {
  const mine = state.attempts
    .filter((attempt) => attempt.quizSlug === quizSlug)
    .map((attempt) => attempt.submittedAt)
    .sort();
  const passed = state.attempts
    .filter((attempt) => attempt.quizSlug === quizSlug && attempt.passed)
    .map((attempt) => attempt.submittedAt)
    .sort();
  if (passed[0]) return toLocalDateKey(passed[0]);
  if (!quizSettled(state, quizSlug)) return undefined;
  // Exhausted without passing: the last submission is when it closed.
  const last = mine[mine.length - 1];
  return last ? toLocalDateKey(last) : undefined;
}

/**
 * Day 1 is always open. Every later day needs the previous day finished - its
 * quiz settled (passed, or all three attempts used), and (when the stamp gate is
 * on) its work finished - and, when the calendar gate is on, only from
 * **10:30 the next morning**.
 *
 * "Settled" rather than "passed" throughout, since attempts became finite: see
 * `quizSettled` in `attempts.ts` for why gating on a pass would trap people.
 *
 * `gateKeyStr` is passed in rather than read from the clock so the selector
 * stays pure; components get it from `gateDayKey()` in `lib/dates`, whose
 * calendar rolls over at 10:30 local rather than midnight. Comparing plain
 * date keys against that shifted key is what makes "the next day at 10:30"
 * fall out of a one-line string comparison.
 */
export function isDayUnlocked(
  state: ProgressState,
  dayId: DayId,
  gateKeyStr?: string,
): boolean {
  if (!DAY_GATE_ENABLED) return true;
  if (dayId === 1) return true;
  const previous = DAYS.find((day) => day.id === dayId - 1);
  if (!previous) return false;
  // `quizSettled`, not `hasPassedQuiz`. With three attempts and no more, gating
  // on a pass would wall a joinee in permanently - see `attempts.ts`.
  if (!quizSettled(state, previous.slug)) return false;
  if (STAMP_GATE_ENABLED && !dayWorkFinished(state, previous.id)) return false;
  if (ODPAC_GATE_ENABLED && !hasFiledOdpac(state, previous.id)) return false;
  if (!CALENDAR_GATE_ENABLED || !gateKeyStr) return true;
  const settledOn = quizSettledDateKey(state, previous.slug);
  return settledOn !== undefined && settledOn < gateKeyStr;
}

/**
 * The day's work is finished with - every stamp either earned, or its
 * underlying thing out of attempts.
 *
 * This is the stamp gate's question, and it is deliberately weaker than
 * `dayStampsComplete`. That one asks "is the passport page full", which is the
 * right question for a souvenir and the wrong one for a gate: a joinee who
 * rushed the pause drill three times, or missed 70% three times, has an
 * unearnable stamp and would be held on that day forever.
 *
 * Reading, the checklist, the travel kit and the report have no attempt limit,
 * so they must still actually be done. Only the drill and quiz stamps - the two
 * capped things - are allowed to be settled-but-unearned.
 */
export function dayWorkFinished(state: ProgressState, dayId: DayId): boolean {
  const day = DAYS.find((candidate) => candidate.id === dayId);
  if (!day) return false;
  const sheet = stampSheet(state, dayId);
  if (sheet.stamps.length === 0) return false;
  for (const stamp of sheet.stamps) {
    if (stamp.earned) continue;
    if (stamp.kind === "quiz" && quizSettled(state, day.slug)) continue;
    if (stamp.kind === "drill") {
      // Stamp ids are `${slug}.drill.${drillId}` - see `stamps.ts`.
      const drillId = stamp.id.slice(`${day.slug}.drill.`.length) as DrillId;
      if (drillSettled(state, drillId)) continue;
    }
    return false;
  }
  return true;
}

/**
 * When a still-sealed day's clock gate breaks: 10:30 local on the morning
 * after the previous day's quiz was first passed. `null` while the previous
 * day is unfinished (there is no date to count from yet), and for Day 1.
 */
export function dayUnlockInstant(
  state: ProgressState,
  dayId: DayId,
): Date | null {
  const previous = DAYS.find((day) => day.id === dayId - 1);
  if (!previous) return null;
  const settledOn = quizSettledDateKey(state, previous.slug);
  return settledOn ? unlockInstantAfter(settledOn) : null;
}

/**
 * Why a day is still locked - so the roadmap can name the missing thing rather
 * than showing a generic padlock. Ordered by what the joinee has to do next.
 */
export function dayLockReason(
  state: ProgressState,
  dayId: DayId,
  gateKeyStr?: string,
): "quiz" | "stamps" | "odpac" | "tomorrow" | null {
  if (isDayUnlocked(state, dayId, gateKeyStr)) return null;
  const previous = DAYS.find((day) => day.id === dayId - 1);
  // Mirrors `isDayUnlocked` exactly, in the same order, so the padlock never
  // names a reason the gate is not actually blocking on.
  if (!previous || !quizSettled(state, previous.slug)) return "quiz";
  if (STAMP_GATE_ENABLED && !dayWorkFinished(state, previous.id)) {
    return "stamps";
  }
  if (ODPAC_GATE_ENABLED && !hasFiledOdpac(state, previous.id)) return "odpac";
  return "tomorrow";
}

/** Whether a day's ODPAC shadowing report has been filed. */
export function hasFiledOdpac(state: ProgressState, dayId: DayId): boolean {
  return odpacExerciseKey(dayId) in state.exercises;
}

export function isItemDone(state: ProgressState, itemKey: string): boolean {
  return itemKey in state.completedItems;
}

export interface ChecklistProgress {
  done: number;
  total: number;
}

/** Checklist completion for one day. Does not include the quiz. */
export function dayChecklistProgress(
  state: ProgressState,
  day: Day,
): ChecklistProgress {
  const done = day.activities.filter((activity) =>
    isItemDone(state, activity.key),
  ).length;
  return { done, total: day.activities.length };
}

/** How many days have had their quiz passed. */
export function daysCompleted(state: ProgressState): number {
  return DAYS.filter((day) => hasPassedQuiz(state, day.slug)).length;
}

/** The day the joinee should land on when they return. */
export function resumeDay(state: ProgressState, gateKeyStr?: string): DayId {
  const furthestUnlocked = [...DAYS]
    .reverse()
    .find((day) => isDayUnlocked(state, day.id, gateKeyStr));
  const furthest = furthestUnlocked?.id ?? 1;
  // Prefer where they actually were, as long as it is still reachable.
  return isDayUnlocked(state, state.lastVisitedDay, gateKeyStr)
    ? state.lastVisitedDay
    : furthest;
}
