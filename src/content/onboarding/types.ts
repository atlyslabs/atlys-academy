/**
 * Shared shapes for the onboarding content modules.
 *
 * Everything in `src/content/onboarding/` is plain, typed data - no database.
 * Content edits ship as PRs, not migrations. The only values that must stay
 * stable over time are the string keys (`ItemKey`, `QuestionId`, `ExerciseKey`,
 * ...): user progress rows reference them, so renaming a key orphans progress.
 */

/** Days are numbered 1-5 and referenced by that number everywhere. */
export type DayId = 1 | 2 | 3;

/**
 * Stable identifier for one checkable thing, e.g. `"day1.shadow_chats"`.
 * Persisted in `onboarding_progress.item_key`. Never rename in place.
 */
export type ItemKey = string;

/** Stable identifier for a free-text submission, e.g. `"day2.rewrite_bad_chat"`. */
export type ExerciseKey = string;

/** Identifies which interactive drill component a day should render. */
export type DrillId =
  | "pause-10s"
  | "dos-donts"
  | "rewrite-chat"
  | "objection-library"
  | "mock-scenarios"
  | "tool-match"
  | "ownership-sort"
  | "ownership-run"
  | "connect-islands"
  | "flag-swipe"
  | "anxiety-wall"
  | "reframe-deck";

export interface Activity {
  key: ItemKey;
  label: string;
  /** Optional supporting line rendered under the label. */
  detail?: string;
  /** External resource the joinee should open. */
  href?: string;
  /**
   * Set when the underlying resource is not yet available to the app author.
   * Rendered as a visible "access needed" note so nobody mistakes a gap for
   * finished content.
   */
  accessNeeded?: boolean;
}

export interface Day {
  id: DayId;
  /** URL/quiz slug: `"day1"` … `"day3"`. */
  slug: string;
  title: string;
  objective: string;
  /** "What to learn" bullets, verbatim from the source doc. */
  learn: string[];
  /** "Key responsibilities" - only Day 1 has these in the source doc. */
  responsibilities?: string[];
  activities: Activity[];
  /** Drills rendered in this day's panel, in order. */
  drills: DrillId[];
}

export interface Tool {
  key: ItemKey;
  name: string;
  /** What the joinee uses it for - not in the source doc, added for clarity. */
  purpose: string;
  /**
   * Who grants the account, where we know. Access is requested on Day 1, so the
   * name belongs next to the request rather than on the day the tool gets used.
   */
  grantedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* Drills                                                                      */
/* -------------------------------------------------------------------------- */

export interface PauseDrillContent {
  /** First customer message - the surface question. */
  openingMessage: string;
  /** The tempting, too-fast reply the joinee must not send. */
  rushedReply: string;
  /** Revealed only if the joinee waits out the countdown. */
  followUpMessage: string;
  /** Seconds the composer stays locked. */
  waitSeconds: number;
  /** Shown when the joinee tries to send early. */
  rushedFeedback: string;
  /** Shown alongside the joinee's own reply after they wait. */
  modelAnswer: string;
  exerciseKey: ExerciseKey;
}

export type Verdict = "do" | "dont";

export interface SorterStatement {
  id: string;
  text: string;
  verdict: Verdict;
  /** Why it lands on that side. Shown after the joinee answers. */
  because: string;
}

export interface RewriteExercise {
  exerciseKey: ExerciseKey;
  /** The customer message being replied to. */
  customerMessage: string;
  /** The poor agent reply the joinee must improve. */
  badReply: string;
  /** What specifically is wrong with it. */
  problems: string[];
  modelAnswer: string;
  /** "What changed and why", one line per change. */
  annotations: string[];
}

/** One entry from the Cluster A objection scripts. */
export interface ObjectionScript {
  id: string;
  objection: string;
  /** "What's really going on" - the read beneath the words. */
  subtext: string;
  /** The recommended reply. */
  say: string;
  /** Optional follow-up question that keeps the conversation moving. */
  then?: string;
}

export interface ScenarioReply {
  id: string;
  text: string;
  /** In-character customer response to this reply. */
  customerResponse: string;
  /** Coaching note shown with the response. */
  feedback: string;
  /** Does this reply close the objection or deepen the concern? */
  outcome: "closes" | "deepens";
}

export interface MockScenario {
  id: string;
  /** e.g. "Price objection" - one of the four in the source doc. */
  label: string;
  context: string;
  customerMessage: string;
  replies: ScenarioReply[];
}

/* -------------------------------------------------------------------------- */
/* Quizzes                                                                     */
/* -------------------------------------------------------------------------- */

export type QuizSlug = string;
export type QuestionId = string;

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: QuestionId;
  prompt: string;
  options: QuizOption[];
}

export interface Quiz {
  slug: QuizSlug;
  title: string;
  /** Which day this quiz gates. */
  dayId: DayId;
  questions: QuizQuestion[];
}

/** Server-only. Lives in `answers.ts`, never imported by client code. */
export interface AnswerKey {
  correct: string;
  explanation: string;
}
