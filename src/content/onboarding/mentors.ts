import type { DayId } from "./types";

/**
 * Who to follow on each day.
 *
 * Cut back to two people in Aug 2026. It used to list eleven entries across the
 * three days - a subject-matter expert per topic, most of them with no Slack ID
 * - and the ones without an ID rendered a disabled "ID pending" button, so more
 * than half the panel was a list of people a joinee could read about and not
 * reach. A directory of unreachable names is worse than a short list of
 * reachable ones: it buries the two people who can actually answer.
 *
 * What is here now is the person who runs the academy and the joinee's own team
 * leader. Everyone else - Ops, the US team, whoever grants a tool - is reached
 * through one of those two, which is what happens in practice anyway.
 *
 * Day 3 has no entry at all, and that is deliberate rather than an omission:
 * `stops.tsx` skips the "Your people" stop when a day's list is empty, so the
 * day board simply does not show one.
 */

/** Komal Rawat, who runs the academy. The only real Slack ID on the panel. */
const KOMAL = "U0BQHHVSWLD";

export interface Mentor {
  /** Real name, or the role where the person differs per joinee. */
  name: string;
  /**
   * Slack member ID, or null when there is nobody fixed to link to.
   *
   * Null is not a gap to be filled later - the only null here is the team
   * leader, who is a different person for each joinee and is picked at sign-in.
   * `MentorPanel` renders no button at all rather than a disabled one.
   */
  slackMemberId: string | null;
  /** What to go to them for, so the DM opens with the right question. */
  owns: string;
}

export const MENTORS_BY_DAY: Record<DayId, Mentor[]> = {
  1: [
    {
      name: "Komal Rawat",
      slackMemberId: KOMAL,
      owns: "Everything Day 1: the intro meeting, tool access, and any question you are not sure who owns.",
    },
    {
      name: "Your team leader",
      slackMemberId: null,
      owns: "Your day to day, and the first person to ask about anything on the floor. You chose them when you signed in.",
    },
  ],
  2: [
    {
      name: "Your team leader",
      slackMemberId: null,
      owns: "Tone, the pause rule, and the 30-minute sync at the end of the day.",
    },
  ],
  3: [],
};
