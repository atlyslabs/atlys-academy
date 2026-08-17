import { DAYS } from "@/content/onboarding/days";
import { stampsForDay, type StampKind } from "@/lib/progress/stamps";
import { emptyProgress } from "@/lib/progress/types";
import {
  STAMP_SPRITES,
  spriteFor,
  spriteIndexFor,
  type StampSprite,
} from "./stamp-sprites";

/**
 * The passport-wide face plan: which sprite every stamp prints.
 *
 * Two rules, applied day by day in page order:
 *
 *  1. A page never prints the same face twice - the point of a page of
 *     souvenirs is that they differ.
 *  2. A RECURRING stamp kind never reuses a face across days: the joinee
 *     collects a Reading stamp five times, and five identical ovals would
 *     read as one rubber stamp, not five borders crossed. Drills are exempt -
 *     each drill already has its own label, and thirteen drills exceed the
 *     eleven faces anyway.
 *
 * Every stamp starts at its id's hash (pages keep their scattered, varied
 * mix) and probes forward past banned faces. Stamp identity is static - which
 * stamps a day issues never depends on progress - so the whole plan is
 * computed once at module load, identically on server and client.
 */

/** Kinds whose label repeats day after day, so their face must not. */
const RECURRING_KINDS: ReadonlySet<StampKind> = new Set([
  "reading",
  "activities",
  "tools",
  "quiz",
]);

const FACE_PLAN: ReadonlyMap<string, StampSprite> = (() => {
  const plan = new Map<string, StampSprite>();
  const facesByKind = new Map<StampKind, Set<number>>();
  const empty = emptyProgress();

  for (const day of DAYS) {
    const facesOnPage = new Set<number>();

    for (const stamp of stampsForDay(empty, day.id)) {
      let kindFaces: Set<number> | null = null;
      if (RECURRING_KINDS.has(stamp.kind)) {
        kindFaces = facesByKind.get(stamp.kind) ?? new Set();
        facesByKind.set(stamp.kind, kindFaces);
      }

      const banned = (index: number) =>
        facesOnPage.has(index) || (kindFaces?.has(index) ?? false);

      let index = spriteIndexFor(stamp.id);
      for (
        let hops = 0;
        banned(index) && hops < STAMP_SPRITES.length;
        hops++
      ) {
        index = (index + 1) % STAMP_SPRITES.length;
      }
      if (banned(index)) {
        // Both rules together ran out of faces (cannot happen with today's
        // content - the guard keeps rule 1, the one a page cannot lose).
        index = spriteIndexFor(stamp.id);
        while (facesOnPage.has(index)) {
          index = (index + 1) % STAMP_SPRITES.length;
        }
      }

      facesOnPage.add(index);
      kindFaces?.add(index);
      plan.set(stamp.id, STAMP_SPRITES[index]);
    }
  }

  return plan;
})();

/**
 * The planned face for a stamp. The plan and the sheets derive from the same
 * `stampsForDay`, so every real id is in the plan; the solo-hash fallback is
 * defence against drift (a renderer inventing its own ids), trading the
 * no-repeat guarantees for never rendering blank.
 */
export function faceForStamp(stampId: string): StampSprite {
  return FACE_PLAN.get(stampId) ?? spriteFor(stampId);
}
