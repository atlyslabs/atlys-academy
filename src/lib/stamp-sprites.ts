/**
 * Crop boxes into `public/stamps.jpg` - a 2752x1536 sheet of philately-style
 * passport stamps on cream, laid out 6 wide x 5 deep, one face per collectable
 * stamp in the academy. Third sheet (Aug 2026): each face now carries its word
 * across the TOP and sits well inside its cell, which is what fixed the earlier
 * sheets' habit of ink crossing the cell line and getting trimmed by the crop.
 * `stamp-faces.ts` binds faces to stamps by name, so the cell order here is a
 * description of the sheet, not a contract. The face is the label - the app's
 * caption only annotates empty slots.
 *
 * Two cells are decorative spares (a duplicate TRAVEL KIT and a TRAVEL), kept
 * in the table so the numbering stays a plain walk of the grid but claimed by
 * nothing. Cell 12's word came back garbled from the generator ("RECFIRED"),
 * so the CALMED face it was meant to carry was transplanted in from the first
 * sheet instead - the art the drill launched with. The printed cell numbers on
 * the sheet itself are unreliable (several repeat); position is what
 * identifies a cell.
 *
 * Each stamp is rendered as a background-image crop rather than thirty
 * separate files: one request, and the sheet is the asset we were given.
 * Boxes are expressed in source pixels and converted to percentages by the
 * renderer, so they stay correct at any display size. They are measured by
 * `scripts/measure-stamps.mjs` - chroma bounding box per cell (stamp ink is
 * colorful, the sheet's printed cell numbers are neutral grey, so the numbers
 * fall outside every crop) plus a 6px margin so a rotated stamp never clips
 * its own ink. Re-run that script whenever the sheet is redrawn; do not edit
 * these boxes by hand.
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

export const SHEET_WIDTH = 2752;
export const SHEET_HEIGHT = 1536;

/**
 * Read off the sheet in cell order, rows 1-5 of a 6-wide grid. Duplicated
 * words (Reading, Checklist, Shadowed, Boarded) recur across days and differ
 * by ink colour; the day in `place` records which stamp claims which cell.
 *
 * `place` is the key that binds this file to `stamp-faces.ts`: change one of
 * these strings and update `FACE_BY_STAMP` with it. `(spare)` entries are on
 * the sheet but claimed by nothing.
 */
export const STAMP_SPRITES: readonly StampSprite[] = [
  // Row 1
  { place: "Day 1 · Reading", box: [118, 13, 303, 273] },
  { place: "Day 1 · Checklist", box: [577, 13, 303, 273] },
  { place: "Day 1 · Travel kit", box: [1035, 13, 303, 273] },
  { place: "(spare) · Travel kit duplicate", box: [1493, 12, 305, 275] },
  { place: "(spare) · Travel", box: [1952, 13, 304, 273] },
  { place: "Day 1 · Baggage", box: [2412, 13, 303, 273] },
  // Row 2
  { place: "Day 1 · Red flags", box: [117, 321, 306, 276] },
  { place: "Day 1 · Routed", box: [577, 322, 303, 274] },
  { place: "Day 1 · Shadowed", box: [1035, 322, 304, 274] },
  { place: "Day 1 · Boarded", box: [1494, 323, 303, 272] },
  { place: "Day 2 · Checklist", box: [1952, 322, 304, 274] },
  // Transplanted from the first sheet (git d9d8f6d) over the cell whose word
  // the generator garbled - the original teal shield-and-brick-wall CALMED,
  // rescaled to this sheet's ink height by scripts in Aug 2026.
  { place: "Day 2 · Calmed", box: [2419, 346, 208, 244] },
  // Row 3
  { place: "Day 2 · Reading", box: [118, 631, 303, 274] },
  { place: "Day 2 · Gate hold", box: [576, 631, 305, 274] },
  { place: "Day 2 · Screened", box: [1036, 632, 303, 272] },
  { place: "Day 2 · Reframed", box: [1493, 631, 304, 273] },
  { place: "Day 2 · Rebooked", box: [1952, 631, 304, 274] },
  { place: "Day 2 · Sequenced", box: [2411, 631, 304, 274] },
  // Row 4
  { place: "Day 2 · Counter", box: [119, 941, 302, 273] },
  { place: "Day 2 · Shadowed", box: [576, 940, 304, 274] },
  { place: "Day 2 · Boarded", box: [1035, 940, 304, 274] },
  { place: "Day 3 · Reading", box: [1493, 940, 305, 274] },
  { place: "Day 3 · Checklist", box: [1953, 941, 303, 273] },
  { place: "Day 3 · Control", box: [2410, 939, 306, 276] },
  // Row 5
  { place: "Day 3 · Diverted", box: [118, 1250, 303, 273] },
  { place: "Day 3 · Manifest", box: [577, 1250, 303, 273] },
  { place: "Day 3 · Callback", box: [1035, 1250, 304, 273] },
  { place: "Day 3 · Doc check", box: [1494, 1250, 303, 273] },
  { place: "Day 3 · Shadowed", box: [1952, 1250, 304, 273] },
  { place: "Day 3 · Boarded", box: [2411, 1250, 304, 273] },
] as const;

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
