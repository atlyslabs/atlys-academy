import type {
  DayId,
  DrillId,
  ExerciseKey,
  ItemKey,
} from "@/content/onboarding/types";
import type { AvatarConfig, ProgressState, QuizAttemptRecord } from "./types";

export type ProgressAction =
  /** Replace state with what the store returned on mount. */
  | { type: "hydrate"; state: ProgressState }
  | { type: "toggleItem"; itemKey: ItemKey; done: boolean; at: string }
  | {
      type: "setDrill";
      drillId: DrillId;
      status: string;
      score?: number;
      maxScore?: number;
      at: string;
    }
  | { type: "saveExercise"; exerciseKey: ExerciseKey; body: string; at: string }
  | { type: "recordAttempt"; attempt: QuizAttemptRecord }
  | { type: "setLastVisitedDay"; dayId: DayId }
  | { type: "setAvatar"; avatar: AvatarConfig };

/**
 * Pure state transitions. Kept free of `Date.now()` and `crypto.randomUUID()`
 * - callers pass timestamps and ids in - so the reducer stays trivially
 * testable and gives the same output for the same input.
 */
export function progressReducer(
  state: ProgressState,
  action: ProgressAction,
): ProgressState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "toggleItem": {
      const completedItems = { ...state.completedItems };
      if (action.done) {
        completedItems[action.itemKey] = action.at;
      } else {
        delete completedItems[action.itemKey];
      }
      return { ...state, completedItems };
    }

    case "setDrill":
      return {
        ...state,
        drills: {
          ...state.drills,
          [action.drillId]: {
            status: action.status,
            score: action.score,
            maxScore: action.maxScore,
            updatedAt: action.at,
          },
        },
      };

    case "saveExercise":
      return {
        ...state,
        exercises: {
          ...state.exercises,
          [action.exerciseKey]: { body: action.body, submittedAt: action.at },
        },
      };

    case "recordAttempt":
      return { ...state, attempts: [...state.attempts, action.attempt] };

    case "setLastVisitedDay":
      // No-op when unchanged: pages report their day on every mount, and a
      // fresh state object here would ripple into a pointless store write
      // (an API round-trip in remote mode) per visit.
      if (state.lastVisitedDay === action.dayId) return state;
      return { ...state, lastVisitedDay: action.dayId };

    case "setAvatar":
      return { ...state, avatar: action.avatar };
  }
}
