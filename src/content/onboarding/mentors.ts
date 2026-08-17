import type { DayId } from "./types";

const SHOVAN = "U07TQMWHH0T";
export interface Mentor {
  /** Real name, or a role description while the name is pending. */
  name: string;
  /** True when we only know the role, not the person. */
  pending?: boolean;
  slackMemberId: string | null;
  /** What to go to them for, so the DM opens with the right question. */
  owns: string;
}

export const MENTORS_BY_DAY: Record<DayId, Mentor[]> = {
  1: [
    {
      name: "Shovan",
      slackMemberId: SHOVAN,
      owns: "Everything Day 1: the intro meeting, tool access, and any question you are not sure who owns.",
    },
    // Day 1 is the access day (source doc: "Tools to get access to (Day 1)"), so
    // the person who grants WT belongs here, not on Day 4 where it gets used.
    {
      name: "Devesh",
      slackMemberId: "U08TSLL1VRC",
      owns: "Access to Walkie Talkie (WT), the Retool tool on your Day 1 list. Day 4 is built on it, so this is the one request worth chasing if it goes quiet.",
    },
  ],
  2: [
    {
      name: "Shovan",
      slackMemberId: SHOVAN,
      owns: "Tone, the pause rule, and the 30-minute sync at the end of the day.",
    },
  ],
  3: [
    {
      name: "Ops Lead",
      pending: true,
      slackMemberId: null,
      owns: "The visa process itself: the 1-hour Q&A, and the five common failure points.",
    },
    {
      name: "Growth/Design",
      pending: true,
      slackMemberId: null,
      owns: "The 1-hour Q&A on what customers most need reassurance about.",
    },
    // Named against specific US-visa facts by Shovan, Aug 2026 (§2.4-2.6, 2.10,
    // 2.12). They are not the day's mentors - they are the person to ask for one
    // answer each, which is why `owns` reads as the question itself.
    {
      name: "Sameer",
      slackMemberId: null,
      owns: "The most common rejection reasons, in order. He has already answered the document question (for the US B1/B2 we need nothing from the guest but the DS-160), so ask him per country rather than re-asking that.",
    },
    {
      name: "Sahil",
      slackMemberId: null,
      owns: "Appointment booking, as the POC for it: how a slot gets found, what actually drives the wait, and whether we can speed it up.",
    },
    {
      name: "Mukul",
      slackMemberId: null,
      owns: "Resubmission rules.",
    },
    {
      name: "Snehasish, or the US team",
      slackMemberId: "U06DP5AE63G",
      owns: "The US route in detail. What the app teaches on the DS-160 and the interview came from him, so he is who to ask when a guest raises something about the B1/B2 that the lessons do not cover.",
    },
  ],
  4: [
    {
      name: "Santosh",
      slackMemberId: null,
      owns: "Pipeline monitoring and the 1-hour sync.",
    },
    {
      name: "Shovan",
      slackMemberId: SHOVAN,
      owns: "Escalation paths and decision ownership.",
    },
  ],
  5: [
    {
      name: "Shovan",
      slackMemberId: SHOVAN,
      owns: "The role-play hour, and feedback on tone, accuracy and confidence.",
    },
  ],
};
