/**
 * Crop boxes into `public/stamps.jpg` - a 1199x800 sheet of twelve passport
 * stamps on cream.
 *
 * Each stamp is rendered as a background-image crop rather than twelve separate
 * files: one request, and the sheet is the asset we were given. Boxes are
 * expressed in source pixels and converted to percentages by the renderer, so
 * they stay correct at any display size.
 *
 * The sheet's cream backdrop has no alpha, so anything drawing these must
 * composite with `mix-blend-mode: multiply` over a light surface - the same
 * rule as the other supplied artwork. On dark surfaces, put the stamp on a
 * paper plate first.
 */

export interface StampSprite {
  /** Country/city, for the accessible name. */
  place: string;
  /** Source-pixel crop: x, y, width, height. */
  box: readonly [number, number, number, number];
}

const SHEET_WIDTH = 1199;
const SHEET_HEIGHT = 800;

/**
 * Read off the sheet in reading order. Boxes are generous by a few pixels so a
 * rotated stamp never clips its own ink. Every entry is a DISTINCT stamp on
 * the sheet - the sheet holds eleven - so a page assigned via `assignSprites`
 * can never print the same face twice.
 */
export const STAMP_SPRITES: readonly StampSprite[] = [
  { place: "New York", box: [104, 20, 190, 265] },
  { place: "Paris", box: [330, 34, 190, 300] },
  { place: "Barcelona", box: [568, 22, 250, 250] },
  { place: "Rio de Janeiro", box: [860, 20, 260, 250] },
  { place: "Berlin", box: [60, 330, 300, 175] },
  { place: "London", box: [452, 258, 250, 220] },
  { place: "Rome", box: [736, 300, 250, 200] },
  { place: "Sydney", box: [78, 560, 300, 220] },
  { place: "Tokyo", box: [432, 498, 220, 290] },
  { place: "Amsterdam", box: [652, 560, 260, 220] },
  { place: "Dubai", box: [952, 468, 210, 300] },
] as const;

/**
 * djb2 → sprite index. Stable across server and client renders. Exported for
 * `stamp-faces.ts`, which uses it as the starting point of its collision-free
 * passport-wide assignment.
 */
export function spriteIndexFor(stampId: string): number {
  let hash = 5381;
  for (let i = 0; i < stampId.length; i++) {
    hash = ((hash << 5) + hash + stampId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % STAMP_SPRITES.length;
}

/**
 * Pick a sprite for a lone stamp id. Hashed rather than sequential so pages
 * vary, and stable so the same stamp always prints the same country - a
 * souvenir that changed on reload would not read as a souvenir. Two ids CAN
 * hash to the same face, so anything rendering stamps as a page must use the
 * plan in `stamp-faces.ts` instead.
 */
export function spriteFor(stampId: string): StampSprite {
  return STAMP_SPRITES[spriteIndexFor(stampId)];
}

/**
 * CSS for cropping one sprite out of the sheet, sized to fill its box.
 *
 * `backgroundSize` scales the whole sheet so the crop fills the element, and
 * `backgroundPosition` shifts the wanted cell into view - both in percentages
 * so no fixed pixel size is baked in.
 */
export function spriteStyle(sprite: StampSprite): {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: "no-repeat";
} {
  const [x, y, w, h] = sprite.box;
  return {
    backgroundImage: "url(/stamps.jpg)",
    backgroundSize: `${(SHEET_WIDTH / w) * 100}% ${(SHEET_HEIGHT / h) * 100}%`,
    // Percentage positioning aligns the same fraction of image and box, so the
    // divisor is the leftover space, not the full dimension.
    backgroundPosition: `${(x / (SHEET_WIDTH - w)) * 100}% ${
      (y / (SHEET_HEIGHT - h)) * 100
    }%`,
    backgroundRepeat: "no-repeat",
  };
}

/** Aspect ratio of a sprite, for reserving space without distortion. */
export function spriteAspect(sprite: StampSprite): number {
  return sprite.box[2] / sprite.box[3];
}
