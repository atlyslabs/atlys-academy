import { DAYS, LAST_DAY_ID } from "@/content/onboarding/days";
import { quizSettled } from "./attempts";
import { hasFiledOdpac } from "./selectors";
import type { ProgressState } from "./types";

/**
 * Has this joinee earned the end-of-academy voucher?
 *
 * Three conditions, on the final day only:
 *
 * 1. every one of that day's checklist activities ticked,
 * 2. the day's ODPAC shadowing report filed,
 * 3. the day's quiz settled - passed, or all three attempts used.
 *
 * Condition 3 is `quizSettled` rather than `quizPassed` on purpose, and it is
 * the one worth arguing about. With attempts capped at three, gating the
 * voucher on a pass would mean a joinee who missed 70% three times finishes the
 * academy with nothing to show and no way to earn it - the same trap the day
 * gate had to be rewritten to avoid. The agreed policy is that the voucher
 * marks *finishing*, and the redemption conversation with the team leader is
 * where a weak finish gets discussed. The report the team leader reads carries
 * the actual scores.
 *
 * Deliberately NOT required: the reading, and the drills. The brief was "all
 * activities and the ODPAC report, after the Day 3 quiz", so requiring a full
 * stamp sheet would be inventing a stricter rule than was asked for. Use
 * `dayStampsComplete` if that ever becomes the intent.
 *
 * Pure, and in `lib/progress` rather than `server/`, because both sides need
 * it: the client decides whether to show the card, and the API decides whether
 * to hand over a code. The API's answer is the authoritative one - a joinee who
 * edits their local state into thinking they qualified still gets nothing back.
 */
export function hasEarnedVoucher(state: ProgressState): boolean {
  const finalDay = DAYS.find((day) => day.id === LAST_DAY_ID);
  if (!finalDay) return false;

  const everyActivityDone = finalDay.activities.every(
    (activity) => activity.key in state.completedItems,
  );
  if (!everyActivityDone) return false;
  if (!hasFiledOdpac(state, finalDay.id)) return false;
  return quizSettled(state, finalDay.slug);
}

/** What is still outstanding, so the card can say so instead of just hiding. */
export function voucherBlockers(state: ProgressState): string[] {
  const finalDay = DAYS.find((day) => day.id === LAST_DAY_ID);
  if (!finalDay) return ["The final day is not configured."];

  const blockers: string[] = [];
  const outstanding = finalDay.activities.filter(
    (activity) => !(activity.key in state.completedItems),
  ).length;
  if (outstanding > 0) {
    // The plural follows the TOTAL, not the outstanding count: "1 of 4
    // checklist item" is wrong, because the noun being counted by "of 4" is
    // the four, not the one.
    blockers.push(
      `${outstanding} of ${finalDay.activities.length} Day ${finalDay.id} checklist ${
        finalDay.activities.length === 1 ? "item" : "items"
      } still to file`,
    );
  }
  if (!hasFiledOdpac(state, finalDay.id)) {
    blockers.push(`Day ${finalDay.id} ODPAC report not filed`);
  }
  if (!quizSettled(state, finalDay.slug)) {
    blockers.push(`Day ${finalDay.id} quiz not taken yet`);
  }
  return blockers;
}
