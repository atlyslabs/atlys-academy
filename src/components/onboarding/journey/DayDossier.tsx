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
 * One day's chapter: the two-tone masthead over its pinboard trail. All of
 * the day's actual work lives behind the trail's cards - each one enlarges
 * into a window (see TrailWindow); nothing heavy mounts until it is opened.
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
    <article id={`day-${day.id}`} className="desk-card scroll-mt-6">
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
  const readable = lessonsForDay(day.id).filter(
    (lesson) => lesson.body !== null,
  );
  const passed = hasPassedQuiz(state, day.slug);
  const leg = legForDay(day.id);
  // Every stamp on the page, quiz included: the chapter is cleared.
  const cleared = sheet.complete;

  return (
    <header className="relative overflow-hidden px-6 pb-8 pt-9 sm:px-12 sm:pb-9 sm:pt-12">
      {/* The chapter numeral: etched while the day is open, filled with
          trophy gold once the page is cleared. */}
      <span
        aria-hidden="true"
        className={`chapter-numeral pointer-events-none absolute -right-2 -top-6 hidden text-[190px] md:block ${
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
            <span className="ml-1 rounded-full border border-complete/40 bg-complete/10 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.14em] text-[#57d0a3]">
              Boarded
            </span>
          )}
        </p>

        <h2 className="mt-4 max-w-[16ch] font-display text-[42px] italic leading-[1.04] tracking-[-0.01em] text-ink sm:text-[54px]">
          {day.title}
        </h2>

        {/* The stage line, exactly as the home page stages this stop; the
            cleared line takes over once the page is full. */}
        <p className="mt-4 max-w-[54ch] font-display text-[17px] italic leading-snug text-ink/90">
          {narrationOpener(leg)}
        </p>

        {cleared && (
          <p className="mt-3 max-w-[54ch] font-display text-[15px] italic leading-snug text-gold">
            {leg.cleared}
          </p>
        )}

        <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-muted">
          {day.objective}
        </p>

        {/* The day's ledger. Each figure carries its own state ink: green
            once that piece is done, gold when the whole page is. */}
        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim tabular-nums">
          <span
            className={
              checklist.total > 0 && checklist.done === checklist.total
                ? "text-[#57d0a3]"
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
          <span className={passed ? "text-[#57d0a3]" : undefined}>
            quiz at {PASS_PERCENT}%
          </span>
        </p>
      </div>
    </header>
  );
}

/** The etched perimeter, with the travelling light only on the open day. */
function FrameBeam({ active }: { active: boolean }) {
  return (
    <svg className="beam" aria-hidden="true">
      <rect
        className="beam-hairline"
        x="0"
        y="0"
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
            width="100%"
            height="100%"
            pathLength={100}
            style={BEAM_VARS}
          />
          <rect
            className="beam-core"
            x="0"
            y="0"
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
