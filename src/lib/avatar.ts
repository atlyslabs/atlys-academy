import type { AvatarConfig } from "@/lib/progress/types";

/**
 * Skribbl-style avatars: a coloured blob face assembled from three part
 * indices (colour, face, hat). Pure data + pure functions; the SVG renderer
 * lives in `components/ui/JoineeAvatar.tsx`.
 *
 * Parts are append-only. Renderers index with modulo, so an old stored config
 * can never go out of range when parts are added later.
 */

/** Blob fill colours - the sticker-tile palette from the style reference. */
export const AVATAR_COLORS = [
  "#f5c744", // yellow
  "#a78bfa", // purple
  "#f87561", // coral
  "#34c98e", // green
  "#4f8ff7", // blue
  "#f2a3c0", // pink
  "#8ad4e0", // sky
  "#c9b458", // olive
] as const;

/**
 * Face = eyes + mouth drawn in a 100×100 viewBox. Path data kept here so the
 * renderer is a dumb loop. Stroke everything in ink for the hand-drawn look.
 */
export interface AvatarFace {
  /** Two eye shapes, as SVG path `d` strings. */
  eyes: string[];
  /** Mouth path `d`. */
  mouth: string;
  /** Filled mouth (laughing) vs stroked line. */
  mouthFilled?: boolean;
}

export const AVATAR_FACES: readonly AvatarFace[] = [
  {
    // Wide-eyed and cheerful
    eyes: ["M 33 42 a 5 5 0 1 0 0.1 0", "M 63 42 a 5 5 0 1 0 0.1 0"],
    mouth: "M 36 62 Q 50 74 64 62",
  },
  {
    // Happy squint
    eyes: ["M 27 42 Q 33 36 39 42", "M 57 42 Q 63 36 69 42"],
    mouth: "M 36 60 Q 50 76 64 60",
  },
  {
    // Laughing - open mouth
    eyes: ["M 27 40 Q 33 34 39 40", "M 57 40 Q 63 34 69 40"],
    mouth: "M 34 58 Q 50 80 66 58 Z",
    mouthFilled: true,
  },
  {
    // Deadpan
    eyes: ["M 30 40 a 4 4 0 1 0 0.1 0", "M 62 40 a 4 4 0 1 0 0.1 0"],
    mouth: "M 38 65 L 62 65",
  },
  {
    // Wink
    eyes: ["M 33 42 a 5 5 0 1 0 0.1 0", "M 57 42 L 69 42"],
    mouth: "M 36 62 Q 50 72 64 62",
  },
  {
    // Surprised
    eyes: ["M 32 40 a 6 6 0 1 0 0.1 0", "M 62 40 a 6 6 0 1 0 0.1 0"],
    mouth: "M 44 62 a 7 7 0 1 0 0.1 0",
  },
  {
    // Determined brows
    eyes: ["M 28 36 L 40 42 M 33 44 a 3.5 3.5 0 1 0 0.1 0", "M 68 36 L 56 42 M 60 44 a 3.5 3.5 0 1 0 0.1 0"],
    mouth: "M 38 64 Q 50 68 62 64",
  },
  {
    // Sleepy
    eyes: ["M 28 44 Q 34 47 40 44", "M 56 44 Q 62 47 68 44"],
    mouth: "M 40 64 Q 50 69 60 64",
  },
] as const;

/** Hats drawn above the blob. Empty string = bare head. */
export interface AvatarHat {
  /** SVG fragment paths, stroked/filled in ink and white. */
  paths: { d: string; fill?: string }[];
}

export const AVATAR_HATS: readonly AvatarHat[] = [
  { paths: [] }, // none
  {
    // Beanie
    paths: [
      { d: "M 28 22 Q 50 2 72 22 L 72 28 Q 50 18 28 28 Z", fill: "ink" },
      { d: "M 46 8 a 5 5 0 1 0 0.1 0", fill: "ink" },
    ],
  },
  {
    // Cap with brim
    paths: [
      { d: "M 30 20 Q 50 4 70 20 L 70 26 L 30 26 Z", fill: "ink" },
      { d: "M 68 22 L 88 26 L 68 30 Z", fill: "ink" },
    ],
  },
  {
    // Party cone
    paths: [
      { d: "M 50 -6 L 62 24 L 38 24 Z", fill: "accent" },
      { d: "M 50 -6 a 4 4 0 1 0 0.1 0", fill: "ink" },
    ],
  },
  {
    // Crown
    paths: [
      { d: "M 32 24 L 36 8 L 46 20 L 50 4 L 54 20 L 64 8 L 68 24 Z", fill: "gold" },
    ],
  },
  {
    // Headphones
    paths: [
      { d: "M 26 34 Q 50 6 74 34", fill: "none" },
      { d: "M 22 34 h 8 v 12 h -8 Z", fill: "ink" },
      { d: "M 70 34 h 8 v 12 h -8 Z", fill: "ink" },
    ],
  },
  {
    // Sprout
    paths: [
      { d: "M 50 20 Q 50 8 60 4 Q 56 16 50 20 Z", fill: "green" },
      { d: "M 50 20 Q 50 10 40 6 Q 44 16 50 20 Z", fill: "green" },
    ],
  },
  {
    // Halo
    paths: [{ d: "M 34 10 a 16 6 0 1 0 32 0 a 16 6 0 1 0 -32 0", fill: "none" }],
  },
] as const;

export const AVATAR_PART_COUNTS = {
  color: AVATAR_COLORS.length,
  face: AVATAR_FACES.length,
  hat: AVATAR_HATS.length,
} as const;

/** Clamp any stored config onto the current part arrays. */
export function normalizeAvatar(config: AvatarConfig): AvatarConfig {
  const mod = (n: number, m: number) => ((Math.round(n) % m) + m) % m;
  return {
    color: mod(config.color, AVATAR_COLORS.length),
    face: mod(config.face, AVATAR_FACES.length),
    hat: mod(config.hat, AVATAR_HATS.length),
  };
}

/**
 * Deterministic default so everyone has a face before they ever open the
 * builder - hash whatever stable string is available (email, or "guest").
 */
export function defaultAvatar(seedText: string): AvatarConfig {
  let hash = 5381;
  for (let i = 0; i < seedText.length; i++) {
    hash = ((hash << 5) + hash + seedText.charCodeAt(i)) | 0;
  }
  const positive = Math.abs(hash);
  return normalizeAvatar({
    color: positive % AVATAR_COLORS.length,
    face: Math.floor(positive / 7) % AVATAR_FACES.length,
    hat: Math.floor(positive / 61) % AVATAR_HATS.length,
  });
}
