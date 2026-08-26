import { DAYS } from "@/content/onboarding/days";
import { LESSON_KEYS } from "@/content/onboarding/lessons";
import type { DayId } from "@/content/onboarding/types";
import { isTerminalDrillStatus } from "./attempts";
import { bestAttempt, hasFiledOdpac, hasPassedQuiz } from "./selectors";
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
  /** Filing the day's ODPAC shadowing report. Not graded, so a flat award. */
  odpacFiled: 15,
  /**
   * Bonus for finishing a day: every activity ticked, the ODPAC report filed,
   * and the quiz passed.
   */
  dayComplete: 25,
} as const;

export interface DayPoints {
  dayId: DayId;
  activities: number;
  lessons: number;
  drills: number;
  quiz: number;
  odpac: number;
  completionBonus: number;
  total: number;
}

export interface PointsSummary {
  total: number;
  perDay: DayPoints[];
}


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
      if (!result || !isTerminalDrillStatus(result.status)) continue;
      drills += POINT_WEIGHTS.drillComplete;
      if (
        result.maxScore != null &&
        result.maxScore > 0 &&
        result.score === result.maxScore
      ) {
        drills += POINT_WEIGHTS.drillPerfect;
      }
    }

    // Best attempt only. Retries are capped at three (see `attempts.ts`) but
    // scoring the best of them is what stops points punishing a retry or
    // rewarding a grind - and it is why a joinee can use their remaining goes
    // to improve without risking what they already have.
    const best = bestAttempt(state, day.slug);
    const quiz = (best?.score ?? 0) * POINT_WEIGHTS.correctAnswer;

    const odpacFiled = hasFiledOdpac(state, day.id);
    const odpac = odpacFiled ? POINT_WEIGHTS.odpacFiled : 0;

    const allActivitiesDone = day.activities.every(
      (a) => a.key in state.completedItems,
    );
    // The report joins the bonus conditions rather than sitting outside them:
    // it is a required activity, so a day without it is not a finished day.
    const completionBonus =
      allActivitiesDone && odpacFiled && hasPassedQuiz(state, day.slug)
        ? POINT_WEIGHTS.dayComplete
        : 0;

    const total = activities + lessons + drills + quiz + odpac + completionBonus;
    return {
      dayId: day.id,
      activities,
      lessons,
      drills,
      quiz,
      odpac,
      completionBonus,
      total,
    };
  });

  return {
    total: perDay.reduce((sum, day) => sum + day.total, 0),
    perDay,
  };
}
