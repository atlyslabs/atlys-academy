"use client";

import { DAYS } from "@/content/onboarding/days";
import { legForDay, narrationOpener } from "@/content/onboarding/journey";
import { lessonsForDay } from "@/content/onboarding/lessons";
import { PASS_THRESHOLD } from "@/content/onboarding/quiz";
import type { Day } from "@/content/onboarding/types";
import { useProgress } from "@/lib/progress/provider";
import {
  dayChecklistProgress,
  hasPassedQuiz,
} from "@/lib/progress/selectors";
import { stampSheet } from "@/lib/progress/stamps";
import { romanNumeral } from "@/lib/roman";
import { JourneyTrail } from "./JourneyTrail";
import type { TrailStop } from "./stops";

const PASS_PERCENT = Math.round(PASS_THRESHOLD * 100);

/**
 * One day's chapter as a single broad sheet of paper: a compact masthead over
 * a grid of pinned stop cards. All of the day's actual work lives behind the
 * cards - each one enlarges into a window (see TrailWindow); nothing heavy
 * mounts until it is opened. The whole board is sized to sit inside one
 * viewport, so a day is read at a glance rather than scrolled through.
 */
export function DayDossier({
  day,
  isCurrent,
  onOpenStop,
}: {
  day: Day;
  isCurrent: boolean;
  onOpenStop: (day: Day, stop: TrailStop, origin: DOMRect) => void;
}) {
  return (
    <article
      id={`day-${day.id}`}
      className="paper-board relative overflow-hidden rounded-2xl"
    >
      <FrameBeam active={isCurrent} />
      <Masthead day={day} />
      <JourneyTrail
        day={day}
        onOpen={(stop, origin) => onOpenStop(day, stop, origin)}
      />
    </article>
  );
}

/* ------------------------------------------------------------------------ */

function Masthead({ day }: { day: Day }) {
  const { state } = useProgress();
  const checklist = dayChecklistProgress(state, day);
  const sheet = stampSheet(state, day.id);
  const readable = lessonsForDay(day.id);
  const passed = hasPassedQuiz(state, day.slug);
  const leg = legForDay(day.id);
  // Every stamp on the page, quiz included: the chapter is cleared.
  const cleared = sheet.complete;

  return (
    <header className="relative overflow-hidden px-6 pb-4 pt-5 sm:px-10 sm:pt-6">
      {/* The chapter numeral: etched in ink while the day is open, filled
          with old gold once the page is cleared. */}
      <span
        aria-hidden="true"
        className={`chapter-numeral pointer-events-none absolute -top-5 right-0 hidden text-[150px] md:block ${
          cleared ? "chapter-numeral--cleared" : ""
        }`}
      >
        {romanNumeral(day.id)}
      </span>

      <div className="relative">
        <p className="flex flex-wrap items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand-text">
          <span aria-hidden="true" className="h-px w-6 bg-brand-text/50" />
          Chapter {romanNumeral(day.id)} · Day {day.id} of {DAYS.length}
          <span aria-hidden="true" className="text-brand-text/50">
            ·
          </span>
          <span className="text-ink-dim">
            {leg.code}, {leg.place}
          </span>
          {passed && (
            <span className="ml-1 rounded-full border border-complete/40 bg-complete/10 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.14em] text-complete">
              Boarded
            </span>
          )}
        </p>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <h2 className="max-w-[24ch] font-display text-[28px] italic leading-[1.05] tracking-[-0.01em] text-ink sm:text-[34px]">
            {day.title}
          </h2>

          {/* The day's ledger, riding the title's baseline so the masthead
              stays one compact block. Green inks the finished pieces; gold
              inks the cleared page. */}
          <p className="flex flex-wrap gap-x-5 gap-y-1.5 pb-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim tabular-nums">
            <span
              className={
                checklist.total > 0 && checklist.done === checklist.total
                  ? "text-complete"
                  : undefined
              }
            >
              {checklist.done}/{checklist.total} tasks
            </span>
            {readable.length > 0 && (
              <span>{readable.length} pages of reading</span>
            )}
            <span>
              {day.drills.length} {day.drills.length === 1 ? "drill" : "drills"}
            </span>
            <span className={cleared ? "text-gold" : undefined}>
              {sheet.earned}/{sheet.total} stamps
            </span>
            <span className={passed ? "text-complete" : undefined}>
              quiz at {PASS_PERCENT}%
            </span>
          </p>
        </div>

        {/* The stage line as staged on the home page; the cleared line takes
            over once the page is full. The objective rides along after it. */}
        <p className="mt-2.5 max-w-[92ch] text-[13.5px] leading-relaxed text-ink-muted">
          <em className="font-display text-[15.5px] italic text-ink/85">
            {cleared ? leg.cleared : narrationOpener(leg)}
          </em>{" "}
          <span className="text-ink-dim">—</span> {day.objective}
        </p>
      </div>
    </header>
  );
}

/** The etched perimeter, with the gilded light only on the open day. */
function FrameBeam({ active }: { active: boolean }) {
  return (
    <svg className="beam" aria-hidden="true">
      <rect
        className="beam-hairline"
        x="0"
        y="0"
        rx="15"
        width="100%"
        height="100%"
        pathLength={100}
      />
      {active && (
        <>
          <rect
            className="beam-glow"
            x="0"
            y="0"
            rx="15"
            width="100%"
            height="100%"
            pathLength={100}
            style={BEAM_VARS}
          />
          <rect
            className="beam-core"
            x="0"
            y="0"
            rx="15"
            width="100%"
            height="100%"
            pathLength={100}
            style={BEAM_VARS}
          />
        </>
      )}
    </svg>
  );
}

const BEAM_VARS = {
  "--beam-dur": "14s",
  "--beam-delay": "900ms",
  "--beam-len": "5",
  "--beam-gap": "95",
} as React.CSSProperties;
