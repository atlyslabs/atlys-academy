import { DAYS } from "@/content/onboarding/days";
import type { Day, DayId, QuizSlug } from "@/content/onboarding/types";
import { toLocalDateKey, unlockInstantAfter } from "@/lib/dates";
import { odpacExerciseKey } from "@/content/onboarding/odpac";
import {
  CALENDAR_GATE_ENABLED,
  DAY_GATE_ENABLED,
  ODPAC_GATE_ENABLED,
  STAMP_GATE_ENABLED,
} from "@/lib/dev-flags";
import { dayStampsComplete } from "./stamps";
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

/** Local date (`YYYY-MM-DD`) the quiz was *first* passed, or undefined. */
function firstPassDateKey(
  state: ProgressState,
  quizSlug: QuizSlug,
): string | undefined {
  const passed = state.attempts
    .filter((attempt) => attempt.quizSlug === quizSlug && attempt.passed)
    .map((attempt) => attempt.submittedAt)
    .sort();
  return passed[0] ? toLocalDateKey(passed[0]) : undefined;
}

/**
 * Day 1 is always open. Every later day needs the previous day finished -
 * its quiz passed at the required mark, and (when the stamp gate is on) its
 * whole passport page collected - and, when the calendar gate is on, only
 * from **10:30 the next morning**.
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
  if (!previous || !hasPassedQuiz(state, previous.slug)) return false;
  if (STAMP_GATE_ENABLED && !dayStampsComplete(state, previous.id)) return false;
  if (ODPAC_GATE_ENABLED && !hasFiledOdpac(state, previous.id)) return false;
  if (!CALENDAR_GATE_ENABLED || !gateKeyStr) return true;
  const passedOn = firstPassDateKey(state, previous.slug);
  return passedOn !== undefined && passedOn < gateKeyStr;
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
  const passedOn = firstPassDateKey(state, previous.slug);
  return passedOn ? unlockInstantAfter(passedOn) : null;
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
  if (!previous || !hasPassedQuiz(state, previous.slug)) return "quiz";
  if (STAMP_GATE_ENABLED && !dayStampsComplete(state, previous.id)) {
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
