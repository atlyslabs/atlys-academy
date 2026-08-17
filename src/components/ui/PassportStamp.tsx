import type { Stamp } from "@/lib/progress/stamps";
import {
  spriteAspect,
  spriteFor,
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
 * The label prints UNDER the impression, straight, like a caption pencilled
 * beneath the ink - not across the stamp face, where the artwork made it
 * unreadable. Unearned stamps keep the earned footprint exactly - same sprite
 * box - so a half-finished page reads as a sheet with gaps rather than a
 * reflow that shifts every stamp as souvenirs land.
 *
 * Pages must pass `sprite` (assigned via `assignSprites`, one face per stamp);
 * the lone-stamp fallback hashes the id and can collide across stamps.
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
  const face = sprite ?? spriteFor(stamp.id);
  const aspect = spriteAspect(face);
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
        {stamp.earned && (
          <span
            aria-hidden="true"
            style={{
              ...spriteStyle(face),
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
      </span>
      <span
        className={cn(
          "mt-1 whitespace-nowrap text-center font-mono uppercase leading-none",
          size >= 120
            ? "text-[10px] tracking-[0.16em]"
            : "text-[9px] tracking-[0.14em]",
          stamp.earned ? "text-ink-secondary" : "text-ink-muted",
        )}
      >
        {stamp.label}
      </span>
    </span>
  );
}
