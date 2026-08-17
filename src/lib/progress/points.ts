import { DAYS } from "@/content/onboarding/days";
import { LESSON_KEYS } from "@/content/onboarding/lessons";
import type { DayId } from "@/content/onboarding/types";
import { bestAttempt, hasPassedQuiz } from "./selectors";
import type { ProgressState } from "./types";

/**
 * Points are a pure function of progress state - no ledger, no stored total.
 *
 * That one decision removes the whole class of double-award bugs, works
 * identically whether the store is localStorage or Supabase, and lets the
 * server compute leaderboard totals with this same function. If a weight
 * changes, everyone's score recomputes consistently on the next render.
 *
 * Weights are the strawman approved in the brief; adjust here and nowhere else.
 */
export const POINT_WEIGHTS = {
  /** Ticking one activity on a day's checklist. */
  activity: 5,
  /** Reading one lesson topic to the end. */
  lessonRead: 3,
  /** Completing an interactive drill, whatever the score. */
  drillComplete: 15,
  /** Bonus for a drill finished with a perfect score. */
  drillPerfect: 10,
  /** Each correct answer on the best attempt at a day's quiz. */
  correctAnswer: 10,
  /** Bonus for finishing a day: every activity ticked and its quiz passed. */
  dayComplete: 25,
} as const;

export interface DayPoints {
  dayId: DayId;
  activities: number;
  lessons: number;
  drills: number;
  quiz: number;
  completionBonus: number;
  total: number;
}

export interface PointsSummary {
  total: number;
  perDay: DayPoints[];
}

/** A drill counts as complete for points when it reaches a terminal status. */
const TERMINAL_DRILL_STATUSES = new Set(["passed", "complete"]);

export function calculatePoints(state: ProgressState): PointsSummary {
  const perDay = DAYS.map((day) => {
    const activities =
      day.activities.filter((a) => a.key in state.completedItems).length *
      POINT_WEIGHTS.activity;

    const lessons =
      LESSON_KEYS.filter(
        (key) => key.dayId === day.id && key.itemKey in state.completedItems,
      ).length * POINT_WEIGHTS.lessonRead;

    let drills = 0;
    for (const drillId of day.drills) {
      const result = state.drills[drillId];
      if (!result || !TERMINAL_DRILL_STATUSES.has(result.status)) continue;
      drills += POINT_WEIGHTS.drillComplete;
      if (
        result.maxScore != null &&
        result.maxScore > 0 &&
        result.score === result.maxScore
      ) {
        drills += POINT_WEIGHTS.drillPerfect;
      }
    }

    // Best attempt only - retries are free and unlimited, so points never
    // punish a retry and never reward grinding the same quiz.
    const best = bestAttempt(state, day.slug);
    const quiz = (best?.score ?? 0) * POINT_WEIGHTS.correctAnswer;

    const allActivitiesDone = day.activities.every(
      (a) => a.key in state.completedItems,
    );
    const completionBonus =
      allActivitiesDone && hasPassedQuiz(state, day.slug)
        ? POINT_WEIGHTS.dayComplete
        : 0;

    const total = activities + lessons + drills + quiz + completionBonus;
    return {
      dayId: day.id,
      activities,
      lessons,
      drills,
      quiz,
      completionBonus,
      total,
    };
  });

  return {
    total: perDay.reduce((sum, day) => sum + day.total, 0),
    perDay,
  };
}
