import {
  AVATAR_COLORS,
  AVATAR_FACES,
  AVATAR_HATS,
  defaultAvatar,
  normalizeAvatar,
} from "@/lib/avatar";
import type { AvatarConfig } from "@/lib/progress/types";

/**
 * Hat `fill` keys → CSS colours. Keys missing here ("none" or an absent fill)
 * render as ink-stroked outlines instead - the halo and headphone arc.
 */
const HAT_FILLS: Record<string, string> = {
  ink: "var(--color-ink)",
  accent: "var(--color-accent)",
  gold: "var(--color-tile-yellow)",
  green: "var(--color-tile-green)",
};

/** Squircle-ish blob body filling most of the 100×100 viewBox. */
const BODY_PATH =
  "M50,6 C75,6 92,20 92,50 C92,80 75,94 50,94 C25,94 8,80 8,50 C8,20 25,6 50,6 Z";

export interface JoineeAvatarProps {
  /** Absent config renders the shared deterministic default. */
  config?: AvatarConfig | null;
  /** Rendered width and height in px. */
  size?: number;
  className?: string;
}

/**
 * Skribbl-style joinee avatar: coloured blob + face + hat, assembled from the
 * part arrays in `lib/avatar.ts`. Purely decorative wherever it appears (the
 * joinee's name is always adjacent), so the SVG is `aria-hidden`.
 */
export function JoineeAvatar({ config, size = 40, className }: JoineeAvatarProps) {
  const { color, face, hat } = normalizeAvatar(
    config ?? defaultAvatar("atlys-joinee"),
  );
  const faceParts = AVATAR_FACES[face];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      // Tall hats (party cone, crown) poke above the viewBox - never clip them.
      style={{ overflow: "visible" }}
    >
      <path
        d={BODY_PATH}
        fill={AVATAR_COLORS[color]}
        stroke="var(--color-ink)"
        strokeWidth={3}
      />
      {faceParts.eyes.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      ))}
      <path
        d={faceParts.mouth}
        fill={faceParts.mouthFilled ? "var(--color-ink)" : "none"}
        stroke="var(--color-ink)"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      {AVATAR_HATS[hat].paths.map((part, index) => {
        const fill = part.fill ? HAT_FILLS[part.fill] : undefined;
        return fill ? (
          <path key={index} d={part.d} fill={fill} />
        ) : (
          <path
            key={index}
            d={part.d}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
