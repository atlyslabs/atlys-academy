import { STAMP_SPRITES, type StampSprite } from "./stamp-sprites";

/**
 * The passport-wide face plan: which sprite every stamp prints.
 *
 * Keyed by stamp id, deliberately. This used to be a positional walk - the Nth
 * stamp across Day 1 → Day 3 printed the sheet's Nth face - which was true when
 * the sheet was drawn and silently false the moment the drill list changed.
 * Every face carries its own printed word, so a shift of one does not degrade
 * gracefully: adding `apac-loop` in the middle of Day 2 pushed six later stamps
 * onto their neighbours' art and knocked Day 3's last three off the sheet
 * entirely, so the passport showed FAST TRACK on the edge-cases stamp and two
 * random faces at the end of Day 3.
 *
 * An explicit map cannot do that. A stamp either has its own face or has none,
 * and reordering, adding or retiring a stamp leaves every other face alone.
 *
 * A stamp missing from this map returns `undefined` and prints the typographic
 * fallback in `PassportStamp` - correct word, placeholder art - rather than
 * borrowing a face that says something else. Every stamp currently has a face
 * (CALMED, which the sheet generator dropped, was transplanted back in from
 * the first sheet), so the fallback is dormant until content next grows a
 * stamp.
 */
const FACE_BY_STAMP: Readonly<Record<string, string>> = {
  /* ---------------------------------- Day 1 -------------------------------- */
  "day1.reading": "Day 1 · Reading",
  "day1.activities": "Day 1 · Checklist",
  "day1.tools": "Day 1 · Travel kit",
  "day1.drill.tool-match": "Day 1 · Baggage",
  "day1.drill.flag-swipe": "Day 1 · Red flags",
  "day1.drill.connect-islands": "Day 1 · Routed",
  "day1.odpac": "Day 1 · Shadowed",
  "day1.quiz": "Day 1 · Boarded",

  /* ---------------------------------- Day 2 -------------------------------- */
  "day2.reading": "Day 2 · Reading",
  "day2.activities": "Day 2 · Checklist",
  "day2.drill.pause-10s": "Day 2 · Gate hold",
  "day2.drill.dos-donts": "Day 2 · Screened",
  "day2.drill.anxiety-wall": "Day 2 · Calmed",
  "day2.drill.reframe-deck": "Day 2 · Reframed",
  "day2.drill.rewrite-chat": "Day 2 · Rebooked",
  "day2.drill.apac-loop": "Day 2 · Sequenced",
  "day2.drill.mock-scenarios": "Day 2 · Counter",
  "day2.odpac": "Day 2 · Shadowed",
  "day2.quiz": "Day 2 · Boarded",

  /* ---------------------------------- Day 3 -------------------------------- */
  "day3.reading": "Day 3 · Reading",
  "day3.activities": "Day 3 · Checklist",
  "day3.drill.ownership-sort": "Day 3 · Control",
  "day3.drill.edge-cases": "Day 3 · Diverted",
  "day3.drill.lead-status": "Day 3 · Manifest",
  "day3.drill.followup-rewrite": "Day 3 · Callback",
  "day3.drill.ds160-consistency": "Day 3 · Doc check",
  "day3.odpac": "Day 3 · Shadowed",
  "day3.quiz": "Day 3 · Boarded",
};

const SPRITE_BY_PLACE = new Map(
  STAMP_SPRITES.map((sprite) => [sprite.place, sprite] as const),
);

/**
 * The face for a stamp, or `undefined` when the sheet has none for it yet.
 *
 * No hashed fallback: hashing produced a real face carrying a real word, and
 * on this sheet the word IS the stamp - a joinee reading DOC CHECK as SHADOWED
 * is worse served than one seeing an honest placeholder.
 */
export function faceForStamp(stampId: string): StampSprite | undefined {
  const place = FACE_BY_STAMP[stampId];
  return place ? SPRITE_BY_PLACE.get(place) : undefined;
}
