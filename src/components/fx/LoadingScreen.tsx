"use client";

import { cloneElement, useEffect, type ReactElement } from "react";
import { DAYS } from "@/content/onboarding/days";
import { romanNumeral } from "@/lib/roman";

/**
 * The cold open.
 *
 * A black stage over the app's first paint: travel-shaped geometry resolves
 * around the lockup box and a white light beam traces every perimeter, the
 * box included. One Roman numeral per day ticks in. It plays once per
 * session; an inline script in the root layout stamps `data-boot="play"` on
 * <html> before first paint (so repeat visits and JS-off readers never see
 * it), and this component lifts it once the real work - font loading - is
 * done, held to a floor so the beams get one readable pass and a ceiling so
 * it never stalls.
 *
 * Self-contained on purpose: its motion lives in the `cold-open` and `beam`
 * blocks in globals.css. If a future design wants it gone, delete this
 * component, those CSS blocks, and the inline script in layout.tsx.
 */

const FLOOR_MS = 2100;
const CEILING_MS = 3400;
const LIFT_MS = 700;

type BeamVars = React.CSSProperties & Record<`--${string}`, string>;

type ShapeEl = ReactElement<React.SVGProps<SVGElement>>;

/** Hairline + travelling light for one closed SVG shape. */
function BeamShape({
  shape,
  dur,
  delay,
}: {
  shape: ShapeEl;
  dur: string;
  delay: string;
}) {
  const vars: BeamVars = { "--beam-dur": dur, "--beam-delay": delay };
  return (
    <>
      {cloneElement(shape, {
        className: "beam-hairline beam-hairline--draw",
        pathLength: 100,
      })}
      {cloneElement(shape, {
        className: "beam-glow",
        pathLength: 100,
        style: vars,
      })}
      {cloneElement(shape, {
        className: "beam-core",
        pathLength: 100,
        style: vars,
      })}
    </>
  );
}

export function LoadingScreen() {
  useEffect(() => {
    if (document.documentElement.dataset.boot !== "play") return;

    let lift = 0;
    let done = 0;
    const mounted = performance.now();

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        lift = window.setTimeout(resolve, Math.max(0, ms));
      });

    let cancelled = false;
    (async () => {
      // The honest part: wait for fonts, but never past the ceiling...
      await Promise.race([
        document.fonts?.ready ?? Promise.resolve(),
        wait(CEILING_MS - (performance.now() - mounted)),
      ]);
      // ...and never lift before the floor, so the beams get a full pass.
      await wait(FLOOR_MS - (performance.now() - mounted));
      if (cancelled) return;

      document.documentElement.dataset.boot = "done";
      done = window.setTimeout(() => {
        delete document.documentElement.dataset.boot;
      }, LIFT_MS);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(lift);
      window.clearTimeout(done);
    };
  }, []);

  return (
    <div className="cold-open" aria-hidden="true">
      {/* The geometry of the trip: a globe, a paper plane, a ticket, a
          compass rose. Each one is an outline with a beam walking it. */}
      <div
        className="cold-open__shape"
        style={{ right: "13vw", top: "16vh", "--d": "340ms" } as BeamVars}
      >
        <div className="cold-open__float" style={{ "--fd": "-2s" } as BeamVars}>
          <svg width="150" height="150" viewBox="0 0 150 150">
            <ellipse
              className="beam-hairline"
              cx="75"
              cy="75"
              rx="31"
              ry="72"
              opacity="0.5"
            />
            <line
              className="beam-hairline"
              x1="3"
              y1="75"
              x2="147"
              y2="75"
              opacity="0.5"
            />
            <BeamShape
              shape={<circle cx="75" cy="75" r="72" />}
              dur="7s"
              delay="620ms"
            />
          </svg>
        </div>
      </div>

      <div
        className="cold-open__shape hidden md:block"
        style={{ left: "12vw", bottom: "19vh", "--d": "480ms" } as BeamVars}
      >
        <div className="cold-open__float" style={{ "--fd": "-5s" } as BeamVars}>
          <svg width="128" height="112" viewBox="0 0 128 112">
            <line
              className="beam-hairline"
              x1="64"
              y1="6"
              x2="64"
              y2="106"
              opacity="0.5"
            />
            <BeamShape
              shape={<polygon points="64,6 122,106 6,106" />}
              dur="9s"
              delay="880ms"
            />
          </svg>
        </div>
      </div>

      <div
        className="cold-open__shape hidden md:block"
        style={{ left: "16vw", top: "14vh", "--d": "420ms" } as BeamVars}
      >
        <div className="cold-open__float" style={{ "--fd": "-7s" } as BeamVars}>
          <svg width="164" height="92" viewBox="0 0 164 92">
            <line
              className="beam-hairline"
              x1="112"
              y1="4"
              x2="112"
              y2="88"
              strokeDasharray="3 5"
              opacity="0.6"
            />
            <BeamShape
              shape={<rect x="2" y="2" width="160" height="88" rx="8" />}
              dur="8s"
              delay="740ms"
            />
          </svg>
        </div>
      </div>

      <div
        className="cold-open__shape"
        style={{ right: "14vw", bottom: "17vh", "--d": "560ms" } as BeamVars}
      >
        <div className="cold-open__float" style={{ "--fd": "-4s" } as BeamVars}>
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle className="beam-hairline" cx="52" cy="52" r="14" opacity="0.5" />
            <BeamShape
              shape={<polygon points="52,3 101,52 52,101 3,52" />}
              dur="10s"
              delay="1000ms"
            />
          </svg>
        </div>
      </div>

      <div className="cold-open__frame">
        <svg className="beam">
          <BeamShape
            shape={<rect x="0" y="0" width="100%" height="100%" />}
            dur="5.5s"
            delay="1150ms"
          />
        </svg>

        <p className="lockup">
          <span
            className="lockup__line"
            style={{ "--d": "260ms" } as BeamVars}
          >
            The
          </span>
          <span
            className="lockup__line lockup__line--serif"
            style={{ "--d": "400ms" } as BeamVars}
          >
            atlys
          </span>
          <span
            className="lockup__line"
            style={{ "--d": "540ms" } as BeamVars}
          >
            Academy
          </span>
        </p>

        <p className="cold-open__numerals">
          {DAYS.map((day, index) => (
            <span
              key={day.id}
              className="cold-open__numeral"
              style={{ "--d": `${760 + index * 110}ms` } as BeamVars}
            >
              {romanNumeral(day.id)}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
