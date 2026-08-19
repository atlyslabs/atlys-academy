import { DAYS } from "@/content/onboarding/days";
import { stampsForDay } from "@/lib/progress/stamps";
import { emptyProgress } from "@/lib/progress/types";
import { STAMP_SPRITES, spriteFor, type StampSprite } from "./stamp-sprites";

/**
 * The passport-wide face plan: which sprite every stamp prints.
 *
 * The sheet was drawn FOR this passport - twenty-five bespoke faces in page
 * order, each carrying its stamp's own word - so the plan is a straight walk:
 * the Nth stamp across Day 1 → Day 3 prints the sheet's Nth face. No hashing,
 * no collision probing; every stamp everywhere has its own face by
 * construction.
 *
 * Stamp identity is static - which stamps a day issues never depends on
 * progress - so the plan is computed once at module load, identically on
 * server and client. If content ever grows a stamp the sheet does not have,
 * the walk stops matching there and `faceForStamp` falls back to a hashed
 * face for the strays: wrong art beats a blank slot until the sheet is
 * regenerated (and this file's assumption re-checked) - see the numbered
 * list in stamp-sprites.ts.
 */

const FACE_PLAN: ReadonlyMap<string, StampSprite> = (() => {
  const plan = new Map<string, StampSprite>();
  const empty = emptyProgress();
  let cell = 0;

  for (const day of DAYS) {
    for (const stamp of stampsForDay(empty, day.id)) {
      if (cell >= STAMP_SPRITES.length) return plan;
      plan.set(stamp.id, STAMP_SPRITES[cell]);
      cell += 1;
    }
  }

  return plan;
})();

/** The planned face for a stamp; hashed fallback for ids beyond the sheet. */
export function faceForStamp(stampId: string): StampSprite {
  return FACE_PLAN.get(stampId) ?? spriteFor(stampId);
}
