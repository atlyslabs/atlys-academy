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
 * was never a drill (hold-to-reveal reading), and lesson 2.6 says its scripts
 * are the Address step of APAC - so they moved into `apac-loop`, which makes a
 * joinee run the loop that decides which script applies. The second re-ran the
 * same nine cards `ownership-sort` had just sorted, spending half of Day 3's
 * drill capacity on nothing new while seven of that day's eight lessons had no
 * drill at all.
 *
 * Stored `drills` rows keyed to the retired ids are harmless orphans; nothing
 * reads a result for a drill that is no longer listed on a day.
 */
export type DrillId =
  | "pause-10s"
  | "dos-donts"
  | "rewrite-chat"
  | "apac-loop"
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

/** One objection script - the Address step of APAC, per lessons 2.8-2.11. */
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
/* APAC (lesson 2.6)                                                           */
/* -------------------------------------------------------------------------- */

/** The four steps, in the only order they work in. */
export type ApacStepId = "acknowledge" | "probe" | "address" | "confirm";

/**
 * How wrong an option is, which decides what the joinee is told afterwards.
 *
 * `wrong-step` is the important one and the reason this drill exists: the
 * option is a good sentence sitting in the wrong slot, which is 2.6's own
 * diagnosis - "Address on its own is a good answer to a question nobody asked,
 * and Probe without Acknowledge sounds like an interrogation."
 */
export type ApacVerdict = "correct" | "wrong-step" | "wrong";

export interface ApacOption {
  id: string;
  text: string;
  verdict: ApacVerdict;
  /** The coaching line, shown after the pick. */
  because: string;
}

export interface ApacStep {
  id: ApacStepId;
  /** What this step is for, in one line. Shown above the options. */
  brief: string;
  options: ApacOption[];
  /**
   * What the guest says once this step is played correctly.
   *
   * Only the Probe step sets this, and it is the whole point of the round: the
   * concern Probe surfaces is what decides which Address option is right.
   */
  reveal?: string;
}

export interface ApacRound {
  id: string;
  /** Short name for the round, e.g. "The price that is not about price". */
  label: string;
  context: string;
  /** The guest's opening objection. */
  objection: string;
  /**
   * A line the agent has already sent when the drill picks the conversation
   * up, rendered as a sent bubble under the objection. Lets a later round
   * start mid-loop - the joinee drilled that step in the round before, so
   * replaying it here would be length without teaching. `note` says out loud
   * that the step is done, so a shorter round never reads as a skippable one.
   */
  opening?: { text: string; note: string };
  steps: ApacStep[];
  /** Printed after the round closes - what the round was really teaching. */
  lesson: string;
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
