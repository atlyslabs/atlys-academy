"use client";

import { LAST_DAY_ID } from "@/content/onboarding/days";
import type { Day } from "@/content/onboarding/types";
import { useProgress } from "@/lib/progress/provider";
import { stopsForDay, type TrailStop } from "./stops";

/**
 * A day's stops as a pinboard grid: numbered cards pinned slightly askew,
 * filling the paper board's width instead of zig-zagging down the page - the
 * whole day reads in one look, no scroll. Each card is a window that enlarges
 * into the real work when clicked; the pin grommet and tilt keep the "notes
 * pinned to a board" register the trail has always had.
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
  const checkable = stops.filter(
    (stop) => stop.key !== "brief" && stop.key !== "people",
  );
  const allDone = checkable.every((stop) => stop.done(state));

  return (
    <div className="px-6 pb-5 sm:px-10 sm:pb-6">
      <ol className="trail-grid">
        {stops.map((stop, index) => {
          const done = stop.done(state);
          return (
            <li key={stop.key} className="flex">
              <button
                type="button"
                onClick={(event) =>
                  onOpen(stop, event.currentTarget.getBoundingClientRect())
                }
                style={
                  {
                    "--tilt": `${index % 2 === 0 ? -0.6 : 0.7}deg`,
                  } as React.CSSProperties
                }
                className={`trail-card group relative flex w-full flex-col rounded-2xl border border-hairline px-4 pb-3.5 pt-5 text-left ${
                  done ? "trail-card--stamped" : ""
                }`}
                aria-haspopup="dialog"
              >
                {/* The pin holding the note to the board. */}
                <span
                  aria-hidden="true"
                  className="pin-grommet absolute -top-[9px] left-1/2 -translate-x-1/2"
                />

                {/* The counter's rubber impression on a finished stop. */}
                {done && (
                  <span aria-hidden="true" className="done-imprint">
                    Stamped
                  </span>
                )}

                <span className="flex min-w-0 items-baseline gap-2.5">
                  <span className="font-display text-[13px] italic leading-none text-brand-text tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate font-display text-[17.5px] italic leading-tight text-ink ${
                      done ? "pr-16" : ""
                    }`}
                  >
                    {stop.title}
                  </span>
                </span>

                <span className="mt-1.5 block truncate text-[12px] leading-relaxed text-ink-muted">
                  {stop.kicker}
                </span>

                <span className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-2.5">
                  <span
                    className={`truncate pt-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] tabular-nums ${
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
                    className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline-lit text-ink-muted transition-all duration-200 group-hover:border-brand-text/60 group-hover:bg-brand/10 group-hover:text-ink"
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
          );
        })}
      </ol>

      {/* The end of the trail, in the reference's hand-note register. Gold
          once every stop on the board carries its stamp. */}
      <p
        className={`mt-4 flex items-center justify-center gap-3 text-center font-display text-[15px] italic ${
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
