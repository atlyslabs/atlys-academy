"use client";

import { useEffect, useRef } from "react";
import type { AdminJoineeRow } from "@/server/onboarding/store";
import {
  MILESTONE_DAYS,
  MILESTONES_PER_JOINEE,
  summarize,
  type JoineeScore,
  type TeamScore,
} from "@/lib/admin/analytics";
import { cn } from "@/lib/utils";

/**
 * The analytics tab: the same filtered joinees, drawn rather than tabulated.
 *
 * This panel is a shareable artefact. Its job is to be screenshotted into Slack
 * to credit a team leader and their team, which sets three hard constraints:
 * it is a white plate on the night stage (see `.report-plate` in globals.css),
 * it fits one screen so a single capture gets all of it, and it never prints an
 * email address - a credit post carries names, not contact details.
 *
 * Every number comes from `src/lib/admin/analytics.ts`, so no two readings of
 * the same figure can disagree.
 */
export function AnalyticsPanel({
  rows,
  teamLabel,
  asOf,
}: {
  rows: AdminJoineeRow[];
  /** Who this view is of - a leader's name, or the whole cohort. */
  teamLabel: string;
  /** ISO date stamped by the server. Never a clock read in this tree. */
  asOf: string;
}) {
  const summary = summarize(rows);
  const plate = useRef<HTMLDivElement>(null);

  // Bring the whole plate into view when the tab opens, so it can be read (and
  // captured) without anyone hunting for it. `block: "start"` rather than
  // "center" because the plate is nearly a full screen tall.
  useEffect(() => {
    plate.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (rows.length === 0) {
    return (
      <div className="report-plate rounded-2xl px-6 py-14 text-center sm:px-10">
        <p className="font-display text-[22px] italic leading-snug text-ink">
          Nothing to report yet.
        </p>
        <p className="mx-auto mt-2.5 max-w-[42ch] text-[13.5px] leading-relaxed text-ink-muted">
          No joinee matches the current scope, so there is no completion to draw.
        </p>
      </div>
    );
  }

  // One team on screen is the credit view: the plate is about that team, so it
  // spends its whole width on their members. More than one is the comparison
  // view, which leads with the teams ranked against each other.
  const single = summary.teams.length === 1;
  const team = summary.teams[0];

  return (
    <div
      ref={plate}
      className="report-plate scroll-mt-6 rounded-2xl px-5 py-5 sm:px-7 sm:py-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 border-b border-hairline pb-4">
        <div className="min-w-0">
          <h3 className="font-display text-[26px] italic leading-none text-ink sm:text-[30px]">
            Team standings
          </h3>
          <p className="mt-2 text-[15px] font-medium leading-none text-ink">
            {single ? team.name : teamLabel}
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-dim">
            Atlys Academy
          </p>
          <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-dim tabular-nums">
            As of {asOf}
          </p>
        </div>
      </header>

      {/* Headline: the completion dial, and the counts behind it. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-5">
        <Dial percent={summary.rate} />
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Stat
            label="Milestones"
            value={`${summary.cleared}/${summary.capacity}`}
            note={`${MILESTONES_PER_JOINEE} per joinee`}
          />
          <Stat
            label="Joinees"
            value={`${summary.joinees}`}
            note={single ? "on this team" : `across ${summary.teamCount} teams`}
          />
          <Stat
            label="Finished"
            value={`${summary.finished}`}
            note="all milestones cleared"
            gold={summary.finished > 0}
          />
          <Stat
            label="Stamps"
            value={
              totalStamps(summary.teams).total > 0
                ? `${totalStamps(summary.teams).earned}/${totalStamps(summary.teams).total}`
                : "-"
            }
            note="passport activities"
          />
        </dl>
      </div>

      {/* The two charts. Members on the left because the brief is to show every
          team member; the day breakdown on the right says where the gap is. */}
      <div className="mt-6 grid gap-6 border-t border-hairline pt-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <ChartHeading>
            {single ? "Every team member" : "Every joinee"}
          </ChartHeading>
          <ul className="mt-3 space-y-1.5">
            {allMembers(summary.teams).map((member) => (
              <MemberBar key={member.key} member={member} />
            ))}
          </ul>
        </section>

        <div className="min-w-0 space-y-6">
          {!single && (
            <section>
              <ChartHeading>Teams</ChartHeading>
              <ul className="mt-3 space-y-1.5">
                {summary.teams.map((entry) => (
                  <li key={entry.key} className="flex items-center gap-3">
                    <span className="w-[116px] shrink-0 truncate text-[12px] text-ink-muted">
                      {entry.name}
                    </span>
                    <Bar
                      percent={entry.rate}
                      gold={entry.rate === 100 && entry.capacity > 0}
                    />
                    <span className="w-9 shrink-0 text-right font-mono text-[11.5px] text-ink tabular-nums">
                      {entry.rate}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <ChartHeading>Where the team is</ChartHeading>
            <ul className="mt-3 space-y-2.5">
              {MILESTONE_DAYS.map((day, index) => {
                const filed = summary.teams.reduce(
                  (sum, entry) => sum + entry.columns[index].odpac,
                  0,
                );
                const passed = summary.teams.reduce(
                  (sum, entry) => sum + entry.columns[index].quiz,
                  0,
                );
                return (
                  <li key={day.dayId}>
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-dim">
                        {day.label}
                      </span>
                      <span className="truncate text-[11px] text-ink-dim">
                        {day.title}
                      </span>
                    </p>
                    <div className="mt-1.5 space-y-1">
                      <SplitBar
                        label="Reports"
                        value={filed}
                        of={summary.joinees}
                      />
                      <SplitBar
                        label="Quizzes"
                        value={passed}
                        of={summary.joinees}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <p className="mt-5 border-t border-hairline pt-3.5 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim tabular-nums">
        Atlys Academy · {MILESTONE_DAYS.length}-day onboarding · a milestone is
        the day&apos;s report filed or its quiz passed
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function totalStamps(teams: TeamScore[]) {
  return {
    earned: teams.reduce((sum, team) => sum + team.stamps.earned, 0),
    total: teams.reduce((sum, team) => sum + team.stamps.total, 0),
  };
}

/** Every member across the teams shown, strongest first. */
function allMembers(teams: TeamScore[]): JoineeScore[] {
  return teams
    .flatMap((team) => team.members)
    .sort((a, b) => b.done - a.done || a.name.localeCompare(b.name));
}

function ChartHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-dim">
      {children}
    </h4>
  );
}

function Stat({
  label,
  value,
  note,
  gold = false,
}: {
  label: string;
  value: string;
  note: string;
  gold?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 font-condensed text-[26px] leading-none tabular-nums",
          gold ? "text-gold" : "text-ink",
        )}
      >
        {value}
      </dd>
      <dd className="mt-1 text-[10.5px] leading-snug text-ink-muted">{note}</dd>
    </div>
  );
}

/**
 * The completion dial. A ring rather than a filled pie: at these sizes a pie's
 * slices are harder to compare than one arc against its own track, and the
 * number sits in the middle where the eye already is.
 */
function Dial({ percent }: { percent: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  const complete = percent === 100;

  return (
    <div className="flex shrink-0 items-center gap-3.5">
      <svg
        viewBox="0 0 88 88"
        className="size-[88px] -rotate-90"
        role="img"
        aria-label={`${percent} per cent of milestones cleared`}
      >
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="11"
        />
        {percent > 0 && (
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={
              complete ? "var(--color-gold)" : "var(--color-brand)"
            }
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
          />
        )}
      </svg>
      <div>
        <p
          className={cn(
            "font-condensed text-[40px] leading-none tabular-nums",
            complete ? "text-gold" : "text-ink",
          )}
        >
          {percent}%
        </p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-dim">
          Completion
        </p>
      </div>
    </div>
  );
}

/** A plain proportional bar. The number always sits beside it, never inside. */
function Bar({ percent, gold }: { percent: number; gold: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="block h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line"
    >
      <span
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        className={cn(
          "block h-full rounded-full",
          gold ? "bg-gold" : "bg-brand",
        )}
      />
    </span>
  );
}

/** One joinee's milestones, as a bar. Every member of the team gets a row. */
function MemberBar({ member }: { member: JoineeScore }) {
  const percent = Math.round((member.done / MILESTONES_PER_JOINEE) * 100);
  return (
    <li className="flex items-center gap-3">
      <span className="w-[104px] shrink-0 truncate text-[12.5px] text-ink sm:w-[132px]">
        {member.name}
      </span>
      <Bar percent={percent} gold={member.complete} />
      <span
        className={cn(
          "w-8 shrink-0 text-right font-mono text-[11.5px] tabular-nums",
          member.complete ? "text-gold" : "text-ink-muted",
        )}
      >
        {member.done}/{MILESTONES_PER_JOINEE}
      </span>
    </li>
  );
}

/** A labelled count bar: how many of the group cleared one thing. */
function SplitBar({
  label,
  value,
  of,
}: {
  label: string;
  value: number;
  of: number;
}) {
  const percent = of > 0 ? Math.round((value / of) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[52px] shrink-0 text-[10.5px] text-ink-muted">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line"
      >
        <span
          style={{ width: `${percent}%` }}
          className={cn(
            "block h-full rounded-full",
            of > 0 && value === of ? "bg-gold" : "bg-complete",
          )}
        />
      </span>
      <span className="w-8 shrink-0 text-right font-mono text-[10.5px] text-ink-muted tabular-nums">
        {value}/{of}
      </span>
    </div>
  );
}
