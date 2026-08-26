/**
 * Content for the arcade drills. Same rule as every other content module:
 * traceable to the lessons in `lessons.ts` - no invented facts.
 *
 * The lane-runner reuses `OWNERSHIP_STATEMENTS` from `puzzles.ts` directly and
 * has no content of its own.
 */

/**
 * Day 1 - "route the situation to the right desk", drawn as an airport floor.
 * Left: what just happened in your chat. Right: where it goes.
 *
 * Rebuilt Aug 2026. The old version routed to a "Product desk" taking "feature
 * clarity, bugs, roadmap", sourced from a day-4 learn list that no longer
 * exists. No lesson mentions a Product team, a roadmap or a bug - two of the six
 * pairs were unanswerable from the material, and the drill scored the guess as
 * knowledge.
 *
 * The material does teach routing, just a different one, and it is worth more
 * than the invented one because it is the seam where cases actually break:
 *
 *   1.4  the test itself - "if it is about whether and what, it is yours. If it
 *        is about where it is and when, it is theirs" - with post-checkout named
 *        as "ops, PRO, CX"
 *   3.8  the three escalations that break the normal flow: your PM before
 *        advising on a ban or an overstay, the operations team for the UAE
 *        active-visa error, the Emergency Helpline for a guest denied check-in
 *
 * Which also means this drill now carries most of 3.8, the lesson that had none.
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
   * giveaway - every line is a lesson's own, so the drill tests which situation
   * belongs where rather than whether the joinee can guess what four unlabelled
   * pads mean.
   */
  hint: string;
  x: number;
  y: number;
}

export const TERMINAL_ZONES: readonly TerminalZone[] = [
  {
    destination: "Yours",
    code: "Y",
    sign: "Your desk",
    hint: "Whether and what · pre-checkout",
    x: 24,
    y: 22,
  },
  {
    destination: "Post-checkout (ops, PRO, CX)",
    code: "O",
    sign: "Post-checkout",
    hint: "Where it is and when · live cases",
    x: 76,
    y: 22,
  },
  {
    destination: "Your PM",
    code: "P",
    sign: "Your PM",
    hint: "Bans and overstays · before you advise",
    x: 24,
    y: 78,
  },
  {
    destination: "Emergency Helpline",
    code: "E",
    sign: "Emergency Helpline",
    hint: "Denied at the airport · they own it",
    x: 76,
    y: 78,
  },
] as const;

export const ISLAND_PAIRS: readonly IslandPair[] = [
  {
    id: "isl.whether",
    left: "A guest with a three-week runway asks whether their timeline can work at all",
    right: "Yours",
    because:
      "Whether and what is yours: pre-checkout decides what is right and gets the file ready. Including when the honest answer is that three weeks is not enough.",
  },
  {
    id: "isl.which_embassy",
    left: "A guest asks which embassy to apply to for five nights in France and three in Spain",
    right: "Yours",
    because:
      "Still a what question, and one you can answer: you apply where you spend the most nights. Diagnosis is the pre-checkout skill.",
  },
  {
    id: "isl.where_is_it",
    left: "A guest who paid last week asks where their application has got to",
    right: "Post-checkout (ops, PRO, CX)",
    because:
      "Where it is and when is theirs. They work a live case with a committed date and talk about where the application is now.",
  },
  {
    id: "isl.uae_error",
    left: "A guest hits an error saying an active visa is already on record, blocking a new UAE application",
    right: "Post-checkout (ops, PRO, CX)",
    because:
      "A known issue that may be a system fault, so it needs backend resolution: escalate to the operations team immediately, and never tell the guest it is their fault. Promise the follow-up, never the resolution.",
  },
  {
    id: "isl.overstay",
    left: "A guest mentions in passing that they overstayed a previous visa by two days",
    right: "Your PM",
    because:
      "Escalate to your PM before advising anyone with a ban or an overstay. Even a single day makes someone high-risk for that country. Do not guess on this one.",
  },
  {
    id: "isl.ban",
    left: "A guest asks whether a ban on their record can be worked around",
    right: "Your PM",
    because:
      "Same hard rule, and the tempting answer is the dangerous one. Be honest about the effect on approval probability rather than building false hope.",
  },
  {
    id: "isl.airport",
    left: "A guest calls from the airport. They have just been denied check-in over a visa problem",
    right: "Emergency Helpline",
    because:
      "A genuine emergency, not a process flow. Do not hold them for more than 60 seconds, and stay on the call until the handover is confirmed. Ownership here means making sure the guest is covered, not being the one who fixes it.",
  },
  {
    id: "isl.timeline_number",
    left: "A guest wants a better timeline than the country page gives, and their case is genuinely unusual",
    right: "Post-checkout (ops, PRO, CX)",
    because:
      "Genuine special cases get revised with Ops. You do not invent a number, and you do not improve on the page because a guest wants a better one.",
  },
] as const;
