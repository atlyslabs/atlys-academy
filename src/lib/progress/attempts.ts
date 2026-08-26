import type { DrillId, QuizSlug } from "@/content/onboarding/types";
import type { ProgressState } from "./types";

/**
 * How many goes a joinee gets, and what counts as having used one.
 *
 * Added Aug 2026. Quizzes and drills are both capped at three; the checklist is
 * not, because ticking a box is not an attempt at anything.
 *
 * The whole point of this module is that "how many tries are left" and "is this
 * thing finished with" are asked from four different places - the quiz runner,
 * every drill, the day gate, and the voucher - and they must not drift. The
 * terminal-status set in particular used to be written out twice, in `stamps.ts`
 * and `points.ts`, with a comment in each asking the reader to keep them in
 * sync. Both now import it from here.
 */

/** Attempts allowed at one day's quiz. */
export const MAX_QUIZ_ATTEMPTS = 3;

/** Plays allowed at one drill. */
export const MAX_DRILL_ATTEMPTS = 3;

/**
 * A drill counts as finished when it reaches one of these.
 *
 * `pause-10s` is the reason this is not simply "has a result": it stores
 * `"rushed"` when the joinee sends before the countdown, and rushing is
 * supposed to be a failure you feel. `apac-loop`, `mock-scenarios` and
 * `edge-cases` store `"in-progress"` until every round is played.
 */
export const TERMINAL_DRILL_STATUSES: ReadonlySet<string> = new Set([
  "passed",
  "complete",
]);

export function isTerminalDrillStatus(status: string | undefined): boolean {
  return status !== undefined && TERMINAL_DRILL_STATUSES.has(status);
}

/* -------------------------------------------------------------------------- */
/* Quizzes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Submitted attempts at one day's quiz.
 *
 * `state.attempts` is an append-only list of every submission, so this is just
 * a count - there is no separate counter that could disagree with the records
 * the score is computed from.
 */
export function quizAttemptsUsed(
  state: ProgressState,
  quizSlug: QuizSlug,
): number {
  return state.attempts.filter((attempt) => attempt.quizSlug === quizSlug)
    .length;
}

export function quizAttemptsLeft(
  state: ProgressState,
  quizSlug: QuizSlug,
): number {
  return Math.max(0, MAX_QUIZ_ATTEMPTS - quizAttemptsUsed(state, quizSlug));
}

/** No goes left. Says nothing about whether they passed. */
export function quizExhausted(
  state: ProgressState,
  quizSlug: QuizSlug,
): boolean {
  return quizAttemptsLeft(state, quizSlug) === 0;
}

export function quizPassed(state: ProgressState, quizSlug: QuizSlug): boolean {
  return state.attempts.some(
    (attempt) => attempt.quizSlug === quizSlug && attempt.passed,
  );
}

/**
 * The quiz is done with, one way or the other: passed, or all three goes used.
 *
 * This is the predicate the day gate and the voucher hang off, and it is
 * deliberately NOT "passed". With a hard cap, gating on a pass would mean a
 * joinee who failed three times could never open the next day and never finish
 * the academy - locked out by the app with no way back in. So the agreed policy
 * is that the best attempt counts and the day opens anyway.
 *
 * The 70% mark still means something: it decides whether the *stamp* is earned,
 * so a passport shows honestly who cleared the bar. What it no longer does is
 * trap anybody. See `dayFinished` in `selectors.ts`.
 */
export function quizSettled(
  state: ProgressState,
  quizSlug: QuizSlug,
): boolean {
  return quizPassed(state, quizSlug) || quizExhausted(state, quizSlug);
}

/* -------------------------------------------------------------------------- */
/* Drills                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Plays used on one drill.
 *
 * `DrillResult.attempts` is optional, and the fallback is what makes this safe
 * for joinees who were already part-way through when the cap shipped: a stored
 * result with no count is read as ONE play used, not three. They keep two goes
 * rather than being retroactively locked out of a drill they had done once.
 *
 * Counting up from the stored number rather than down from the cap also means
 * raising `MAX_DRILL_ATTEMPTS` later hands everyone their extra goes for free.
 */
export function drillAttemptsUsed(
  state: ProgressState,
  drillId: DrillId,
): number {
  const result = state.drills[drillId];
  if (!result) return 0;
  return result.attempts ?? 1;
}

export function drillAttemptsLeft(
  state: ProgressState,
  drillId: DrillId,
): number {
  return Math.max(0, MAX_DRILL_ATTEMPTS - drillAttemptsUsed(state, drillId));
}

/** No plays left. The replay control hides on this. */
export function drillExhausted(
  state: ProgressState,
  drillId: DrillId,
): boolean {
  return drillAttemptsLeft(state, drillId) === 0;
}

/**
 * Whether a replay is still allowed.
 *
 * Separate from `drillExhausted` because a drill mid-play has not used its
 * next go yet - the count goes up when a new attempt is *started*, so asking
 * "can I start another" is the honest question for a button.
 */
export function canReplayDrill(
  state: ProgressState,
  drillId: DrillId,
): boolean {
  return drillAttemptsLeft(state, drillId) > 0;
}

/**
 * The drill is done with: finished properly, or all three plays used.
 *
 * Same shape as `quizSettled` and for the same reason. `pause-10s` can end
 * `"rushed"` three times over, and without this the drill's stamp would never
 * be earned, the day's sheet would never complete, and the stamp gate would
 * hold that joinee on Day 1 forever.
 */
export function drillSettled(
  state: ProgressState,
  drillId: DrillId,
): boolean {
  const result = state.drills[drillId];
  return isTerminalDrillStatus(result?.status) || drillExhausted(state, drillId);
}
