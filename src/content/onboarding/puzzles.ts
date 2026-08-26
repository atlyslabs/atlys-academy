import type { Verdict } from "./types";

/**
 * Content for the two matching puzzles. Everything here is traceable to the
 * lessons in `lessons.ts` - the tool stack in 1.10 and the ownership split in
 * 3.4. No invented facts.
 */

/** Day 1 - match each tool to the job it does. Built from the tools list. */
export interface ToolMatchPair {
  id: string;
  tool: string;
  /** The job description shown as a drop slot. */
  job: string;
}

/**
 * The six tools of lesson 1.10, and only those six.
 *
 * Grafana and "WhatsApp groups" used to sit here, carried over from the old
 * five-day source doc. Neither survives in the lessons: Grafana appears nowhere
 * at all, and the Grafana card taught the joinee to look up pipeline state on a
 * dashboard that is not the case tool. WhatsApp is a guest follow-up channel in
 * 3.6, never internal comms.
 *
 * Boomerang and DD replace them, because 1.10 says of those two specifically:
 * "the two you will skip if nobody tells you why they matter" - and a stack
 * drill that omits them reproduces the failure the lesson was written to
 * prevent, then 3.7 opens every shift with both names.
 */
export const TOOL_MATCH_PAIRS: readonly ToolMatchPair[] = [
  {
    id: "freshchat",
    tool: "Freshchat",
    job: "Answer an inbound customer chat",
  },
  {
    id: "cadence",
    tool: "Cadence",
    job: "Look up what state an application is in, and log the call afterwards",
  },
  {
    id: "retool",
    tool: "Walkie Talkie (WT)",
    job: "Call a guest",
  },
  {
    id: "boomerang",
    tool: "Boomerang",
    job: "Check your own numbers, and pull the cold-lead list to work",
  },
  {
    id: "dd",
    tool: "DD (Daily Dashboard)",
    job: "See the team's performance and which lines of business are under target",
  },
  {
    id: "notion",
    tool: "Notion",
    job: "Find the glossary, a process doc, or the country page for a route",
  },
];

/**
 * Day 3 - who owns what. Three-way sort built strictly from lesson 3.4's
 * framing: the officer decides, Atlys controls the file and the slot, the guest
 * controls their own bookings and timing.
 */
export type Owner = "atlys" | "officer" | "guest";

export interface OwnershipStatement {
  id: string;
  text: string;
  owner: Owner;
  /** Shown after answering - the teaching line. */
  because: string;
}

export const OWNERSHIP_COLUMNS: Record<Owner, string> = {
  atlys: "Atlys",
  officer: "The consulate / officer",
  guest: "The guest",
};

export const OWNERSHIP_STATEMENTS: readonly OwnershipStatement[] = [
  {
    id: "own.decision",
    text: "Decides whether the visa is approved",
    owner: "officer",
    because:
      "Approval is the officer's call. Anyone who says otherwise is lying to the guest.",
  },
  {
    id: "own.file",
    text: "Makes sure nothing in the file gives a reason to say no",
    owner: "atlys",
    because:
      "Most refusals aren't about the person, they're about the file. The file is ours to get right.",
  },
  {
    id: "own.slot",
    text: "Searches for the earliest appointment slot available",
    owner: "atlys",
    because:
      "The slot search is one of the things the Atlys fee actually buys.",
  },
  {
    id: "own.queue",
    text: "Sets how long the appointment queue is",
    owner: "officer",
    because:
      "The queue is not something we control. Say so plainly when asked.",
  },
  {
    id: "own.audit",
    text: "Audits the documents before submission",
    owner: "atlys",
    because:
      "A document audit is what separates us from an agent who fills and forwards.",
  },
  {
    id: "own.late_call",
    text: "Answers the phone at 11pm",
    owner: "atlys",
    because: "Part of what the fee buys. The embassy fee does not include this.",
  },
  {
    id: "own.when",
    text: "Decides how early to apply",
    owner: "guest",
    because:
      "Applying early enough is what turns a refusal into a delay instead of a cancellation, and only the guest can decide it.",
  },
  {
    id: "own.bookings",
    text: "Chooses whether flights and hotels are refundable",
    owner: "guest",
    because:
      "Nothing we sell protects a non-refundable trip. That protection is in the guest's own booking choices.",
  },
  {
    id: "own.honesty",
    text: "Answers the interview questions truthfully",
    owner: "guest",
    because: "The file can be perfect; the answers in the room are theirs.",
  },
];

/** Sorter verdict re-export so puzzle components share one vocabulary. */
export type { Verdict };
