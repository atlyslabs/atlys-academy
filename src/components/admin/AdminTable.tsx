"use client";

import { useId, useMemo, useState } from "react";
import { DAYS } from "@/content/onboarding/days";
import type { DayId } from "@/content/onboarding/types";
// Type-only import: erased at compile time, so none of the server-only store
// module lands in the client bundle.
import type { AdminJoineeRow } from "@/server/onboarding/store";
import {
  ProgressRadar,
  radarMean,
  type RadarAxis,
} from "@/components/onboarding/ProgressRadar";
import { cn } from "@/lib/utils";

/** The segment bar, radar and sparkline all mirror the day count in `DAYS`. */
const TOTAL_DAYS = DAYS.length;
const DAY_IDS: readonly DayId[] = DAYS.map((day) => day.id);

/** `quizBest` is keyed by quiz slug, which is the day number: `day1` … `day3`. */
function slugForDay(dayId: DayId): string {
  return `day${dayId}`;
}

/**
 * One joinee's best paper on one day, as a fraction.
 *
 * A missing or malformed entry reads as 0 **and still counts in the cohort
 * denominator**: never sitting the paper demonstrates nothing, so dropping
 * those rows would let an untouched day plot as strong as a mastered one -
 * exactly the blind spot the panel exists to expose.
 */
function scoreFraction(best: string | undefined): number {
  if (!best) return 0;
  const [score, max] = best.split("/").map(Number);
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return 0;
  // The denominator is the stored max, not the quiz's current length: the row's
  // own chips print this same fraction, and the panel must agree with the ink
  // beside it. Clamping covers a score carried over from a longer paper.
  return Math.min(score / max, 1);
}

/** Cohort mean of the best score per day, one axis per day. */
function cohortAxes(rows: AdminJoineeRow[]): RadarAxis[] {
  return DAYS.map((day) => {
    const total = rows.reduce(
      (sum, row) => sum + scoreFraction(row.quizBest[slugForDay(day.id)]),
      0,
    );
    return {
      // The vertex says which day to go and fix, not which airport it stages in.
      label: `Day ${day.id}`,
      title: day.title,
      value: rows.length > 0 ? total / rows.length : 0,
    };
  });
}

/**
 * Dates are formatted in UTC so the server render and the client hydration
 * agree even when they sit in different timezones.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : DATE_FORMAT.format(date);
}

/**
 * The admin overview - presentation only. All authorisation and data fetching
 * happen in the server page; this component just renders rows.
 *
 * Two readings, in the order a manager needs them: the cohort's shape (where
 * the material is not landing), then the joinees themselves (who to talk to).
 */
export function AdminTable({ rows }: { rows: AdminJoineeRow[] }) {
  const baseId = useId();
  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(new Set());

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.points - a.points),
    [rows],
  );
  const axes = useMemo(() => cohortAxes(rows), [rows]);

  function toggle(email: string) {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <div className="desk-card px-7 py-12 text-center sm:px-12 sm:py-16">
        <FrameBeam />
        <p className="font-display text-[26px] italic leading-snug text-ink">
          Nobody has signed in yet.
        </p>
        <p className="mx-auto mt-3 max-w-[46ch] text-[14px] leading-relaxed text-ink-muted">
          The first row appears the moment a joinee signs in with their Atlys
          account. Until then there is nothing to watch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CohortPanel axes={axes} joinees={sorted.length} />

      <section className="desk-card">
        <FrameBeam />

        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 pb-5 pt-6 sm:px-8 sm:pt-7">
          <h2 className="font-display text-[26px] italic leading-none text-ink">
            Every joinee
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim tabular-nums">
            {sorted.length} {sorted.length === 1 ? "joinee" : "joinees"}, most
            points first
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <caption className="sr-only">
              Joinee progress overview, sorted by points, highest first.
            </caption>
            <thead>
              <tr className="border-y border-hairline bg-white/[0.015]">
                <th scope="col" className="w-10 py-2.5 pl-5 sm:pl-8">
                  <span className="sr-only">Written answers</span>
                </th>
                <HeaderCell>Joinee</HeaderCell>
                <HeaderCell>Cohort</HeaderCell>
                <HeaderCell>Points</HeaderCell>
                <HeaderCell>Days</HeaderCell>
                <HeaderCell>Best paper per day</HeaderCell>
                <HeaderCell>Activities</HeaderCell>
                <HeaderCell>Last active</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, index) => {
                const isOpen = openRows.has(row.email);
                const detailId = `${baseId}-detail-${index}`;
                const cleared = row.daysCompleted >= TOTAL_DAYS;

                return (
                  <RowGroup key={row.email}>
                    <tr
                      className={cn(
                        "align-top transition-colors",
                        // The expanded panel carries this row's own rule.
                        !isOpen &&
                          index < sorted.length - 1 &&
                          "border-b border-hairline/70",
                        isOpen ? "bg-white/[0.02]" : "hover:bg-white/[0.02]",
                      )}
                    >
                      <td className="py-3.5 pl-5 sm:pl-8">
                        <button
                          type="button"
                          onClick={() => toggle(row.email)}
                          aria-expanded={isOpen}
                          aria-controls={isOpen ? detailId : undefined}
                          aria-label={`Written answers from ${row.name ?? row.email}`}
                          className="grid size-6 place-items-center rounded-full border border-hairline text-ink-dim transition-colors hover:border-hairline-lit hover:text-ink"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className={cn(
                              "size-3 transition-transform duration-200",
                              isOpen && "rotate-90",
                            )}
                          >
                            <path d="M6 4l4 4-4 4" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[14px] font-medium leading-tight text-ink">
                          {row.name || row.email.split("@")[0]}
                        </p>
                        <p className="mt-1 text-[11.5px] leading-tight text-ink-dim">
                          {row.email}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11.5px] text-ink-dim tabular-nums">
                        {formatDate(row.cohortDate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "font-mono text-[13.5px] font-medium tabular-nums",
                            // Gold is the finishing ink in this app: the whole
                            // journey, not one good paper.
                            cleared ? "text-gold" : "text-ink",
                          )}
                        >
                          {row.points}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <DaysCell completed={row.daysCompleted} />
                      </td>
                      <td className="px-4 py-3.5">
                        <PapersCell quizBest={row.quizBest} />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[12px] text-ink-muted tabular-nums">
                        {row.activitiesDone}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 pr-5 font-mono text-[11.5px] text-ink-dim tabular-nums sm:pr-8">
                        {formatDate(row.lastActivityAt)}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr
                        id={detailId}
                        className={cn(
                          "bg-white/[0.02]",
                          index < sorted.length - 1 &&
                            "border-b border-hairline/70",
                        )}
                      >
                        <td
                          colSpan={8}
                          className="px-5 pb-6 pt-1 sm:pl-[68px] sm:pr-8"
                        >
                          <ExerciseList exercises={row.exercises} />
                        </td>
                      </tr>
                    )}
                  </RowGroup>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * The cohort's shape: the plot on the right says how uneven the cohort is, the
 * strip along the foot names the days in the same order the pentagon walks
 * them, so a spoke can be read back to a day without counting vertices. The
 * shortest day is marked, but only when there is a spread to mark - a cohort
 * sitting flat at nothing has no weakest day, it has no scores.
 */
function CohortPanel({
  axes,
  joinees,
}: {
  axes: RadarAxis[];
  joinees: number;
}) {
  const mean = radarMean(axes);
  const values = axes.map((axis) => axis.value);
  const lowest = Math.min(...values);
  const spread = Math.max(...values) > lowest;

  return (
    <section className="desk-card px-5 py-6 sm:px-8 sm:py-8">
      <FrameBeam />

      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-12">
        <div className="min-w-0 md:max-w-[46ch]">
          <h2 className="font-display text-[26px] italic leading-none text-ink">
            Cohort shape
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">
            Every joinee&apos;s best paper per day, averaged across the whole
            cohort. Rings mark 33, 66 and 100%. A short spoke is a day the
            material has not landed on yet.
          </p>

          <p className="mt-8 flex items-baseline gap-3">
            <span className="font-condensed text-[56px] leading-none text-ink tabular-nums">
              {mean}%
            </span>
            <span className="font-mono text-[10px] uppercase leading-tight tracking-[0.16em] text-ink-dim">
              cohort mean
              <br />
              {joinees} {joinees === 1 ? "joinee" : "joinees"}
            </span>
          </p>
        </div>

        <ProgressRadar
          axes={axes}
          caption={`Mean best score per day, ${joinees} ${
            joinees === 1 ? "joinee" : "joinees"
          }`}
          size={264}
          className="md:w-[264px] md:shrink-0"
        />
      </div>

      <ol className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-hairline pt-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8">
        {axes.map((axis) => {
          const weakest = spread && axis.value === lowest;
          return (
            <li key={axis.label} className="min-w-0">
              <p className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                <span className="text-ink-dim">{axis.label}</span>
                {weakest && (
                  <span className="text-brand-text">shortest</span>
                )}
              </p>
              <p className="mt-1.5 truncate text-[13px] leading-tight text-ink-muted">
                {axis.title}
              </p>
              <p
                className={cn(
                  "mt-2 font-mono text-[15px] tabular-nums",
                  axis.value === 0 ? "text-ink-dim/70" : "text-ink",
                )}
              >
                {Math.round(axis.value * 100)}%
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The etched perimeter every plate on this stage carries. */
function FrameBeam() {
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
    </svg>
  );
}

/** `<tbody>` only accepts `<tr>` children, so the pair shares a plain fragment. */
function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-ink-dim"
    >
      {children}
    </th>
  );
}

function DaysCell({ completed }: { completed: number }) {
  const cleared = completed >= TOTAL_DAYS;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "whitespace-nowrap font-mono text-[12px] tabular-nums",
          cleared ? "text-gold" : "text-ink-muted",
        )}
      >
        {completed}/{TOTAL_DAYS}
      </span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: TOTAL_DAYS }, (_, segment) => (
          <span
            key={segment}
            className={cn(
              "h-1 w-3.5 rounded-full",
              segment < completed
                ? cleared
                  ? "bg-gold"
                  : "bg-brand-text"
                : "bg-hairline-lit",
            )}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * The five best papers, one fixed slot per day.
 *
 * Fixed slots rather than chips for the days actually sat: the slots line up
 * down the whole column, so "Day 4 is thin across the cohort" is legible by
 * scanning one position instead of reading five labels per row. A day with no
 * paper prints its slot empty, which is the reading that matters most.
 */
function PapersCell({
  quizBest,
}: {
  quizBest: AdminJoineeRow["quizBest"];
}) {
  return (
    <span className="flex gap-3.5">
      {DAY_IDS.map((dayId) => {
        const best = quizBest[slugForDay(dayId)];
        return (
          <span key={dayId} className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase leading-none tracking-[0.1em] text-ink-dim">
              D{dayId}
            </span>
            <span
              className={cn(
                "whitespace-nowrap font-mono text-[12px] leading-none tabular-nums",
                best ? "text-ink" : "text-ink-dim/60",
              )}
            >
              {best ?? "-"}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function ExerciseList({
  exercises,
}: {
  exercises: AdminJoineeRow["exercises"];
}) {
  if (exercises.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-hairline-lit/70 px-4 py-3 text-[13px] text-ink-dim">
        Nothing written yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {exercises.map((exercise) => (
        <li
          key={exercise.key}
          className="rounded-xl border border-hairline bg-white/[0.02] px-4 py-3.5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-text">
              {exercise.key}
            </p>
            <p className="font-mono text-[10px] text-ink-dim tabular-nums">
              {formatDate(exercise.submittedAt)}
            </p>
          </div>
          {/* Verbatim, line breaks included - this is what the mentor actually reads. */}
          <p className="mt-2.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-muted">
            {exercise.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
