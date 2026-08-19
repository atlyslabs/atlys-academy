/**
 * Crop boxes into `public/stamps.jpg` - a 1254x1254 sheet of twenty-five
 * bespoke passport stamps on cream, one per collectable stamp in the academy,
 * laid out 5x5 IN PAGE ORDER: cell 1 is Day 1's first stamp, cell 25 is
 * Day 3's quiz. Each face carries its own word (READING, GATE HOLD, ...), so
 * the face is the label - the app's caption only annotates empty slots.
 *
 * Each stamp is rendered as a background-image crop rather than twenty-five
 * separate files: one request, and the sheet is the asset we were given.
 * Boxes are expressed in source pixels and converted to percentages by the
 * renderer, so they stay correct at any display size. They were measured by
 * chroma bounding box (stamp ink is colorful, the sheet's printed cell
 * numbers are neutral, so the numbers fall outside every crop) plus a 6px
 * margin so a rotated stamp never clips its own ink.
 *
 * The sheet's cream backdrop has no alpha, so anything drawing these must
 * composite with `mix-blend-mode: multiply` over a light surface - the same
 * rule as the other supplied artwork. On dark surfaces, put the stamp on a
 * paper plate first.
 */

export interface StampSprite {
  /** Which stamp this face belongs to, for humans reading this table. */
  place: string;
  /** Source-pixel crop: x, y, width, height. */
  box: readonly [number, number, number, number];
}

export const SHEET_WIDTH = 1254;
export const SHEET_HEIGHT = 1254;

/**
 * Read off the sheet in cell order, which IS page order (see stamp-faces.ts).
 * Every entry is a distinct face; the wording repeats only where the same
 * stamp kind recurs across days, and those faces differ by the day's motif
 * (Day 1 stamps carry Sydney, Day 2 Johannesburg, Day 3 New York).
 */
export const STAMP_SPRITES: readonly StampSprite[] = [
  { place: "Day 1 · Reading", box: [38, 46, 210, 204] },
  { place: "Day 1 · Checklist", box: [299, 40, 190, 208] },
  { place: "Day 1 · Travel kit", box: [536, 38, 198, 212] },
  { place: "Day 1 · Baggage", box: [772, 38, 206, 212] },
  { place: "Day 1 · Red flags", box: [1017, 36, 204, 215] },
  { place: "Day 1 · Routed", box: [24, 291, 227, 210] },
  { place: "Day 1 · Shadowed", box: [305, 277, 186, 225] },
  { place: "Day 1 · Boarded", box: [528, 295, 210, 207] },
  { place: "Day 2 · Reading", box: [774, 291, 202, 211] },
  { place: "Day 2 · Checklist", box: [1015, 251, 192, 251] },
  { place: "Day 2 · Gate hold", box: [38, 536, 208, 214] },
  // Row 2's three middle crops start 30px below the cell line: the stamps
  // above them run flush to the boundary and their grunge texture crosses it,
  // so a crop from the line itself would carry the neighbour's hatching.
  { place: "Day 2 · Screened", box: [295, 532, 204, 216] },
  { place: "Day 2 · Calmed", box: [550, 532, 182, 220] },
  { place: "Day 2 · Reframed", box: [776, 532, 194, 220] },
  { place: "Day 2 · Rebooked", box: [1015, 542, 206, 204] },
  { place: "Day 2 · Fare rules", box: [26, 778, 225, 196] },
  { place: "Day 2 · Counter", box: [279, 768, 222, 212] },
  { place: "Day 2 · Shadowed", box: [544, 768, 178, 214] },
  { place: "Day 2 · Boarded", box: [766, 786, 214, 192] },
  { place: "Day 3 · Reading", box: [1015, 774, 198, 210] },
  { place: "Day 3 · Checklist", box: [46, 1003, 184, 218] },
  { place: "Day 3 · Control", box: [293, 1003, 196, 222] },
  { place: "Day 3 · Fast track", box: [536, 1007, 200, 212] },
  { place: "Day 3 · Shadowed", box: [788, 1003, 186, 224] },
  { place: "Day 3 · Boarded", box: [1019, 1009, 200, 212] },
] as const;

/**
 * djb2 → sprite index. The FALLBACK face picker: stable across server and
 * client renders, used only for a stamp id the plan in `stamp-faces.ts` does
 * not know (content grew past the sheet). Two ids CAN hash to the same face.
 */
export function spriteFor(stampId: string): StampSprite {
  let hash = 5381;
  for (let i = 0; i < stampId.length; i++) {
    hash = ((hash << 5) + hash + stampId.charCodeAt(i)) | 0;
  }
  return STAMP_SPRITES[Math.abs(hash) % STAMP_SPRITES.length];
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
