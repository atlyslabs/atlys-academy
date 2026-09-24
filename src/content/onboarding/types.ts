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

/**
 * Identifies which interactive drill component a day should render.
 *
 * `objection-library` and `ownership-run` were retired in Aug 2026. The first
 * was never a drill (hold-to-reveal reading); the second re-ran the same nine
 * cards `ownership-sort` had just sorted, spending half of Day 3's drill
 * capacity on nothing new while seven of that day's eight lessons had no drill
 * at all.
 *
 * The objection loop drill (`apac-loop`, later `odpac-loop`) followed them in
 * Sep 2026. It drilled a four-step acronym, and the academy teaches one
 * framework with five stages: ODPAC. Renaming it had made the mismatch louder
 * rather than fixing it, so the drill went and ODPAC is taught where it is
 * actually five stages deep - lesson 2.6 and the daily shadowing report.
 *
 * Stored `drills` rows keyed to the retired ids are harmless orphans; nothing
 * reads a result for a drill that is no longer listed on a day. That is why
 * removing one is safe for joinees who had already played it, and why no
 * migration is needed to clean them up.
 */
export type DrillId =
  | "pause-10s"
  | "dos-donts"
  | "rewrite-chat"
  | "mock-scenarios"
  | "tool-match"
  | "ownership-sort"
  | "connect-islands"
  | "flag-swipe"
  | "anxiety-wall"
  | "reframe-deck"
  | "edge-cases"
  | "followup-rewrite"
  | "lead-status"
  | "ds160-consistency";

export interface Activity {
  key: ItemKey;
  label: string;
  /** Optional supporting line rendered under the label. */
  detail?: string;
  /** External resource the joinee should open. */
  href?: string;
  // An `accessNeeded` flag used to print an amber "Needs tool access" note
  // under an activity. It marked resources the app author could not reach while
  // building, which stopped being true once the content landed - so by Aug 2026
  // it was flagging a gap that no longer existed and reading, to a joinee, like
  // the academy itself was unfinished. Removed with the other placeholders.
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
  // A `grantedBy` field used to name the person who hands out each account.
  // Removed in Aug 2026 with the named contacts: who grants what is a rota
  // question the academy was never the right place to answer, and a stale name
  // sends a joinee to somebody who has moved team.
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

/** One objection script - the loop's Address step, per lessons 2.8-2.11. */
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
  /** e.g. "Price objection" - one of the four objection lessons. */
  label: string;
  context: string;
  customerMessage: string;
  replies: ScenarioReply[];
}

/* -------------------------------------------------------------------------- */
/* Lead status (lesson 3.5)                                                    */
/* -------------------------------------------------------------------------- */

/** The five statuses, in the order a lead moves through them. */
export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "started"
  | "closed";

export interface LeadCard {
  id: string;
  /** The Cadence note, as the next person would read it. */
  note: string;
  status: LeadStatus;
  /** Shown after answering - the teaching line. */
  because: string;
}

/* -------------------------------------------------------------------------- */
/* Swipe decks (flag-swipe, ds160-consistency)                                 */
/* -------------------------------------------------------------------------- */

/**
 * One card in a two-way swipe deck.
 *
 * `safe` means "the right-hand call" rather than anything about safety - the
 * deck's own labels say what the two sides mean. Day 1 swipes safe-to-say
 * against never-say; Day 3 swipes a consistent file against an inconsistent
 * one.
 */
export interface SwipeLine {
  id: string;
  /** The sentence or the pair, as it would actually appear. */
  text: string;
  safe: boolean;
  /** Why it lands on that side. The teaching, shown after the swipe. */
  because: string;
}

/** Everything a swipe deck needs beyond its cards. */
export interface SwipeDeckConfig {
  drillId: DrillId;
  eyebrow: string;
  title: string;
  description: string;
  /** Right-hand call: button text, stamp, and the results column heading. */
  right: { label: string; stamp: string; heading: string };
  /** Left-hand call. */
  left: { label: string; stamp: string; heading: string };
  /** Line shown above the reveal, e.g. "You, in the chat". */
  cardKicker: string;
  lines: readonly SwipeLine[];
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
