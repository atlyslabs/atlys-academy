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
}: {
  day: Day;
  state: ProgressState;
  now: Date;
  gateKey?: string;
}) {
  const reason = dayLockReason(state, day.id, gateKey);
  const previous = DAYS.find((candidate) => candidate.id === day.id - 1);
  const previousOpen = previous
    ? isDayUnlocked(state, previous.id, gateKey)
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
      className="scroll-mt-6 rounded-2xl border border-hairline/70 bg-white/[0.012] px-5 py-5 sm:px-7"
    >
      <div className="flex items-center gap-4 sm:gap-6">
        <span
          aria-hidden="true"
          className="w-9 shrink-0 text-center font-display text-[24px] italic leading-none text-ink-dim/45"
        >
          {romanNumeral(day.id)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[15px] font-medium text-ink-dim">
              {day.title}
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-dim/70">
              Day {day.id}
            </span>
          </p>
          <p className="mt-1 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-dim/85">
            {note}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <LockGlyph className="seal-glyph size-3.5 text-ink-dim" />
          {clock && (
            <span className="font-mono text-[10px] tracking-[0.12em] text-brand-text tabular-nums">
              {clock}
            </span>
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
