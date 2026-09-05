"use client";

import { DAYS } from "@/content/onboarding/days";
import { ODPAC_SHADOW_TARGET } from "@/content/onboarding/odpac";
import { PASS_THRESHOLD } from "@/content/onboarding/quiz";
import type { Day } from "@/content/onboarding/types";
import { UNLOCK_HOUR, UNLOCK_MINUTE } from "@/lib/dates";
import {
  dayLockReason,
  dayUnlockInstant,
  isDayUnlocked,
} from "@/lib/progress/selectors";
import { stampSheet } from "@/lib/progress/stamps";
import type { ProgressState } from "@/lib/progress/types";
import { romanNumeral } from "@/lib/roman";
import { LockGlyph } from "./JourneyDesk";

const PASS_PERCENT = Math.round(PASS_THRESHOLD * 100);
const UNLOCK_LABEL = `${UNLOCK_HOUR}:${String(UNLOCK_MINUTE).padStart(2, "0")}`;

/**
 * A day the joinee has not earned yet: its name stays readable, its contents
 * stay closed, and the row says precisely what breaks the seal. Three cases:
 *
 * - the previous day still has work in it → what is missing, in numbers;
 * - the previous day is done and only the clock remains → when it opens,
 *   with a live countdown;
 * - the previous day is itself sealed → one quiet line, no lecture.
 */
export function SealedDay({
  day,
  state,
  now,
  gateKey,
  openAllDays = false,
}: {
  day: Day;
  state: ProgressState;
  now: Date;
  gateKey?: string;
  /**
   * Passed through for consistency rather than because this component needs
   * it: with every day open nothing is sealed, so the desk never mounts this.
   * Threading it anyway means the two cannot drift into disagreeing about what
   * is locked if the desk's rendering rule ever changes.
   */
  openAllDays?: boolean;
}) {
  const reason = dayLockReason(state, day.id, gateKey, openAllDays);
  const previous = DAYS.find((candidate) => candidate.id === day.id - 1);
  const previousOpen = previous
    ? isDayUnlocked(state, previous.id, gateKey, openAllDays)
    : false;

  let note: string;
  let clock: string | null = null;

  if (reason === "tomorrow") {
    const unlockAt = dayUnlockInstant(state, day.id);
    note = `Day ${previous?.id} is fully stamped. This chapter unseals ${
      unlockAt ? onWhichMorning(unlockAt, now) : "tomorrow"
    } at ${UNLOCK_LABEL}.`;
    if (unlockAt) clock = `in ${formatWait(unlockAt.getTime() - now.getTime())}`;
  } else if (reason === "odpac") {
    // Named specifically: everything else on the previous day is done, so a
    // message about stamps or the quiz would send them looking in the wrong
    // place for something they have already finished.
    note = `Day ${previous?.id} needs its ODPAC report filed - shadow ${ODPAC_SHADOW_TARGET} and write up what you saw, then this chapter unseals at ${UNLOCK_LABEL} the next morning.`;
  } else if (previous && previousOpen) {
    const sheet = stampSheet(state, previous.id);
    const missing = sheet.total - sheet.earned;
    note = `Opens after Day ${previous.id} is complete - ${
      missing === 1
        ? "one last stamp"
        : `${missing} of ${sheet.total} stamps still to collect`
    }, quiz passed at ${PASS_PERCENT}% - then ${UNLOCK_LABEL} the next morning.`;
  } else {
    note = `Waits on Day ${previous?.id}. One chapter a day, each at ${UNLOCK_LABEL}.`;
  }

  return (
    <section
      id={`day-${day.id}`}
      aria-label={`Day ${day.id}, sealed`}
      // The sealed chapter is the same sheet of paper as an open one - just
      // mostly blank, with the seal's terms written where the work would be.
      className="paper-board relative overflow-hidden rounded-2xl px-6 py-12 sm:px-10 sm:py-16"
    >
      <span
        aria-hidden="true"
        className="chapter-numeral pointer-events-none absolute -top-5 right-0 hidden text-[150px] md:block"
      >
        {romanNumeral(day.id)}
      </span>

      <div className="relative flex max-w-[72ch] items-start gap-5">
        <LockGlyph className="seal-glyph mt-1 size-5 shrink-0 text-ink-dim" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-[24px] italic leading-tight text-ink/75">
              {day.title}
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-dim">
              Day {day.id} · sealed
            </span>
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
            {note}
          </p>
          {clock && (
            <p className="mt-3 font-mono text-[11px] tracking-[0.12em] text-brand-text tabular-nums">
              {clock}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** "today" | "tomorrow" | "on Monday" - whichever morning the seal breaks. */
function onWhichMorning(unlockAt: Date, now: Date): string {
  const sameDay = unlockAt.toDateString() === now.toDateString();
  if (sameDay) return "today";
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 1);
  if (unlockAt.toDateString() === dayAfter.toDateString()) return "tomorrow";
  return `on ${unlockAt.toLocaleDateString(undefined, { weekday: "long" })}`;
}

/** "14h 05m" / "45m" - rounded up so the last minute never reads as 0m. */
function formatWait(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${minutes}m`;
}
