import { DAYS } from "@/content/onboarding/days";
import { odpacExerciseKey } from "@/content/onboarding/odpac";
import {
  teamLeaderName,
  UNASSIGNED_TEAM_LEADER,
} from "@/content/onboarding/team-leaders";
import type { DayId } from "@/content/onboarding/types";
// Type-only: the analytics panel is a client component, and the store is
// server-only. Nothing here may import a value from it.
import type { AdminJoineeRow } from "@/server/onboarding/store";

/**
 * The scoring behind the admin desk's analytics tab.
 *
 * Pure functions over `AdminJoineeRow`, deliberately free of JSX and of any
 * clock: the panel is a shareable artefact, so the same rows must always
 * produce the same numbers. Everything printed on that panel is derived here,
 * so a figure in a stat tile and the same figure in a matrix footer cannot
 * drift apart.
 *
 * MILESTONES are the unit of completion. Each day of the journey carries two
 * that the data can prove: the ODPAC report was filed, and the day's quiz was
 * passed at the mark. Three days therefore means six milestones per joinee, and
 * the count comes from `DAYS` so adding a day moves every total with it.
 *
 * Deliberately NOT scored here: `points` (a weighted game score that muddies a
 * completion artefact) and `activitiesDone` (a raw tick count with no
 * denominator on the row, so any percentage from it would be invented). Stamps
 * carry their own denominator, so they are reported as a ratio, never a rate.
 */

export type QuizCell = "passed" | "below" | "none";

export interface MilestoneDay {
  dayId: DayId;
  /**
   * The quiz key, taken from the day itself rather than rebuilt as
   * `day${id}`. `quizBest` and `quizPassed` are keyed by `day.slug`, and the
   * two only agree today by coincidence - renaming a slug would silently zero
   * every quiz milestone rather than fail.
   */
  slug: string;
  /** Short column label: "Day 1". */
  label: string;
  /** The day's title, for the accessible column description. */
  title: string;
}

/** One column pair per day, in journey order. */
export const MILESTONE_DAYS: MilestoneDay[] = DAYS.map((day) => ({
  dayId: day.id,
  slug: day.slug,
  label: `Day ${day.id}`,
  title: day.title,
}));

/** Two provable milestones per day: the report filed, and the quiz passed. */
export const MILESTONES_PER_JOINEE = MILESTONE_DAYS.length * 2;

export interface JoineeScore {
  /** Stable key. Email is used as the key but never printed on this panel. */
  key: string;
  name: string;
  /** Per day, in journey order. */
  days: {
    dayId: DayId;
    odpac: boolean;
    quiz: QuizCell;
    /** The mark as stored, e.g. "2/5". Present whenever the quiz was sat. */
    quizMark: string | null;
  }[];
  /** Milestones cleared, 0..MILESTONES_PER_JOINEE. */
  done: number;
  complete: boolean;
  stamps: { earned: number; total: number };
}

export interface TeamScore {
  /** Roster id, or the unassigned sentinel. */
  key: string;
  /** Display name, already resolved through the roster. */
  name: string;
  /** The unassigned bucket is a real group of people but not a team. */
  unassigned: boolean;
  members: JoineeScore[];
  /** Milestones cleared across the team, and the capacity behind it. */
  cleared: number;
  capacity: number;
  /** Cleared as a whole percent. 0 when the team has no capacity. */
  rate: number;
  finished: number;
  notStarted: number;
  stamps: { earned: number; total: number };
  /** Per day: how many members filed the report / passed the quiz. */
  columns: { dayId: DayId; odpac: number; quiz: number }[];
}

export interface AnalyticsSummary {
  teams: TeamScore[];
  joinees: number;
  /** Teams with a real leader on file. The unassigned bucket is not a team. */
  teamCount: number;
  cleared: number;
  capacity: number;
  rate: number;
  finished: number;
  notStarted: number;
  /** Teams at 100%, for the stat tile's sub-line. */
  perfectTeams: number;
}

function scoreJoinee(row: AdminJoineeRow): JoineeScore {
  const filed = new Set(row.exercises.map((exercise) => exercise.key));

  const days = MILESTONE_DAYS.map(({ dayId, slug }) => {
    const mark = row.quizBest[slug] ?? null;
    const quiz: QuizCell = row.quizPassed[slug]
      ? "passed"
      : mark
        ? "below"
        : "none";
    return {
      dayId,
      odpac: filed.has(odpacExerciseKey(dayId)),
      quiz,
      quizMark: mark,
    };
  });

  const done = days.reduce(
    (sum, day) => sum + (day.odpac ? 1 : 0) + (day.quiz === "passed" ? 1 : 0),
    0,
  );

  return {
    key: row.email,
    // Same fallback the table uses, so one person reads the same on both tabs.
    name: row.name || row.email.split("@")[0],
    days,
    done,
    complete: done === MILESTONES_PER_JOINEE,
    stamps: row.stamps,
  };
}

/**
 * Roll the rows up by team leader.
 *
 * Whatever set of rows is handed in is the whole truth for this panel - the
 * caller passes the filtered set, so every figure below is "of what is on
 * screen" and the panel says so in its own header.
 */
export function summarize(rows: AdminJoineeRow[]): AnalyticsSummary {
  const buckets = new Map<string, AdminJoineeRow[]>();
  for (const row of rows) {
    const key = row.teamLeader ?? UNASSIGNED_TEAM_LEADER;
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }

  const teams: TeamScore[] = [...buckets.entries()].map(([key, members]) => {
    const scored = members
      .map(scoreJoinee)
      .sort((a, b) => b.done - a.done || a.name.localeCompare(b.name));
    const cleared = scored.reduce((sum, member) => sum + member.done, 0);
    const capacity = scored.length * MILESTONES_PER_JOINEE;
    const unassigned = key === UNASSIGNED_TEAM_LEADER;

    return {
      key,
      // The name comes from the row, resolved server-side against the live
      // roster - so a leader an admin added today reads correctly here without
      // the client needing the roster at all. The static helper is only the
      // fallback for a row that predates that resolution.
      name: unassigned
        ? "No team leader on file"
        : (members[0]?.teamLeaderName ?? teamLeaderName(key)),
      unassigned,
      members: scored,
      cleared,
      capacity,
      rate: capacity > 0 ? Math.round((cleared / capacity) * 100) : 0,
      finished: scored.filter((member) => member.complete).length,
      notStarted: scored.filter((member) => member.done === 0).length,
      stamps: {
        earned: scored.reduce((sum, member) => sum + member.stamps.earned, 0),
        total: scored.reduce((sum, member) => sum + member.stamps.total, 0),
      },
      columns: MILESTONE_DAYS.map(({ dayId }, index) => ({
        dayId,
        odpac: scored.filter((member) => member.days[index].odpac).length,
        quiz: scored.filter((member) => member.days[index].quiz === "passed")
          .length,
      })),
    };
  });

  // Ranked by completion, then by the bigger team, then by name. The unassigned
  // bucket always sits last: it is not competing with anyone.
  teams.sort((a, b) => {
    if (a.unassigned !== b.unassigned) return a.unassigned ? 1 : -1;
    return (
      b.rate - a.rate ||
      b.members.length - a.members.length ||
      a.name.localeCompare(b.name)
    );
  });

  const cleared = teams.reduce((sum, team) => sum + team.cleared, 0);
  const capacity = teams.reduce((sum, team) => sum + team.capacity, 0);
  const real = teams.filter((team) => !team.unassigned);

  return {
    teams,
    joinees: rows.length,
    teamCount: real.length,
    cleared,
    capacity,
    rate: capacity > 0 ? Math.round((cleared / capacity) * 100) : 0,
    finished: teams.reduce((sum, team) => sum + team.finished, 0),
    notStarted: teams.reduce((sum, team) => sum + team.notStarted, 0),
    perfectTeams: real.filter((team) => team.rate === 100).length,
  };
}
