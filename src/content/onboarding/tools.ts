import type { Tool } from "./types";

/**
 * The six tools of lesson 1.10, in the order the lesson names them.
 *
 * This list drives the Day 1 access checklist and the travel-kit stamp
 * (`stamps.ts` renders `Request all ${TOOLS.length} tool accesses`), so a tool
 * missing here is a tool nobody is ever asked to request. Boomerang and DD were
 * both missing, which is how the stamp came to read "all 4" for a six-tool
 * stack that 3.7 opens every shift with.
 */
export const TOOLS: readonly Tool[] = [
  {
    key: "tools.freshchat",
    name: "Freshchat",
    purpose: "Inbound customer chat.",
  },
  {
    key: "tools.retool_wt",
    name: "Walkie Talkie (WT)",
    purpose: "Calling guests. It is a phone, not a dashboard.",
  },
  {
    key: "tools.cadence",
    name: "Cadence",
    purpose:
      "The dashboard: guest history, AI overview, document status, journey status. Also where every interaction and lead status is logged.",
  },
  {
    key: "tools.boomerang",
    name: "Boomerang",
    purpose:
      "Your own numbers: calls made, leads contacted, conversion rate, and the cold-lead list your re-engagement outreach is built from. Your manager reviews it daily.",
  },
  {
    key: "tools.dd",
    name: "DD (Daily Dashboard)",
    purpose:
      "The team's performance, including which lines of business are under target. Bring one insight from it to the morning huddle.",
  },
  {
    key: "tools.notion",
    name: "Notion",
    purpose:
      "Glossary, process docs, and the country pages. The country page is the answer for any route you have not been taught, and the only timeline you may put in writing.",
  },
];
