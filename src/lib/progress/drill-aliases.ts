import type { DrillId } from "@/content/onboarding/types";
import type { DrillResult } from "./types";

/**
 * Drill ids that were renamed after joinees had already played them.
 *
 * A drill id is persisted twice over - as `drill_results.drill_id` in Supabase
 * and inside the progress blob in every joinee's localStorage - so renaming one
 * is not a rename, it is a data migration with a long tail. The SQL in
 * `supabase/rename-apac-loop.sql` fixes the rows that exist today; this map
 * fixes the ones that arrive afterwards, which is the half that actually bites.
 *
 * Without it: a joinee whose browser still holds `apac-loop` reloads, uploads
 * its whole state, and `saveProgress` writes the old id straight back. Their
 * `odpac-loop` stamp is then unearned, Day 2's sheet is no longer full, and
 * `dayWorkFinished` re-seals Day 3 under them - a day they had already opened.
 * That is the exact failure the pause drill's "rushed" guard exists to prevent,
 * arriving by a different route.
 *
 * Applied on every read (`localProgressStore.load`, and `loadProgress` on the
 * server), so the rename heals on contact and the next write persists the new
 * id. The SQL is then a tidy-up rather than a dependency: correctness does not
 * wait on anyone remembering to run it.
 *
 * **APAC → ODPAC (Sep 2026).** The academy teaches one conversation framework,
 * ODPAC. The objection drill had shipped under a second acronym; the drill and
 * every joinee's play of it are kept, only the name changed.
 *
 * Retiring an entry is safe once no stored state can still carry the old id -
 * in practice, once every joinee who played it has synced at least once after
 * the rename.
 */
const RENAMED_DRILL_IDS: Readonly<Record<string, DrillId>> = {
  "apac-loop": "odpac-loop",
};

/** The id a stored drill key should be read as today. */
export function canonicalDrillId(storedId: string): string {
  return RENAMED_DRILL_IDS[storedId] ?? storedId;
}

/**
 * Rewrite a stored drills map onto current ids.
 *
 * When a joinee somehow holds both the old and the new id - played it once
 * before the rename and again after - the later `updatedAt` wins, which is the
 * same rule `mergeDrill` uses for the local/server merge. Ties keep the entry
 * already under the canonical id, so this is idempotent: running it twice
 * changes nothing.
 */
export function migrateDrillIds(
  drills: Partial<Record<string, DrillResult>>,
): Partial<Record<string, DrillResult>> {
  let changed = false;
  const out: Partial<Record<string, DrillResult>> = {};

  for (const [storedId, result] of Object.entries(drills)) {
    if (!result) continue;
    const id = canonicalDrillId(storedId);
    if (id !== storedId) changed = true;

    const existing = out[id];
    if (!existing) {
      out[id] = result;
      continue;
    }
    // Both ids present. Keep the more recent play.
    const a = Date.parse(existing.updatedAt ?? "");
    const b = Date.parse(result.updatedAt ?? "");
    if (Number.isFinite(b) && (!Number.isFinite(a) || b > a)) out[id] = result;
  }

  // Returning the original object when nothing moved keeps referential equality
  // for the common case, so this can sit on a hot read path without churn.
  return changed ? out : drills;
}
