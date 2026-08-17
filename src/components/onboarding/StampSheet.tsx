"use client";

import { useEffect, useState } from "react";
import type { DayId } from "@/content/onboarding/types";
import { legForDay } from "@/content/onboarding/journey";
import { Badge } from "@/components/ui/Badge";
import { PassportStamp } from "@/components/ui/PassportStamp";
import { useProgress } from "@/lib/progress/provider";
import {
  allStampSheets,
  stampSheet,
  stampTotals,
  type StampSheet as Sheet,
} from "@/lib/progress/stamps";
import { faceForStamp } from "@/lib/stamp-faces";
import { peekUnseenEarned, takeUnseenEarned } from "@/lib/stamp-seen";
import { cn } from "@/lib/utils";

/**
 * One page of the passport: every stamp a day can issue, collected or blank.
 *
 * The sheet is derived on every render - `stamps.ts` stores nothing - so the
 * page cannot disagree with the progress it represents. Blank slots are drawn
 * rather than omitted, which is the whole point: the joinee sees what is still
 * missing.
 *
 * Stamps earned since this session last looked at the page slam in with the
 * rubber-stamp landing (see `stamp-seen.ts` for why "since last looked" rather
 * than "when earned": the sheet is unmounted at the moment of earning).
 */

/** Stamp box sizes. Compact is the desk card, full is the passport route. */
const COMPACT_SIZE = 50;
const FULL_SIZE = 92;

/**
 * Landing choreography: the first slam waits for the window's open morph
 * (~460ms) to settle, and multiple landings thump in one at a time.
 */
const LAND_BASE_MS = 550;
const LAND_STEP_MS = 160;

/** djb2 → [0, 1). Deterministic, so SSR and client stamp the same page. */
function hash01(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return ((hash >>> 0) % 1000) / 1000;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * How far the scattered grid spreads from the plate's centre HORIZONTALLY.
 * Below 1 the columns huddle: stamps read as a clustered page of souvenirs
 * rather than lonely marks pinned to the corners of a mostly-empty plate.
 */
const SCATTER_SPREAD_X = 0.8;

/**
 * Row centres by row count, in % of the plate's height. Hand-tuned rather
 * than derived: a stamp is a box PLUS a caption below it, so rows need more
 * clearance than columns - the three-row page runs nearly edge to edge or
 * the middle row's boxes bury the top row's captions.
 */
const SCATTER_ROW_BANDS: Record<number, readonly number[]> = {
  1: [50],
  2: [28, 72],
  3: [16, 50, 84],
};

/**
 * Where a stamp lands on a scattered page: the page is cut into a loose grid
 * of cells (so nothing overlaps) and each stamp drifts a hashed distance off
 * its cell centre - the way real entry stamps wander around a passport page
 * rather than queueing along the top. Jitter is kept smaller than the gap
 * between cells, so neighbours can kiss but never pile up.
 */
function scatterPosition(stampId: string, index: number, total: number) {
  const cols = total <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(total / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const bands = SCATTER_ROW_BANDS[rows] ?? SCATTER_ROW_BANDS[3];
  const cx = 50 + (((col + 0.5) / cols) * 100 - 50) * SCATTER_SPREAD_X;
  const cy = bands[Math.min(row, bands.length - 1)];
  const jx = (hash01(`${stampId}:x`) - 0.5) * (26 / cols);
  const jy = (hash01(`${stampId}:y`) - 0.5) * (16 / rows);
  return {
    left: `${clamp(cx + jx, 16, 84)}%`,
    top: `${clamp(cy + jy, 14, 86)}%`,
  };
}

export function StampSheet({
  dayId,
  compact = false,
  stampSize,
  scatter = false,
  className,
}: {
  dayId: DayId;
  /** Desk variant: smaller stamps, no header, no frame of its own. */
  compact?: boolean;
  /** Overrides the variant's stamp box size (px). */
  stampSize?: number;
  /**
   * Spreads the stamps across the whole plate instead of flowing them in a
   * row - for plates that fill a window. Needs a bounded height to fill.
   */
  scatter?: boolean;
  /** Merged onto the plate, e.g. to let it fill a whole window. */
  className?: string;
}) {
  const { state, ready } = useProgress();
  const sheet = stampSheet(state, dayId);
  const size = stampSize ?? (compact ? COMPACT_SIZE : FULL_SIZE);

  return (
    <div
      className={cn(
        // The one light surface on the night stage. `.paper-plate` re-scopes
        // the ink tokens, so everything inside prints in paper-native ink -
        // and the stamp sprites (cream, multiply-blended) sit correctly.
        "paper-plate",
        compact ? "rounded-xl p-3" : "rounded-2xl p-4",
        scatter && "flex flex-col",
        className,
      )}
    >
      {/* Mounted always, so a stamp landing is announced rather than the region
          appearing at the same moment as the text it holds. */}
      <p aria-live="polite" className="sr-only">
        {`${sheet.earned} of ${sheet.total} stamps collected on page ${dayId}`}
      </p>

      {(!compact || scatter) && (
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Page 0{dayId} · {sheet.earned} of {sheet.total} collected
        </p>
      )}

      {/* Keyed on readiness: pre-hydration the sheet is the empty default, so
          the body remounts once real progress arrives and decides - at mount,
          before first paint - which stamps this session has never seen earned.
          Those get the landing animation; a plain reload gets a quiet page. */}
      <SheetBody
        key={ready ? "live" : "loading"}
        ready={ready}
        sheet={sheet}
        size={size}
        scatter={scatter}
        compact={compact}
        largeFlow={Boolean(stampSize && stampSize > COMPACT_SIZE)}
      />
    </div>
  );
}

/**
 * The stamps themselves plus the completion badge - everything whose render
 * depends on which stamps are landing on this look at the page.
 */
function SheetBody({
  ready,
  sheet,
  size,
  scatter,
  compact,
  largeFlow,
}: {
  ready: boolean;
  sheet: Sheet;
  size: number;
  scatter: boolean;
  compact: boolean;
  largeFlow: boolean;
}) {
  // The passport-wide plan: no face repeated on a page, and recurring kinds
  // (reading, checklist, travel kit, quiz) never repeat a face across days.
  const sprites = sheet.stamps.map((stamp) => faceForStamp(stamp.id));
  const earnedIds = sheet.stamps
    .filter((stamp) => stamp.earned)
    .map((stamp) => stamp.id);
  const earnedKey = earnedIds.join("|");

  // Which stamps land on THIS look, decided once at mount from a pure peek of
  // the session ledger - so the slam class (whose delay holds the stamp
  // invisible) is in the first paint, and nothing flashes before it hides.
  const [landing] = useState<ReadonlyMap<string, number>>(() => {
    const map = new Map<string, number>();
    if (ready) {
      peekUnseenEarned(sheet.dayId, earnedIds).forEach((id, index) => {
        map.set(id, LAND_BASE_MS + index * LAND_STEP_MS);
      });
    }
    return map;
  });

  // Commit "these have now been shown" after paint. Idempotent, and also runs
  // when progress changes while mounted - anything rendered in front of the
  // joinee counts as seen, animated or not.
  useEffect(() => {
    if (!ready) return;
    takeUnseenEarned(sheet.dayId, earnedKey === "" ? [] : earnedKey.split("|"));
  }, [ready, sheet.dayId, earnedKey]);

  // The completion badge holds back until the last slam has settled, so a
  // page finishing in front of the joinee ends on the verdict, not with it.
  const lastLand =
    landing.size > 0 ? Math.max(...landing.values()) + 420 : null;

  return (
    <>
      {scatter ? (
        <div className="relative min-h-[380px] flex-1">
          {sheet.stamps.map((stamp, index) => (
            <span
              key={stamp.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={scatterPosition(stamp.id, index, sheet.stamps.length)}
            >
              <PassportStamp
                stamp={stamp}
                sprite={sprites[index]}
                size={size}
                landDelayMs={landing.get(stamp.id) ?? null}
              />
            </span>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-wrap items-end",
            compact ? "gap-2" : "mt-4 gap-3",
            // Window-filling plates space souvenirs like a real page.
            largeFlow && "gap-4",
          )}
        >
          {sheet.stamps.map((stamp, index) => (
            <PassportStamp
              key={stamp.id}
              stamp={stamp}
              sprite={sprites[index]}
              size={size}
              landDelayMs={landing.get(stamp.id) ?? null}
            />
          ))}
        </div>
      )}

      {sheet.complete && (
        <p
          className={cn(
            compact ? "mt-3" : "mt-4",
            scatter && "text-right",
            // The animation lives on the paragraph, not the Badge: pop-in ends
            // at `transform: none`, which would erase the badge's tilt.
            lastLand !== null && "animate-pop-in",
          )}
          style={
            lastLand !== null ? { animationDelay: `${lastLand}ms` } : undefined
          }
        >
          <Badge tone="green" className="-rotate-[2.5deg] tracking-[0.2em]">
            Page complete
          </Badge>
        </p>
      )}
    </>
  );
}

/**
 * The whole passport - one page per day, plus the running total.
 *
 * Lives here rather than in the route because the route is a server component:
 * the stamps are derived from client-held progress state, so the reading half
 * has to be a client child.
 */
export function PassportPages() {
  const { state } = useProgress();
  const sheets = allStampSheets(state);
  const totals = stampTotals(state);

  return (
    <div className="animate-rise-in">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-secondary tabular-nums">
        {totals.earned} of {totals.total} stamps · {totals.daysComplete} of{" "}
        {sheets.length} pages complete
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {sheets.map((sheet) => {
          const leg = legForDay(sheet.dayId);
          return (
            <section key={sheet.dayId}>
              <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.16em] text-ink-muted">
                Day {sheet.dayId} · {leg.code}, {leg.place}
              </h2>
              <div className="mt-2">
                <StampSheet dayId={sheet.dayId} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
