"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { DAYS } from "@/content/onboarding/days";
import { lessonsForDay } from "@/content/onboarding/lessons";
import { MENTORS_BY_DAY } from "@/content/onboarding/mentors";
import { PASS_THRESHOLD } from "@/content/onboarding/quiz";
import { TOOLS } from "@/content/onboarding/tools";
import type { Day } from "@/content/onboarding/types";
import { UNLOCK_HOUR, UNLOCK_MINUTE } from "@/lib/dates";
import { DRILL_COMPONENTS, DRILL_LABELS } from "@/lib/drill-registry";
import { useProgress } from "@/lib/progress/provider";
import {
  bestAttempt,
  dayChecklistProgress,
  hasPassedQuiz,
  isItemDone,
} from "@/lib/progress/selectors";
import { stampSheet } from "@/lib/progress/stamps";
import type { ProgressState } from "@/lib/progress/types";
import {
  ODPAC_SHADOW_TARGET,
  ODPAC_STAGES,
  odpacExerciseKey,
} from "@/content/onboarding/odpac";
import { Checklist } from "@/components/onboarding/Checklist";
import { LessonSection } from "@/components/onboarding/LessonSection";
import { OdpacReport } from "@/components/onboarding/OdpacReport";
import { MentorPanel } from "@/components/onboarding/MentorPanel";
import { StampSheet } from "@/components/onboarding/StampSheet";
import { ToolsChecklist } from "@/components/onboarding/ToolsChecklist";

const PASS_PERCENT = Math.round(PASS_THRESHOLD * 100);
const UNLOCK_LABEL = `${UNLOCK_HOUR}:${String(UNLOCK_MINUTE).padStart(2, "0")}`;

/**
 * One stop on a day's trail: a pinned card on the desk that enlarges into a
 * window holding the real work. `teaser` is the card's one-line state readout
 * (derived from progress, recomputed every render); `render` is only called
 * while the window is open, so heavy drills mount lazily.
 */
export interface TrailStop {
  key: string;
  title: string;
  /** Card subtitle: what this stop *is*, before any progress numbers. */
  kicker: string;
  /**
   * Drills bring their own sheet chrome (title, status stamp), so their
   * window suppresses its big header rather than printing the title twice.
   */
  chromeless?: boolean;
  /** The body owns the whole window: no body padding, child fills it. */
  fullBleed?: boolean;
  teaser(state: ProgressState): string;
  done(state: ProgressState): boolean;
  render(ctx: { now: Date }): ReactNode;
}

/** The trail for one day, in working order. */
export function stopsForDay(day: Day): TrailStop[] {
  const lessons = lessonsForDay(day.id);
  const readable = lessons.filter((lesson) => lesson.body !== null);
  const mentors = MENTORS_BY_DAY[day.id] ?? [];

  const stops: TrailStop[] = [
    {
      key: "brief",
      title: "The brief",
      kicker: "What today teaches, and why it exists",
      teaser: () =>
        day.responsibilities
          ? `${day.learn.length} topics · ${day.responsibilities.length} responsibilities`
          : `${day.learn.length} topics`,
      done: () => false,
      render: () => <Brief day={day} />,
    },
    {
      key: "fieldwork",
      title: "Fieldwork",
      kicker: "Today's checklist - real tasks, ticked as filed",
      teaser: (state) => {
        const { done, total } = dayChecklistProgress(state, day);
        return `${done} of ${total} filed`;
      },
      done: (state) => {
        const { done, total } = dayChecklistProgress(state, day);
        return total > 0 && done === total;
      },
      render: () => (
        <Checklist
          items={day.activities}
          ariaLabel={`Day ${day.id} activities`}
        />
      ),
    },
  ];

  if (day.id === 1) {
    stops.push({
      key: "kit",
      title: "The travel kit",
      kicker: "Accounts someone grants you on day one",
      teaser: (state) => {
        const granted = TOOLS.filter((tool) =>
          isItemDone(state, tool.key),
        ).length;
        return `${granted} of ${TOOLS.length} granted`;
      },
      done: (state) => TOOLS.every((tool) => isItemDone(state, tool.key)),
      render: () => (
        <>
          <p className="mb-4 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-dim">
            Tick each one off as access lands - chasing these today is what
            keeps the rest of the week unblocked.
          </p>
          <ToolsChecklist />
        </>
      ),
    });
  }

  if (mentors.length > 0) {
    stops.push({
      key: "people",
      title: "Your people",
      kicker: "Who to follow today, one Slack DM away",
      teaser: () =>
        mentors.length === 1
          ? mentors[0].name
          : `${mentors.map((mentor) => mentor.name).join(" · ")}`,
      done: () => false,
      render: () => <MentorPanel dayId={day.id} />,
    });
  }

  if (lessons.length > 0) {
    stops.push({
      key: "reading",
      title: "The reading",
      kicker: "The day's teaching, page by page",
      teaser: (state) => {
        const read = readable.filter(
          (lesson) => lesson.itemKey in state.completedItems,
        ).length;
        return readable.length > 0
          ? `${read} of ${readable.length} read`
          : `${lessons.length} pages`;
      },
      done: (state) =>
        readable.length > 0 &&
        readable.every((lesson) => lesson.itemKey in state.completedItems),
      render: () => <LessonSection dayId={day.id} />,
    });
  }

  for (const drillId of day.drills) {
    const Drill = DRILL_COMPONENTS[drillId];
    stops.push({
      key: `drill-${drillId}`,
      title: DRILL_LABELS[drillId],
      kicker: "A drill - play it until it sticks",
      chromeless: true,
      teaser: (state) => {
        const result = state.drills[drillId];
        if (!result) return "Not attempted";
        if (typeof result.score === "number" && result.maxScore)
          return `${result.status} · ${result.score}/${result.maxScore}`;
        return result.status;
      },
      done: (state) => {
        const status = state.drills[drillId]?.status;
        return status === "passed" || status === "complete";
      },
      render: () => <Drill />,
    });
  }

  // Before the gate on purpose: the report is a required activity alongside the
  // quiz, and it reads as homework rather than paperwork if it sits after the
  // day's work and before the thing that lets you leave.
  stops.push({
    key: "odpac",
    title: "ODPAC report",
    kicker: `Shadow ${ODPAC_SHADOW_TARGET}, then write up what you saw`,
    teaser: (state) => {
      const stored = state.exercises[odpacExerciseKey(day.id)];
      if (!stored) return "Not filed";
      const written = ODPAC_STAGES.filter((stage) =>
        new RegExp(`${stage.label}:\\s*\\S`).test(stored.body),
      ).length;
      return written === ODPAC_STAGES.length
        ? "Filed · all five stages"
        : `Filed · ${written} of ${ODPAC_STAGES.length} stages`;
    },
    done: (state) => odpacExerciseKey(day.id) in state.exercises,
    render: () => <OdpacReport dayId={day.id} />,
  });

  stops.push(
    {
      key: "passport",
      title: "The passport page",
      kicker: "Today's souvenirs - the proof it happened",
      fullBleed: true,
      teaser: (state) => {
        const sheet = stampSheet(state, day.id);
        return `${sheet.earned} of ${sheet.total} stamps`;
      },
      done: (state) => stampSheet(state, day.id).complete,
      // The page on the desk: the cream plate fills the window with a slim
      // night margin, souvenirs clustered across it at hand-stamp scale -
      // tight margins, so the page reads as stamped rather than sparse.
      render: () => (
        <div className="flex h-full min-h-[500px] items-stretch justify-center p-4 sm:p-6">
          <StampSheet
            dayId={day.id}
            compact
            scatter
            stampSize={150}
            className="h-auto w-full rounded-xl p-5 sm:p-6"
          />
        </div>
      ),
    },
    {
      key: "gate",
      title: "The gate",
      kicker: `The day's quiz - ${PASS_PERCENT}% opens the way out`,
      teaser: (state) => {
        if (hasPassedQuiz(state, day.slug)) {
          const best = bestAttempt(state, day.slug);
          return best ? `Passed · best ${best.score}/${best.maxScore}` : "Passed";
        }
        const best = bestAttempt(state, day.slug);
        return best
          ? `Best ${best.score}/${best.maxScore} · below the line`
          : "Not sat yet";
      },
      done: (state) => hasPassedQuiz(state, day.slug),
      render: ({ now }) => <GatePanel day={day} now={now} />,
    },
  );

  return stops;
}

/* ------------------------------------------------------------------------ */
/* Stop bodies                                                               */
/* ------------------------------------------------------------------------ */

/**
 * What the day teaches, and - where the source doc names them - what the
 * role owns. Two ledgers side by side on wide screens, stacked on small.
 */
function Brief({ day }: { day: Day }) {
  return (
    <div
      className={`grid gap-8 ${day.responsibilities ? "md:grid-cols-[3fr_2fr]" : ""}`}
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
          What you learn
        </p>
        <ol className="mt-4 space-y-3.5">
          {day.learn.map((topic, index) => (
            <li key={topic} className="flex items-baseline gap-3.5">
              <span
                aria-hidden="true"
                className="shrink-0 font-display text-[13px] italic leading-none text-brand-text tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[14.5px] leading-relaxed text-ink-muted">
                {topic}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {day.responsibilities && (
        <div className="rounded-xl border border-hairline bg-white/[0.015] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
            Key responsibilities
          </p>
          <ul className="mt-4 space-y-3">
            {day.responsibilities.map((item) => (
              <li
                key={item}
                className="flex items-baseline gap-2.5 text-[13.5px] leading-snug text-ink-muted"
              >
                <span
                  aria-hidden="true"
                  className="inline-block size-1 shrink-0 translate-y-[-2px] rounded-full bg-brand-text/70"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="max-w-[52ch] border-t border-hairline pt-4 text-[13.5px] leading-relaxed text-ink-dim md:col-span-full">
        {day.objective}
      </p>
    </div>
  );
}

/**
 * The way out of the day: the quiz, and what passing it buys. The seal note
 * below reflects the 10:30 rule; while the gate flag is off for review, the
 * unlock copy still describes the launch behaviour.
 */
function GatePanel({ day, now }: { day: Day; now: Date }) {
  const { state } = useProgress();
  const passed = hasPassedQuiz(state, day.slug);
  const best = bestAttempt(state, day.slug);
  const sheetComplete = stampSheet(state, day.id).complete;
  const nextDay = DAYS.find((candidate) => candidate.id === day.id + 1);

  return (
    <div className="rounded-2xl border border-brand/25 bg-ticket-soft/50 p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand-text">
            Day {day.id} quiz
          </p>
          <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-ink-muted">
            {passed
              ? `Passed${best ? ` - best ${best.score}/${best.maxScore}` : ""}. The Boarded stamp is on the page.`
              : best
                ? `Best attempt so far: ${best.score}/${best.maxScore} - below the ${PASS_PERCENT}% line. Retries cost nothing.`
                : `Pass at ${PASS_PERCENT}% or better to earn the Boarded stamp. Retries cost nothing.`}
          </p>
        </div>

        <Link
          href={`/onboarding/quiz/${day.slug}`}
          className={
            passed
              ? "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-hairline-lit px-5 text-[13.5px] font-medium text-ink transition-colors hover:border-ink-dim hover:bg-white/[0.04]"
              : "inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-brand px-6 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover"
          }
        >
          {passed ? "Sit it again" : "Sit the quiz"}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {nextDay && (
        <p className="mt-5 border-t border-hairline pt-4 text-[13px] leading-relaxed text-ink-dim">
          {passed && sheetComplete ? (
            <>
              This page is full.{" "}
              <span className="text-ink-muted">
                Day {nextDay.id} · {nextDay.title}
              </span>{" "}
              unseals {unlockPhrase(now)} - a new chapter every morning at{" "}
              {UNLOCK_LABEL}.
            </>
          ) : (
            <>
              Day {nextDay.id} · {nextDay.title} unseals at {UNLOCK_LABEL} the
              morning after this page is complete - every stamp collected,
              quiz included. One chapter a day.
            </>
          )}
        </p>
      )}

      {!nextDay && passed && sheetComplete && (
        <p className="mt-5 border-t border-hairline pt-4 text-[13px] leading-relaxed text-ink-dim">
          That was the final gate. The whole journey is stamped - take the
          passport for a lap of the leaderboard.
        </p>
      )}
    </div>
  );
}

/**
 * "tomorrow at 10:30", or "today at 10:30" for the early riser who passed
 * yesterday and is reading this before the seal breaks.
 */
function unlockPhrase(now: Date): string {
  const unlockToday = new Date(now);
  unlockToday.setHours(UNLOCK_HOUR, UNLOCK_MINUTE, 0, 0);
  const beforeToday = now.getTime() < unlockToday.getTime();
  return `${beforeToday ? "today" : "tomorrow"} at ${UNLOCK_LABEL}`;
}
