import type { DayId, Tool } from "./types";

/**
 * The day the access checklist and its travel-kit stamp appear on.
 *
 * **Day 3, not Day 1.** Lesson 1.10 still teaches the stack on Day 1, but no
 * checklist asks for access to be requested any more - the Day 1 item that did
 * was removed as a duplicate pointer at this stop. Access is not granted until
 * Day 3, and the stamp asks a joinee to confirm they *have* it. On Day 1
 * that confirmation was unanswerable and, because `dayWorkFinished` requires
 * every stamp on the page and has no settle-escape for this one, it was also
 * mandatory: Day 2 would not unseal until six accesses nobody had yet been given
 * were ticked. The only way through was to tick them untruthfully, which is what
 * 28 of 34 joinees did.
 *
 * Day 3 is where it belongs: `day3.walk_cadence` already asks the joinee to walk
 * the tool stack with their mentor, and lesson 3.7 opens every shift with
 * Boomerang and DD.
 *
 * Both consumers - the desk stop in `journey/stops.tsx` and the stamp in
 * `progress/stamps.ts` - read this. Keep it that way: split across two literals
 * they can drift, and a checklist on one day scored by a stamp on another is a
 * page nobody can clear.
 */
export const TOOLS_DAY_ID: DayId = 3;

/**
 * The six tools of lesson 1.10, in the order the lesson names them.
 *
 * This list drives the access checklist on day `TOOLS_DAY_ID` and the
 * travel-kit stamp (`stamps.ts` renders `Request all ${TOOLS.length} tool
 * accesses`), so a tool missing here is a tool nobody is ever asked to request.
 * Boomerang and DD were both missing, which is how the stamp came to read
 * "all 4" for a six-tool stack that 3.7 opens every shift with.
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
