import { cn } from "@/lib/utils";

/**
 * Radar of per-day scores - one spoke per day of the journey, however many
 * days that is. Three days plot a triangle, five a pentagon; nothing here
 * assumes a count.
 *
 * Presentational only: it holds no progress state and reads no context, which
 * is what lets a server-rendered page (admin, showing other people's numbers)
 * and a client desk share one plot. Whoever renders it owns the arithmetic.
 *
 * The vertices are labelled by day ("Day 1", "Day 2" ...), not by the leg's
 * airport code: the code is staging flavour, and a manager reading a short
 * spoke needs to know which day to go and fix.
 */

/**
 * SVG user space. Isotropic, so the trig below reads identically on both axes;
 * the rendered viewBox is cropped to the drawn shape by `viewBoxFor`.
 */
const CENTRE = 120;
/**
 * Outer web radius, deliberately well short of the box edge: the vertex labels
 * live in the ring between `RADIUS` and `LABEL_RADIUS`. Both are in the same
 * user space, so a label can never drift off its vertex, and `LABEL_RADIUS`
 * leaves room for the widest label to stay inside the box at any size.
 */
const RADIUS = 68;
const LABEL_RADIUS = 92;

/** The web, as fractions of `RADIUS`. The outer ring is the ceiling, so it
 *  prints solid; the two inside it stay dashed, like a survey grid. */
const RINGS = [1 / 3, 2 / 3, 1] as const;

export interface RadarAxis {
  /** Vertex label, printed at the point. Kept short: "Day 1". */
  label: string;
  /** What that day is, for the readable table under the plot. */
  title: string;
  /** Position along the spoke, 0..1. Clamped here rather than trusted. */
  value: number;
}

/** 0..1 clamped, the way the plot reads it. Shared so callers agree with it. */
function clamp(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

/**
 * Mean of the axes as a whole percent - the number the plot used to print in
 * its own centre. It lives outside the web now (the innermost ring crossed the
 * digits), so callers print it wherever it reads best and this keeps the two
 * figures from drifting apart.
 */
export function radarMean(axes: RadarAxis[]): number {
  if (axes.length === 0) return 0;
  const total = axes.reduce((sum, axis) => sum + clamp(axis.value), 0);
  return Math.round((total / axes.length) * 100);
}

/**
 * Vertex `index` at `(-90 + index * 360 / count)` degrees, so axis 0 points
 * straight up - three axes step by 120 degrees, five by 72. SVG y grows
 * downward, which is why -90 lands at the top rather than the bottom.
 */
function pointAt(index: number, radius: number, count: number) {
  const angle = ((-90 + (index * 360) / count) * Math.PI) / 180;
  return {
    x: CENTRE + radius * Math.cos(angle),
    y: CENTRE + radius * Math.sin(angle),
  };
}

/**
 * Padding around the outermost label point, in user units. The labels are HTML
 * at a fixed 10/13px, so this only has to be near enough: a shade over half a
 * label block wide, and half one tall.
 */
const LABEL_PAD_X = 30;
const LABEL_PAD_Y = 20;

/**
 * The box the plot actually occupies: the web's own vertices and the label ring,
 * padded. Not the square the circumscribed circle would need.
 *
 * A triangle inscribed in that square leaves its bottom third empty, which read
 * as a layout bug in the panel. Fitting the viewBox to the drawn shape means the
 * plot fills its column at any axis count - a pentagon comes out near square,
 * a triangle comes out wide.
 */
function viewBoxFor(count: number) {
  const points = Array.from({ length: count }, (_, index) => [
    pointAt(index, RADIUS, count),
    pointAt(index, LABEL_RADIUS, count),
  ]).flat();
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs) - LABEL_PAD_X;
  const y = Math.min(...ys) - LABEL_PAD_Y;
  return {
    x,
    y,
    width: Math.max(...xs) + LABEL_PAD_X - x,
    height: Math.max(...ys) + LABEL_PAD_Y - y,
  };
}

/** `points` attribute for a web whose radius may vary per vertex. */
function web(radiusFor: (index: number) => number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const { x, y } = pointAt(index, radiusFor(index), count);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

/**
 * Scores drawn as a web with the achieved area filled. Each vertex prints its
 * day and its own percentage, so the shape is a summary and the numbers beside
 * it are the reading.
 */
export function ProgressRadar({
  axes,
  caption,
  size = 280,
  withTable = true,
  className,
}: {
  axes: RadarAxis[];
  /** Caption for the readable table under the plot. Not printed on the page. */
  caption?: string;
  size?: number;
  /**
   * Whether to carry the readable table. Pass `false` when the caller already
   * prints these numbers as text: two readings of one dataset is worse for a
   * screen reader than one, and then the plot is pure decoration.
   */
  withTable?: boolean;
  className?: string;
}) {
  const plotted = axes.map((axis) => {
    const value = clamp(axis.value);
    return { ...axis, value, percent: Math.round(value * 100) };
  });
  const count = plotted.length;
  const mean = radarMean(axes);
  // A polygon with every radius at zero collapses onto the centre and prints a
  // blot over the origin tick, so nothing is drawn until there is something to
  // draw.
  const started = plotted.some((axis) => axis.value > 0);
  const box = viewBoxFor(count);

  return (
    <div className={cn("w-full", className)}>
      {/* One accessible source of truth. The whole plot - web, achieved area
          and vertex labels - is hidden, and the table below carries the same
          numbers as text. */}
      <div
        aria-hidden="true"
        // Capped rather than fixed, so a narrow column shrinks the plot instead
        // of overflowing it. The labels scale with the box; their 10px type
        // does not, which is why the label ring is generous.
        style={{ maxWidth: size, aspectRatio: `${box.width} / ${box.height}` }}
        className="relative mx-auto w-full"
      >
        <svg
          viewBox={`${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.width.toFixed(
            2,
          )} ${box.height.toFixed(2)}`}
          className="absolute inset-0 h-full w-full"
        >
          {RINGS.map((ring) => (
            <polygon
              key={ring}
              points={web(() => RADIUS * ring, count)}
              fill="none"
              stroke="var(--color-hairline-lit)"
              strokeOpacity={ring === 1 ? 0.95 : 0.6}
              strokeWidth={1}
              strokeDasharray={ring === 1 ? undefined : "3 4"}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {plotted.map((axis, index) => {
            const tip = pointAt(index, RADIUS, count);
            return (
              <line
                key={axis.label}
                x1={CENTRE}
                y1={CENTRE}
                x2={tip.x}
                y2={tip.y}
                stroke="var(--color-hairline-lit)"
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* The origin, drawn as the same `+` tick the desk's chart table and
              the landing globe are plotted from. */}
          <path
            d={`M${CENTRE - 4} ${CENTRE}h8M${CENTRE} ${CENTRE - 4}v8`}
            stroke="var(--color-hairline-lit)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {started ? (
            <>
              <polygon
                points={web(
                  (index) => RADIUS * plotted[index].value,
                  count,
                )}
                fill="var(--color-brand-text)"
                fillOpacity={0.16}
                stroke="var(--color-brand-text)"
                strokeWidth={1.75}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {plotted.map((axis, index) => {
                if (axis.value === 0) return null;
                const dot = pointAt(index, RADIUS * axis.value, count);
                return (
                  // The page-coloured rim keeps a dot legible where it lands on
                  // a spoke or a ring.
                  <circle
                    key={axis.label}
                    cx={dot.x}
                    cy={dot.y}
                    r={3}
                    fill="var(--color-brand-text)"
                    stroke="var(--color-page)"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </>
          ) : null}
        </svg>

        {plotted.map((axis, index) => {
          const point = pointAt(index, LABEL_RADIUS, count);
          return (
            <span
              key={axis.label}
              style={{
                left: `${(((point.x - box.x) / box.width) * 100).toFixed(2)}%`,
                top: `${(((point.y - box.y) / box.height) * 100).toFixed(2)}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            >
              <span className="block whitespace-nowrap font-mono text-[10px] uppercase leading-tight tracking-[0.14em] text-ink-dim">
                {axis.label}
              </span>
              <span
                className={cn(
                  "block font-mono text-[13px] font-medium leading-tight tabular-nums",
                  // A day nobody has sat reads dim: the 0 is real, but it is
                  // not a number the eye should stop on.
                  axis.value === 0 ? "text-ink-dim/70" : "text-ink",
                )}
              >
                {axis.percent}%
              </span>
            </span>
          );
        })}
      </div>

      {/* The caption is the readable table's caption only: whoever mounts the
          plot introduces it in their own copy, and printing the line twice under
          the web just crowded it. */}
      {withTable ? (
      <table className="sr-only">
        <caption>{caption ?? "Score by day"}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Name</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {plotted.map((axis) => (
            <tr key={axis.label}>
              <th scope="row">{axis.label}</th>
              <td>{axis.title}</td>
              <td>{axis.percent} percent</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>
              Mean across all {count} days
            </th>
            <td>{mean} percent</td>
          </tr>
        </tfoot>
      </table>
      ) : null}
    </div>
  );
}
