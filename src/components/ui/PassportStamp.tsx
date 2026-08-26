import type { Stamp } from "@/lib/progress/stamps";
import {
  spriteAspect,
  spriteStyle,
  type StampSprite,
} from "@/lib/stamp-sprites";
import { cn } from "@/lib/utils";

/**
 * One passport stamp - the souvenir for a finished thing.
 *
 * MUST sit on a LIGHT surface. The sprite sheet is cream with no alpha, so the
 * backdrop is dropped by `mix-blend-mode: multiply` rather than transparency;
 * over a dark panel the cream box would show. On dark, put a `bg-paper` plate
 * down first.
 *
 * Every face on the sheet carries its own word (READING, GATE HOLD, ...), so
 * an earned stamp needs no caption - printing one under it would say the same
 * thing twice. Only the EMPTY slot gets the pencilled caption: a dashed box
 * alone says nothing about what is missing. Unearned stamps keep the earned
 * footprint exactly - same sprite box - so a half-finished page reads as a
 * sheet with gaps rather than a reflow that shifts every stamp as souvenirs
 * land.
 *
 * Pages pass `sprite` from `stamp-faces.ts`. A stamp the sheet has no face for
 * yet prints a typographic impression carrying its own word instead. That is
 * deliberately not a hashed stand-in from the sheet: every face has its word
 * printed on it, so borrowing one shows the joinee the wrong word with total
 * confidence, which is worse than an obvious placeholder.
 */

/** Degrees either side of square. A rubber stamp is never applied straight. */
const TILT_RANGE = 7;

/**
 * Tilt for a stamp, hashed from its id.
 *
 * Deliberately not `Math.random`: the server and client renders must agree, and
 * a souvenir whose angle changed on reload would not read as a souvenir. Whole
 * degrees only, so no float formatting difference can creep between the two.
 */
function tiltFor(stampId: string): number {
  let hash = 5381;
  for (let i = 0; i < stampId.length; i++) {
    hash = ((hash << 5) + hash + stampId.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % (TILT_RANGE * 2 + 1)) - TILT_RANGE;
}

export function PassportStamp({
  stamp,
  sprite,
  size = 84,
  landDelayMs = null,
}: {
  stamp: Stamp;
  /** Face to print. Pages assign these; omitting falls back to a solo hash. */
  sprite?: StampSprite;
  /** Bounding box in px. The longer edge of the sprite is set to this. */
  size?: number;
  /**
   * Non-null plays the rubber-stamp landing once, this many ms after mount.
   * The sheet decides WHICH stamps land (first look this session) and when
   * (after the window's open morph settles); this component only performs it.
   */
  landDelayMs?: number | null;
}) {
  // Square when there is no face: the placeholder has no artwork to keep the
  // proportions of, and a square sits in the flow like the dashed empty slot.
  const aspect = sprite ? spriteAspect(sprite) : 1;
  // Bounded by `size` on both axes rather than fixing the width: the sheet mixes
  // portrait and landscape stamps, and scaling by width alone would make the
  // tall ones tower over the wide ones on the same page.
  const width = aspect >= 1 ? size : Math.round(size * aspect);
  const height = aspect >= 1 ? Math.round(size / aspect) : size;

  return (
    <span
      role="img"
      title={`${stamp.label}: ${stamp.requirement}`}
      aria-label={`${stamp.label} stamp. ${stamp.requirement}. ${
        stamp.earned ? "collected" : "not yet collected"
      }`}
      className="inline-flex shrink-0 flex-col items-center"
    >
      <span
        style={{
          width,
          height,
          // Only the impression tilts; the caption below stays readable.
          transform: stamp.earned
            ? `rotate(${tiltFor(stamp.id)}deg)`
            : undefined,
        }}
        className={cn(
          "relative block",
          // An empty slot was never stamped, so it sits square and dashed.
          !stamp.earned && "rounded-[3px] border-2 border-dashed border-ink/25",
        )}
      >
        {stamp.earned && sprite && (
          <span
            aria-hidden="true"
            style={{
              ...spriteStyle(sprite),
              mixBlendMode: "multiply",
              // `both` holds the pre-impact frame (invisible, raised) through
              // the delay, so a landing stamp is a blank spot until it thumps.
              animationDelay:
                landDelayMs !== null ? `${landDelayMs}ms` : undefined,
            }}
            className={cn(
              "absolute inset-0 block",
              landDelayMs !== null && "animate-stamp-press",
            )}
          />
        )}

        {/* Placeholder impression: earned, but the sheet has no face for this
            stamp yet. Double-ruled and inked in the stamp's own word, so it
            reads as a stamp and as obviously-not-final at the same time. It
            takes the landing animation like any other, so the page's
            choreography does not break around it. */}
        {stamp.earned && !sprite && (
          <span
            aria-hidden="true"
            style={{
              animationDelay:
                landDelayMs !== null ? `${landDelayMs}ms` : undefined,
            }}
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-[3px] border-2 border-double border-ink/70 p-1 text-center font-mono uppercase leading-tight text-ink/80",
              size >= 120
                ? "text-[11px] tracking-[0.14em]"
                : "text-[8px] tracking-[0.1em]",
              landDelayMs !== null && "animate-stamp-press",
            )}
          >
            {stamp.label}
          </span>
        )}
      </span>
      {!stamp.earned && (
        <span
          className={cn(
            "mt-1 whitespace-nowrap text-center font-mono uppercase leading-none text-ink-muted",
            size >= 120
              ? "text-[10px] tracking-[0.16em]"
              : "text-[9px] tracking-[0.14em]",
          )}
        >
          {stamp.label}
        </span>
      )}
    </span>
  );
}
