import type { DayId, DrillId, ExerciseKey, ItemKey } from "@/content/onboarding/types";

/** ISO-8601 timestamp string. */
export type Timestamp = string;

export interface QuizAttemptRecord {
  id: string;
  quizSlug: string;
  score: number;
  maxScore: number;
  passed: boolean;
  submittedAt: Timestamp;
}

/**
 * Outcome of one interactive drill. `status` is drill-specific (the pause drill
 * stores `"passed" | "rushed"`, the sorter stores `"complete"`), and `score`
 * is only set by drills that have one.
 */
export interface DrillResult {
  status: string;
  score?: number;
  maxScore?: number;
  /**
   * Plays started, for the three-attempt cap (`MAX_DRILL_ATTEMPTS`).
   *
   * Optional, and absence means one: rows written before the cap existed carry
   * no count, and reading those as a single used play leaves the joinee two
   * more rather than locking them out of a drill they had already done. Always
   * read it through `drillAttemptsUsed` in `attempts.ts`, never directly.
   */
  attempts?: number;
  updatedAt: Timestamp;
}

export interface ExerciseSubmission {
  body: string;
  submittedAt: Timestamp;
}

/**
 * A skribbl-style avatar: indices into the part arrays in `lib/avatar.ts`.
 * Indices rather than asset names so the stored state stays tiny and adding
 * new parts never invalidates old configs (render clamps with modulo).
 */
export interface AvatarConfig {
  color: number;
  face: number;
  hat: number;
}

/**
 * Everything we know about one joinee's progress.
 *
 * Mirrors the Phase 4 database tables (PRD §13) closely enough that swapping
 * the local store for RPC calls is a change of transport, not of shape.
 */
export interface ProgressState {
  /** Bumped when the shape changes; older payloads are discarded on load. */
  version: number;
  /** `item_key` → completion timestamp. Absence means not done. */
  completedItems: Record<ItemKey, Timestamp>;
  attempts: QuizAttemptRecord[];
  drills: Partial<Record<DrillId, DrillResult>>;
  exercises: Record<ExerciseKey, ExerciseSubmission>;
  lastVisitedDay: DayId;
  /** Absent until the joinee picks one; a deterministic default renders. */
  avatar?: AvatarConfig;
}

export const PROGRESS_VERSION = 1;

export function emptyProgress(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    completedItems: {},
    attempts: [],
    drills: {},
    exercises: {},
    lastVisitedDay: 1,
  };
}

/**
 * Persistence boundary.
 *
 * Phase 2 ships `localProgressStore` (browser localStorage, no auth, no
 * database). Phase 4 replaces it with an implementation that calls the Hono
 * endpoints over `hono/client`. Both are async so the swap needs no changes
 * above this interface.
 */
export interface ProgressStore {
  load(): Promise<ProgressState>;
  save(state: ProgressState): Promise<void>;
  clear(): Promise<void>;
}
