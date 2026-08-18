"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DAYS } from "@/content/onboarding/days";
import { JOURNEY_LEGS, narrationOpener } from "@/content/onboarding/journey";
import { LESSONS } from "@/content/onboarding/lessons";
import type { DayId } from "@/content/onboarding/types";
import { gateDayKey } from "@/lib/dates";
import { romanNumeral } from "@/lib/roman";
import { localProgressStore } from "@/lib/progress/local-store";
import { dayChecklistProgress, resumeDay } from "@/lib/progress/selectors";
import { stampTotals } from "@/lib/progress/stamps";
import { emptyProgress, type ProgressState } from "@/lib/progress/types";
import { AsciiGlobe } from "@/components/fx/AsciiGlobe";
import { PointerDiorama } from "@/components/fx/PointerDiorama";

/**
 * The edition cover: the whole landing is one centred card floating over the
 * ASCII world, in the manner of a title page. Everything a joinee can do
 * lives inside the card - every chapter, the passport, the leaderboard,
 * the admin desk, sign-in - and the globe behind it walks the route one stop
 * at a time, captioned from journey.ts.
 *
 * Hovering (or keyboard-focusing) a chapter row swings the globe to that
 * day's stop; when nobody is looking, the tour resumes on its own. The row
 * highlight, the breadcrumb, and the caption all follow the same `storyDay`.
 *
 * Every number is derived from src/content/onboarding - day count, lesson
 * count, drill count, stamp total - never typed in. Progress comes from the
 * local store (the write-through cache in remote mode), read once on mount;
 * before it loads, the derived zero-state renders, which is also exactly
 * what the server sends.
 */

const DAY_COUNT = DAYS.length;
const DRILL_COUNT = new Set(DAYS.flatMap((day) => day.drills ?? [])).size;
/** Placeholder lessons have no "mark as read" control, so they don't count. */
const READABLE_LESSONS = LESSONS.filter((lesson) => lesson.body !== null);
const LESSON_COUNT = READABLE_LESSONS.length;
const EMPTY = emptyProgress();

const STORY = JOURNEY_LEGS.map((leg) => ({
  dayId: leg.dayId,
  code: leg.code,
  line: narrationOpener(leg),
}));

export function EditionCover() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [hoverDay, setHoverDay] = useState<DayId | null>(null);
  const [tourDay, setTourDay] = useState<DayId>(1);

  useEffect(() => {
    let alive = true;
    void localProgressStore.load().then((state) => {
      if (alive) setProgress(state);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onStoryDay = useCallback((day: DayId) => setTourDay(day), []);

  // Hover intent, not raw hover: a row only claims the camera once the
  // pointer has rested on it, and letting go gets a longer grace. On the
  // 1px divider between two rows the browser fires leave/enter pairs with
  // every wiggle (the :active scale shifts the edge under the cursor too);
  // committed instantly, each pair would retarget the globe and the story
  // caption - the jitter. Debounced, boundary noise changes nothing.
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverIntent = useCallback((day: DayId | null, immediate = false) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (immediate) {
      hoverTimer.current = null;
      setHoverDay(day);
      return;
    }
    hoverTimer.current = setTimeout(
      () => setHoverDay(day),
      day == null ? 220 : 130,
    );
  }, []);
  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  const state = progress ?? EMPTY;
  const storyDay = hoverDay ?? tourDay;
  // `progress` only exists client-side, so the clock read cannot desync SSR.
  const currentDay = progress ? resumeDay(progress, gateDayKey()) : 1;
  const stamps = stampTotals(state);
  const lessonsRead = READABLE_LESSONS.filter(
    (lesson) => lesson.itemKey in state.completedItems,
  ).length;
  const storyLine =
    STORY.find((stop) => stop.dayId === storyDay) ?? STORY[0];

  return (
    <PointerDiorama
      className="relative min-h-[100dvh] overflow-hidden bg-page text-ink"
      rates={{ wash: 6, globe: 11 }}
    >
      <div data-plate="wash" className="night-wash" />
      <div className="night-vignette" />
      <div className="grain" />

      {/* The world behind the glass. Decorative and pointer-transparent:
          hover excitation is read from window coordinates in the canvas. */}
      <div
        data-plate="globe"
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40 md:opacity-100"
      >
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-[6%] rounded-full"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 50%, rgb(0 0 107 / 0.38), transparent 70%)",
            }}
          />
          <AsciiGlobe
            className="relative aspect-square w-[min(118vh,94vw)]"
            focusDay={hoverDay}
            onStoryDay={onStoryDay}
          />
        </div>
      </div>

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col items-center justify-center px-4 py-4 sm:px-6">
        <section
          aria-label="The Atlys Academy"
          data-globe-calm=""
          className="stage-card w-full px-7 py-7 sm:px-10 sm:py-8"
        >
          <svg className="beam" aria-hidden="true">
            <rect
              className="beam-hairline beam-hairline--draw"
              x="0"
              y="0"
              width="100%"
              height="100%"
              pathLength={100}
            />
            <rect
              className="beam-glow"
              x="0"
              y="0"
              width="100%"
              height="100%"
              pathLength={100}
              style={beamVars}
            />
            <rect
              className="beam-core"
              x="0"
              y="0"
              width="100%"
              height="100%"
              pathLength={100}
              style={beamVars}
            />
          </svg>

          <h1
            className="lockup"
            style={{ "--lockup-size": "33px" } as React.CSSProperties}
          >
            <span
              className="lockup__line"
              style={{ "--d": "120ms" } as React.CSSProperties}
            >
              The
            </span>
            <span
              className="lockup__line lockup__line--serif"
              style={{ "--d": "240ms" } as React.CSSProperties}
            >
              atlys
            </span>
            <span
              className="lockup__line"
              style={{ "--d": "360ms" } as React.CSSProperties}
            >
              Academy
            </span>
          </h1>

          {/* The colophon rule: a short gilded line under the masthead. */}
          <div aria-hidden="true" className="mt-5 h-px w-10 bg-brass/80" />

          <p className="mt-4 text-[14px] leading-relaxed text-ink-dim">
            Pre-checkout Sales onboarding.
            <br />
            {DAY_COUNT} days, {LESSON_COUNT} lessons, {DRILL_COUNT} drills.
          </p>

          <nav aria-label={`The ${DAY_COUNT} days`} className="mt-5">
            <ol>
              {DAYS.map((day) => {
                const { done, total } = dayChecklistProgress(state, day);
                const isStory = storyDay === day.id;
                const isCurrent = currentDay === day.id;
                return (
                  <li
                    key={day.id}
                    className="border-t border-hairline/80 first:border-t-0"
                  >
                    <Link
                      href={`/onboarding#day-${day.id}`}
                      className="chapter-row group -mx-3.5 flex items-center gap-3 rounded-lg px-3.5 py-[11px] sm:gap-4"
                      onMouseEnter={() => hoverIntent(day.id)}
                      onMouseLeave={() => hoverIntent(null)}
                      onFocus={() => hoverIntent(day.id, true)}
                      onBlur={() => hoverIntent(null)}
                    >
                      <span
                        aria-hidden="true"
                        className={`w-7 shrink-0 font-display text-[15px] leading-none transition-colors duration-200 sm:w-9 sm:text-[16px] ${
                          isCurrent
                            ? "text-brass"
                            : isStory
                              ? "text-ink"
                              : "text-ink-dim group-hover:text-ink"
                        }`}
                      >
                        {romanNumeral(day.id)}
                      </span>
                      <span
                        className={`flex-1 truncate text-[14.5px] font-medium transition-colors duration-200 sm:text-[15.5px] ${
                          isCurrent
                            ? "text-ink"
                            : "text-ink-muted group-hover:text-ink"
                        }`}
                      >
                        {day.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-2.5">
                        <span
                          className={`text-[12px] tabular-nums text-ink-dim transition-opacity duration-200 ${
                            isCurrent
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {done}/{total}
                        </span>
                        <ProgressRing fraction={total ? done / total : 0} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="mt-5 border-t border-hairline pt-4">
            <p className="text-[12.5px] tabular-nums text-ink-dim">
              <span className={stamps.earned > 0 ? "text-brand-text" : ""}>
                {stamps.earned}
              </span>
              /{stamps.total} stamps
              <span aria-hidden="true" className="mx-2.5 text-ink-dim/50">
                &middot;
              </span>
              <span className={lessonsRead > 0 ? "text-brand-text" : ""}>
                {lessonsRead}
              </span>
              /{LESSON_COUNT} lessons read
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px]">
              <Link
                href="/onboarding/passport"
                className="text-ink-muted transition-colors hover:text-ink"
              >
                Passport
              </Link>
              <Link
                href="/onboarding/leaderboard"
                className="text-ink-muted transition-colors hover:text-ink"
              >
                Leaderboard
              </Link>
              <Link
                href="/admin"
                className="text-ink-dim transition-colors hover:text-ink"
              >
                Admin
              </Link>
              <Link
                href="/signin"
                className="ml-auto text-ink underline decoration-hairline-lit underline-offset-4 transition-colors hover:decoration-ink-dim"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* The stage line: which stop the camera is on, and its opening
            beat. Pure staging flavour, so it is hidden from readers. */}
        {/* Reserved at the tallest caption's height (3 lines on phones,
            2 at the card's width): the card is centered together with this
            block, so if the block breathed with the text, every caption
            change would bob the whole card up and down. */}
        <div
          aria-hidden="true"
          className="pointer-events-none mt-6 min-h-[104px] text-center sm:min-h-[80px]"
        >
          <p className="font-mono text-[10.5px] tracking-[0.18em] text-ink-dim">
            {STORY.map((stop, i) => (
              <span key={stop.code}>
                {i > 0 && <span className="mx-2 text-ink-dim/45">&rarr;</span>}
                <span
                  className={`transition-colors duration-300 ${
                    stop.dayId === storyDay ? "text-ink" : ""
                  }`}
                >
                  {stop.code}
                </span>
              </span>
            ))}
          </p>
          <p
            key={storyLine.dayId}
            className="stage-caption mx-auto mt-2.5 max-w-[46ch] font-display text-[18px] italic leading-snug text-[#eae3d1]/95"
          >
            {storyLine.line}
          </p>
        </div>
      </main>
    </PointerDiorama>
  );
}

/** A quiet per-day meter: the day's checklist, as a ring filling up. */
function ProgressRing({ fraction }: { fraction: number }) {
  const R = 5.5;
  const C = 2 * Math.PI * R;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      className="-rotate-90"
    >
      <circle
        cx="7"
        cy="7"
        r={R}
        fill="none"
        stroke="var(--color-hairline-lit)"
        strokeWidth="1.5"
      />
      {fraction > 0 && (
        <circle
          cx="7"
          cy="7"
          r={R}
          fill="none"
          stroke="var(--color-brand-text)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={`${C * fraction} ${C}`}
        />
      )}
    </svg>
  );
}

const beamVars = {
  "--beam-dur": "8s",
  "--beam-delay": "1100ms",
  "--beam-len": "9",
  "--beam-gap": "91",
} as React.CSSProperties;
