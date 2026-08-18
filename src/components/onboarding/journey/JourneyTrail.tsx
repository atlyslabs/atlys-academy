"use client";

import { LAST_DAY_ID } from "@/content/onboarding/days";
import { Fragment, useEffect, useRef, useState } from "react";
import type { Day } from "@/content/onboarding/types";
import { useProgress } from "@/lib/progress/provider";
import { stopsForDay, type TrailStop } from "./stops";

/**
 * A day's stops laid out as a pinboard trail: numbered cards pinned slightly
 * askew, zig-zagging down the page, stitched together by a dotted thread that
 * runs pin to pin - each card a window that enlarges into the real work when
 * clicked. The pattern (pin grommet, tilt, stitches, the closing hand-note)
 * is the "how we work" board from the reference, re-set in the night theme.
 */
export function JourneyTrail({
  day,
  onOpen,
}: {
  day: Day;
  onOpen: (stop: TrailStop, origin: DOMRect) => void;
}) {
  const { state } = useProgress();
  const stops = stopsForDay(day);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const checkable = stops.filter((stop) => stop.key !== "brief" && stop.key !== "people");
  const allDone = checkable.every((stop) => stop.done(state));

  return (
    <div className="px-6 pb-12 sm:px-12 sm:pb-14">
      {/* relative so the stitch overlay and the pins share one geometry. */}
      <div ref={boardRef} className="relative">
        <TrailStitches boardRef={boardRef} />

        <ol className="relative flex flex-col">
          {stops.map((stop, index) => {
            const left = index % 2 === 0;
            const done = stop.done(state);
            return (
              <Fragment key={stop.key}>
                {index > 0 && (
                  <li aria-hidden="true" className="h-14 w-full sm:h-20" />
                )}
                <li
                  className={`flex w-full ${left ? "sm:justify-start" : "sm:justify-end"}`}
                >
                  <button
                    type="button"
                    onClick={(event) =>
                      onOpen(stop, event.currentTarget.getBoundingClientRect())
                    }
                    style={
                      {
                        "--tilt": `${left ? -1.2 : 1.3}deg`,
                      } as React.CSSProperties
                    }
                    className={`trail-card group relative w-full rounded-2xl border border-hairline px-6 pb-5 pt-7 text-left sm:w-[62%] ${
                      done ? "trail-card--stamped" : "bg-raised/70"
                    }`}
                    aria-haspopup="dialog"
                  >
                    {/* The pin. The stitch overlay measures these. */}
                    <span
                      aria-hidden="true"
                      data-trail-pin
                      className="pin-grommet absolute -top-3 left-1/2 -translate-x-1/2"
                    />

                    {/* The counter's rubber impression on a finished stop. */}
                    {done && (
                      <span aria-hidden="true" className="done-imprint">
                        Stamped
                      </span>
                    )}

                    <span className="flex items-baseline gap-3">
                      <span className="font-display text-[15px] italic leading-none text-brand-text tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-display text-[21px] italic leading-tight text-ink">
                        {stop.title}
                      </span>
                    </span>

                    <span className="mt-2 block text-[13px] leading-relaxed text-ink-muted">
                      {stop.kicker}
                    </span>

                    <span className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3.5">
                      <span
                        className={`truncate font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums ${
                          done ? "text-[color:var(--done-ink)]" : "text-ink-dim"
                        }`}
                      >
                        {done && (
                          <span aria-hidden="true" className="mr-1.5">
                            ✓
                          </span>
                        )}
                        {stop.teaser(state)}
                      </span>

                      {/* The enlarge affordance, from the gallery reference. */}
                      <span
                        aria-hidden="true"
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-hairline-lit text-ink-muted transition-all duration-200 group-hover:border-brand-text/60 group-hover:bg-brand/15 group-hover:text-ink"
                      >
                        <svg
                          viewBox="0 0 12 12"
                          className="size-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4.75 2.5h4.75v4.75" />
                          <path d="M9.5 2.5 2.5 9.5" />
                        </svg>
                      </span>
                    </span>
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </div>

      {/* The end of the trail, in the reference's hand-note register. Gold
          once every stop on the board carries its stamp. */}
      <p
        className={`mt-9 flex items-center justify-center gap-3 text-center font-display text-[17px] italic ${
          allDone ? "text-gold" : "text-ink-muted"
        }`}
      >
        <span aria-hidden="true" className={allDone ? "" : "text-ink-dim"}>
          ✳
        </span>
        {allDone
          ? day.id === LAST_DAY_ID
            ? "Every page stamped. Go make the world smaller."
            : "Page stamped, gate open. Onwards."
          : day.id === LAST_DAY_ID
            ? "Ready for the real thing."
            : "Ready to be stamped."}
      </p>
    </div>
  );
}

/**
 * The dotted thread. Pin positions are measured (via `[data-trail-pin]`)
 * rather than assumed, so every stitch starts and ends exactly on a grommet
 * at any viewport width; a ResizeObserver on the board re-measures whenever
 * the cards reflow. Each stitch is a lazy S: it leaves a pin vertically,
 * slackens sideways through the gutter, and lands on the next pin
 * vertically. Drawn behind the cards, so the thread ducks under each note
 * the way it does on a real pinboard.
 */
function TrailStitches({
  boardRef,
}: {
  boardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [geometry, setGeometry] = useState<{
    width: number;
    height: number;
    paths: string[];
  } | null>(null);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const observer = new ResizeObserver(() => {
      const box = board.getBoundingClientRect();
      const pins = [...board.querySelectorAll("[data-trail-pin]")].map(
        (pin) => {
          const rect = pin.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2 - box.left,
            y: rect.top + rect.height / 2 - box.top,
          };
        },
      );

      const paths: string[] = [];
      for (let i = 1; i < pins.length; i++) {
        const from = pins[i - 1];
        const to = pins[i];
        const drop = to.y - from.y;
        // Control points hang below the pins like thread with slack in it.
        const sag = Math.max(44, drop * 0.5);
        paths.push(
          `M ${from.x} ${from.y + 11} C ${from.x} ${from.y + sag}, ${to.x} ${
            to.y - sag * 0.9
          }, ${to.x} ${to.y - 11}`,
        );
      }
      setGeometry({ width: box.width, height: box.height, paths });
    });

    observer.observe(board);
    return () => observer.disconnect();
  }, [boardRef]);

  if (!geometry) return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
    >
      {geometry.paths.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="var(--color-hairline-lit)"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeDasharray="0.4 7.6"
        />
      ))}
    </svg>
  );
}
