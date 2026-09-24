import type { DayId } from "@/content/onboarding/types";
import { stampSheet } from "./stamps";
import type { ProgressState } from "./types";

/**
 * Why a day is nudging about its ODPAC report, or `null` for not yet.
 *
 * - `halfway` - the day is half done and the report has not been started.
 * - `only-thing-left` - everything except the quiz is finished, so the report
 *   is the single thing standing between the joinee and the gate.
 */
export type OdpacNudgeReason = "halfway" | "only-thing-left";

/**
 * Should this day nudge about its ODPAC report?
 *
 * Derived entirely from the day's stamp sheet, which is itself derived from
 * progress - so this reads state and writes nothing. No new field, no new row,
 * nothing to sync: the nudge cannot alter a joinee's progress or anything in
 * Supabase, by construction.
 *
 * The sheet is the right basis rather than a hand-rolled count, because it is
 * already the app's definition of "the work on this day" - reading, checklist,
 * the travel kit on Day 3, every drill, the report, the quiz. Add a drill and
 * the denominator moves on its own.
 *
 * Ordering matters: `only-thing-left` is also "at least half", so it is tested
 * first. Both states deliberately ignore the quiz, because the quiz is the way
 * OUT of the day and the report is a prerequisite for it - telling someone to
 * write their report while the quiz is still ahead of them is the useful
 * moment; telling them after they have passed it is too late to change what
 * they wrote.
 */
export function odpacNudge(
  state: ProgressState,
  dayId: DayId,
): OdpacNudgeReason | null {
  const sheet = stampSheet(state, dayId);

  const report = sheet.stamps.find((stamp) => stamp.kind === "odpac");
  // Filed already, or a day that issues no report at all - nothing to nudge.
  if (!report || report.earned) return null;

  const others = sheet.stamps.filter((stamp) => stamp.kind !== "odpac");
  if (others.length === 0) return null;

  const beforeTheQuiz = others.filter((stamp) => stamp.kind !== "quiz");
  if (
    beforeTheQuiz.length > 0 &&
    beforeTheQuiz.every((stamp) => stamp.earned)
  ) {
    return "only-thing-left";
  }

  // Integer maths rather than a 0.5 float, so "half of five" is three and the
  // nudge never fires a stamp early on an odd-sized day.
  const earned = others.filter((stamp) => stamp.earned).length;
  return earned * 2 >= others.length ? "halfway" : null;
}
