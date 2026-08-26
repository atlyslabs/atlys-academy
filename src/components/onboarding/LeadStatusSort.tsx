"use client";

import {
  LEAD_CARDS,
  LEAD_STATUS_COLUMNS,
  LEAD_STATUS_ORDER,
} from "@/content/onboarding/lead-status";
import type { LeadStatus } from "@/content/onboarding/types";
import { ColumnSort, type ColumnSortConfig } from "./OwnershipSort";

/** Day 3 - where a lead actually sits in the pipeline (lesson 3.5). */
const LEAD_STATUS_SORT: ColumnSortConfig<LeadStatus> = {
  drillId: "lead-status",
  eyebrow: "Drill · pipeline",
  title: "Move the lead",
  description:
    "Each card is a Cadence note. File it under the status that lead should be at - the status updates after every touchpoint, not at the end of the day. Qualified is the one that carries weight, because it says the six fields were run and the case is genuinely sellable; Lost is not an admission of failure.",
  // Printed in the order a lead moves through them, so the zones read as the
  // pipeline rather than as five unrelated boxes.
  columns: LEAD_STATUS_ORDER.map((status) => ({
    key: status,
    label: LEAD_STATUS_COLUMNS[status],
  })),
  cards: LEAD_CARDS.map((card) => ({
    id: card.id,
    text: card.note,
    column: card.status,
    because: card.because,
  })),
  /*
   * Five zones do not fit a phone: at 375px each would be about 60px, and
   * "Application Started" alone is wider than that. So the narrow tier is 2-up
   * and the fifth zone takes the leftover row (`fillLastZone`), with all five
   * side by side from `md:`, which is the first width where a zone still holds
   * its label on one or two lines.
   *
   * Deliberately named breakpoints only. Tailwind v4 emits custom/arbitrary
   * `min-*` variants BEFORE the named ones, so an arbitrary tier here could
   * never beat `md:` - it would lose the cascade no matter what width it named.
   */
  zoneGrid: "grid-cols-2 md:grid-cols-5",
  fillLastZone: true,
  // Cadence notes run from one line to three, where the ownership statements
  // were all one. `min-h` at the narrow tier is doing the real work: without it
  // the drop zones jump up and down the page as cards are dealt, and a joinee
  // mid-drag loses the zone they were aiming at.
  cardClass: "min-h-44 text-base leading-relaxed md:min-h-32",
  cardKicker: "Cadence · lead note",
  tapHint: "Or tap the status",
  scoreTail: "moved correctly",
  // The note is long and still on screen, so the reveal names the status
  // instead of repeating the card back.
  correctLine: ({ label }) => `Correct. ${label}.`,
  missLine: ({ label }) => `Not quite. That one sits at ${label}.`,
};

/**
 * Day 3's lead-status sort, on the shared column sort.
 *
 * Same registration-only wrapper as `OwnershipSort`: the drill registry maps a
 * `DrillId` to a zero-prop component, and the sort itself - copy, columns,
 * layout and cards - is `LEAD_STATUS_SORT` above.
 */
export function LeadStatusSort() {
  return <ColumnSort sort={LEAD_STATUS_SORT} />;
}
