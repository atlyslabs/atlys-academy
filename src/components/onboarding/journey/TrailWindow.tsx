"use client";

import { useEffect, useRef } from "react";
import type { Day } from "@/content/onboarding/types";
import { romanNumeral } from "@/lib/roman";
import type { TrailStop } from "./stops";

const OPEN_MS = 460;
const CLOSE_MS = 260;
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * The enlarging window. A trail card hands over its bounding rect; the
 * dialog opens at full size immediately (so layout is honest), then plays a
 * FLIP morph - first frame transformed back onto the card, settling to
 * identity - so the card visually *becomes* the window. Closing runs the
 * same morph in reverse before `close()`, shrinking the work back onto its
 * pin. Deep-linked opens have no origin rect and simply rise in; reduced
 * motion collapses everything to a fade.
 *
 * Native `<dialog>` carries the a11y weight: focus trap, top layer, Esc,
 * and focus return to the invoking card on close.
 */
export function TrailWindow({
  day,
  stop,
  origin,
  now,
  onClose,
}: {
  day: Day;
  stop: TrailStop;
  origin: DOMRect | null;
  now: Date;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduce) return;

    // Backdrop fades in regardless of morph availability; pseudo-element
    // animation is Chromium-fine and a silent no-op elsewhere.
    try {
      dialog.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: OPEN_MS * 0.7,
        easing: "ease-out",
        pseudoElement: "::backdrop",
      });
    } catch {
      /* older engines: backdrop simply appears */
    }

    const final = dialog.getBoundingClientRect();
    if (origin && final.width > 0 && final.height > 0) {
      const dx = origin.left - final.left;
      const dy = origin.top - final.top;
      const sx = origin.width / final.width;
      const sy = origin.height / final.height;
      dialog.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
            opacity: 0.6,
          },
          { transform: "none", opacity: 1 },
        ],
        { duration: OPEN_MS, easing: EASE_OUT },
      );
      dialog
        .querySelector("[data-window-body]")
        ?.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 280,
          delay: OPEN_MS * 0.4,
          fill: "backwards",
          easing: "ease-out",
        });
    } else {
      dialog.animate(
        [
          { opacity: 0, transform: "translateY(14px) scale(0.985)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 260, easing: EASE_OUT },
      );
    }
  }, [origin]);

  function requestClose() {
    const dialog = dialogRef.current;
    if (!dialog || closing.current) return;
    closing.current = true;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduce) {
      dialog.close();
      onClose();
      return;
    }

    try {
      dialog.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: CLOSE_MS,
        easing: "ease-in",
        pseudoElement: "::backdrop",
      });
    } catch {
      /* see above */
    }

    const final = dialog.getBoundingClientRect();
    const frames =
      origin && final.width > 0
        ? [
            { transform: "none", opacity: 1 },
            {
              transform: `translate(${origin.left - final.left}px, ${
                origin.top - final.top
              }px) scale(${origin.width / final.width}, ${
                origin.height / final.height
              })`,
              opacity: 0,
            },
          ]
        : [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: "translateY(10px) scale(0.99)" },
          ];

    const animation = dialog.animate(frames, {
      duration: CLOSE_MS,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
    });
    animation.finished
      .catch(() => undefined)
      .finally(() => {
        dialog.close();
        onClose();
      });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Day ${day.id} · ${stop.title}`}
      className="trail-window"
      onCancel={(event) => {
        // Esc: run the exit morph instead of the instant native close.
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        // Clicks on the backdrop target the dialog element itself; the inner
        // frame swallows everything else.
        if (event.target === dialogRef.current) requestClose();
      }}
    >
      {/* The home card's etched frame, radius-matched to the window. */}
      <svg className="beam" aria-hidden="true">
        <rect
          className="beam-hairline"
          x="0"
          y="0"
          rx="19"
          width="100%"
          height="100%"
          pathLength={100}
        />
        <rect
          className="beam-glow"
          x="0"
          y="0"
          rx="19"
          width="100%"
          height="100%"
          pathLength={100}
          style={WINDOW_BEAM_VARS}
        />
        <rect
          className="beam-core"
          x="0"
          y="0"
          rx="19"
          width="100%"
          height="100%"
          pathLength={100}
          style={WINDOW_BEAM_VARS}
        />
      </svg>

      <div className="relative flex h-full min-h-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-4 sm:px-8">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-text">
              Chapter {romanNumeral(day.id)} · Day {day.id}
            </p>
            {!stop.chromeless && (
              <h2 className="mt-1 truncate font-display text-[22px] italic leading-tight text-ink">
                {stop.title}
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline-lit text-ink-muted transition-colors hover:border-ink-dim hover:bg-white/[0.05] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text"
            aria-label="Close window"
          >
            <svg
              viewBox="0 0 12 12"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="m2.5 2.5 7 7M9.5 2.5l-7 7" />
            </svg>
          </button>
        </header>

        <div
          data-window-body
          className={
            stop.fullBleed
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 sm:py-7"
          }
        >
          {stop.render({ now })}
        </div>
      </div>
    </dialog>
  );
}

const WINDOW_BEAM_VARS = {
  "--beam-dur": "16s",
  "--beam-delay": "700ms",
  "--beam-len": "5",
  "--beam-gap": "95",
} as React.CSSProperties;
