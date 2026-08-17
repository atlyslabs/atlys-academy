/**
 * Content for the arcade drills. Same rule as every other content module:
 * traceable to `docs/source-journey.md` (Cluster A, the Dos/Don'ts, the day-4
 * learn list) - no invented facts.
 *
 * The lane-runner reuses `OWNERSHIP_STATEMENTS` from `puzzles.ts` directly and
 * has no content of its own.
 */

/**
 * Day 4 - "route the situation to the right desk", drawn as two islands with
 * lines between them. Left: what just happened in your chat. Right: where it
 * goes. Sources: day-4 learn list ("Product: feature clarity, bugs, roadmap",
 * "Ops: visa processing, timelines, exceptions"), day-1 responsibilities
 * ("Coordinating with Ops for edge cases"), and the Don'ts.
 */
export interface IslandPair {
  id: string;
  /** The situation, in the joinee's shoes. */
  left: string;
  /** The correct routing. */
  right: string;
  /** Teaching line shown after checking. */
  because: string;
}

/**
 * Terminal staging for the routing drill: each destination is a desk on the
 * airport floor the joinee walks a situation over to. Staging only - `right`
 * above is still the answer being tested; this decides what the desk looks like
 * and where it stands. Coordinates are percentages of the floor box.
 */
export interface TerminalZone {
  /** Matches `IslandPair.right` exactly. */
  destination: string;
  /** Board-style code stencilled on the floor. */
  code: string;
  /** What the sign over the desk says. */
  sign: string;
  /**
   * The second line on the sign: what this desk takes. Real signage, not a
   * giveaway - every line is the source doc's own, so the drill tests which
   * situation belongs where rather than whether the joinee can guess what four
   * unlabelled pads mean. Traceable to the day-4 learn list and the Don'ts.
   */
  hint: string;
  x: number;
  y: number;
}

export const TERMINAL_ZONES: readonly TerminalZone[] = [
  {
    destination: "Product",
    code: "P",
    sign: "Product desk",
    hint: "Feature clarity · bugs · roadmap",
    x: 24,
    y: 22,
  },
  {
    destination: "Ops",
    code: "O",
    sign: "Ops desk",
    hint: "Visa processing · timelines · exceptions",
    x: 76,
    y: 22,
  },
  {
    destination: "Resolve with Ops before replying",
    code: "R",
    sign: "Back office",
    hint: "Line up with Ops before you reply",
    x: 76,
    y: 78,
  },
  {
    destination: "Hand over with full context",
    code: "H",
    sign: "Shift handover",
    hint: "Follow-ups and handovers, with context",
    x: 24,
    y: 78,
  },
] as const;

export const ISLAND_PAIRS: readonly IslandPair[] = [
  {
    id: "isl.bug",
    left: "The checkout button is throwing an error for a guest",
    right: "Product",
    because: "Feature clarity, bugs and roadmap are Product's desk.",
  },
  {
    id: "isl.timeline",
    left: "An application looks stuck and the guest is asking why",
    right: "Ops",
    because: "Visa processing, timelines and exceptions are Ops' desk.",
  },
  {
    id: "isl.edge",
    left: "A question you cannot answer turns out to be an edge case",
    right: "Ops",
    because:
      "Coordinating with Ops for edge cases is one of the five core responsibilities. Guessing is not.",
  },
  {
    id: "isl.roadmap",
    left: "A guest asks whether a missing feature is coming",
    right: "Product",
    because: "Roadmap questions are Product's, not something to promise in chat.",
  },
  {
    id: "isl.conflict",
    left: "Ops told the guest one thing; you believe another is correct",
    right: "Resolve with Ops before replying",
    because:
      "Don't contradict Ops or Product guidelines. Two answers from one company means neither is believed.",
  },
  {
    id: "isl.handover",
    left: "Your shift is ending mid-conversation",
    right: "Hand over with full context",
    because:
      "A guest repeating themselves is the clearest signal a handover was done badly.",
  },
] as const;
