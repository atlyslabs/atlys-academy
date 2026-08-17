import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Atlys lockup, from `public/atlys.svg`.
 *
 * Two properties of the supplied file drive everything here. It is a 317x152
 * horizontal lockup that already contains the wordmark, so `showWordmark` never
 * adds type of our own - it only chooses whether the whole lockup or a tight
 * window onto the winged-arrow mark is rendered. And its artboard is floored
 * with an opaque #FDFDFD rect, so it cannot sit on a coloured surface
 * untreated: `mix-blend-mode: multiply` drops that near-white, which means
 * **light surfaces are the only place this may go**. On board or leather the
 * caller must put it on a `bg-paper` plate first - see the plane plate in
 * the same treatment is applied to the photo assets.
 */

/** Intrinsic artboard of public/atlys.svg. */
const ART_WIDTH = 317;
const ART_HEIGHT = 152;

/**
 * The window onto the winged-arrow mark, in artboard units.
 *
 * The mark is not cleanly separable in this file, which is why these are hand
 * measured off a raster of it rather than guessed. The chevron itself runs
 * x 271-316, y 7-58, with a small inner leaf reaching back to x 264 - but the
 * wordmark's "s" also reaches x 266 in the rows below y 49, and the purple motion
 * trail crosses the whole lockup at y 29-36. So the left edge sits just clear of
 * the "s" at x 268. That trims a few columns off the leaf, which reads as an
 * ordinary tight crop, where including them would drop a stray corner of the "s"
 * into frame and read as a bug. Slightly taller than wide, so it is not forced
 * square. If the artwork is ever redrawn, these four numbers move with it.
 */
const GLYPH_X = 268;
const GLYPH_Y = 5;
const GLYPH_WIDTH = 49;
const GLYPH_HEIGHT = 54;

export interface AtlysMarkProps {
  /** Rendered height in px. Width follows the lockup's aspect ratio. */
  size?: number;
  /**
   * False crops to the winged-arrow mark alone - `size` tall and a shade
   * narrower - for tight spots where the word "Atlys" is already adjacent in the
   * surrounding copy.
   */
  showWordmark?: boolean;
  /**
   * "night" (default) uses `atlys-night.svg`: the same artwork with the
   * opaque #FDFDFD floor stripped and the near-black letterforms turned
   * white, so it sits on the dark theme with no blend tricks and no grey
   * halo. "paper" is the original asset for light plates (passport paper),
   * which still needs `multiply` to drop its white floor.
   */
  tone?: "night" | "paper";
  className?: string;
}

export function AtlysMark({
  size = 22,
  showWordmark = true,
  tone = "night",
  className,
}: AtlysMarkProps) {
  // One asset either way. The crop scales the whole artboard up until the glyph
  // window measures `size` tall, then slides it under an overflow-hidden frame -
  // a second file would be a second thing to keep in sync with the brand.
  const scale = size / (showWordmark ? ART_HEIGHT : GLYPH_HEIGHT);
  const width = Math.round(ART_WIDTH * scale);
  const height = Math.round(ART_HEIGHT * scale);
  const frameWidth = showWordmark
    ? width
    : Math.round((GLYPH_WIDTH / ART_WIDTH) * width);
  // Offsets are taken as a fraction of the *rendered* size, not `scale`, and are
  // left fractional. Rounding them independently of `width` let the window drift
  // up to a pixel at some sizes, which is enough to pull the corner of the "s"
  // into frame; deriving them from `width` makes the window land on GLYPH_X/Y
  // exactly at every size.
  const offsetX = -(GLYPH_X / ART_WIDTH) * width;
  const offsetY = -(GLYPH_Y / ART_HEIGHT) * height;

  return (
    <span
      role="img"
      aria-label="Atlys"
      className={cn(
        "relative inline-block shrink-0 overflow-hidden align-middle",
        className,
      )}
      style={{ width: frameWidth, height: size }}
    >
      <Image
        src={tone === "night" ? "/atlys-night.svg" : "/atlys.svg"}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        style={{
          // Only the original (paper) artwork carries the opaque white floor
          // that multiply has to knock out; the night file is transparent.
          mixBlendMode: tone === "paper" ? "multiply" : undefined,
          position: "absolute",
          left: showWordmark ? 0 : offsetX,
          top: showWordmark ? 0 : offsetY,
          // Pinned in CSS, not left to the attributes: the file declares
          // `width="100%"` and no height, so the browser gives it an intrinsic
          // 300x144 rather than the 317x152 viewBox. Sizing from the viewBox
          // keeps the crop offsets above honest and stops a fraction of the "y"
          // descender being shaved off by the clip.
          width,
          height,
        }}
        className="max-w-none"
        // The image optimiser refuses SVG unless `dangerouslyAllowSVG` is set
        // globally, and vector art gains nothing from resizing - so serve the
        // file as-is rather than loosening that setting for the whole app.
        unoptimized
        // Never lazy: the mark is always above the fold, and a brand element
        // that pops in after the copy reads as a broken asset.
        loading="eager"
      />
    </span>
  );
}
