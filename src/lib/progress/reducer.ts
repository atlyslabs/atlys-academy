import type {
  DayId,
  DrillId,
  ExerciseKey,
  ItemKey,
} from "@/content/onboarding/types";
import { isTerminalDrillStatus } from "./attempts";
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
  /**
   * The joinee is starting a fresh play of a drill, spending one of their
   * three. Dispatched by each drill's own replay control ("Shuffle and go
   * again", "Walk it again", "Reshuffle and run it again", the pause drill's
   * retry), never automatically.
   *
   * It has to be explicit. Counting plays from `setDrill` writes cannot work:
   * some drills write once at the end and others write on every step, and a
   * replay that only clears local component state leaves the stored status
   * untouched, so there is no transition to detect.
   */
  | { type: "beginDrillAttempt"; drillId: DrillId; at: string }
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

    case "setDrill": {
      const previous = state.drills[action.drillId];
      // The best score across plays is kept, not the latest.
      //
      // Before the three-attempt cap a replay simply overwrote the result, so a
      // worse second run LOWERED the joinee's points - replaying to practise
      // cost them, which is the wrong incentive on a drill whose whole purpose
      // is practice. Now that plays are finite, keeping the best also matches
      // the quiz, where the best attempt has always counted.
      const keptScore =
        previous?.score != null &&
        action.score != null &&
        previous.score > action.score
          ? previous.score
          : action.score;
      return {
        ...state,
        drills: {
          ...state.drills,
          [action.drillId]: {
            status: action.status,
            score: keptScore,
            maxScore: action.maxScore ?? previous?.maxScore,
            // First write of a drill that has never been played is play one.
            attempts: previous?.attempts ?? 1,
            updatedAt: action.at,
          },
        },
      };
    }

    case "beginDrillAttempt": {
      const previous = state.drills[action.drillId];
      // Nothing stored yet means they have not started their first play, and
      // `setDrill` will record it as attempt one. Counting here as well would
      // charge them two for one go.
      if (!previous) return state;
      // Only a replay of a FINISHED drill spends an attempt. Every drill's
      // reset control also doubles as a mid-play "start this bit over" - the
      // scenario branch resets one scenario at a time, the sorters reshuffle a
      // deck you are part-way through - and charging for that would make three
      // attempts mean one careful run and two accidents. Going again after you
      // have finished is the thing being limited.
      //
      // Keeping the rule here rather than in eight components is deliberate:
      // every replay handler can call this unconditionally and still be right.
      if (!isTerminalDrillStatus(previous.status)) return state;
      return {
        ...state,
        drills: {
          ...state.drills,
          [action.drillId]: {
            ...previous,
            attempts: (previous.attempts ?? 1) + 1,
            updatedAt: action.at,
          },
        },
      };
    }

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
