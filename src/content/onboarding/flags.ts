/**
 * Day 1 · Red-line / green-flag lines.
 *
 * Ten sentences an agent could plausibly type into a live chat, taken from the
 * training hub. The wording is exact on purpose: these are judged as written
 * sentences, because in writing they become commitments the company has to
 * keep. Do not smooth them out - a paraphrased red line stops being the red
 * line. `because` is the manual's own reason, shown after the joinee answers.
 */

import type { SwipeDeckConfig, SwipeLine } from "./types";

/**
 * One line in this deck. Kept as a named alias because the shape is now shared
 * with the Day 3 DS-160 deck: `safe` is "the right-hand call", and each deck's
 * own config says what the two sides mean.
 */
export type FlagLine = SwipeLine;

export const FLAG_LINES: readonly FlagLine[] = [
  {
    id: "flag.committed_date",
    text: "The committed delivery date for your route is the 14th. If we miss it, you're compensated and you still get the visa.",
    safe: true,
    because:
      "Accurate and specific: the commitment we actually make.",
  },
  {
    id: "flag.definite_date",
    text: "Your visa will definitely come by the 14th, don't worry.",
    safe: false,
    because:
      "Two violations: a delivery date outside the commitment, and false reassurance. In writing this is a promise the company has to keep.",
  },
  {
    id: "flag.hundred_percent",
    text: "With your profile you'll 100% get approved.",
    safe: false,
    because:
      "Never promise approval. No qualifier, no exception, especially not to reassure someone anxious.",
  },
  {
    id: "flag.cannot_promise",
    text: "I can't promise the officer's decision. Nobody can. Here's what I can promise.",
    safe: true,
    because:
      "The strongest opening on the approval objection: concede fully, then narrow to what is real.",
  },
  {
    id: "flag.contact_at_centre",
    text: "I know someone at the centre, I'll see if the appointment can be moved up.",
    safe: false,
    because:
      "Implies access we do not have. Even said casually it teaches the customer we are like every other agent.",
  },
  {
    id: "flag.work_on_statement",
    text: "If the balance looks low we can work on the statement before submitting.",
    safe: false,
    because:
      "Document fabrication: immediate exit and a flag. This gets customers banned, not just refused.",
  },
  {
    id: "flag.check_refund_cover",
    text: "Let me check the refund cover for your specific route before I give you a number.",
    safe: true,
    because:
      "The correct instinct: cover varies by route, and a number sent on WhatsApp is a written commitment.",
  },
  {
    id: "flag.guaranteed_or_refund",
    text: "Guaranteed visa or full refund.",
    safe: false,
    because:
      "Unqualified, so it is read as an approval guarantee. Say what is actually covered, on which route.",
  },
  {
    id: "flag.realistic_slot",
    text: "Based on what's open at your centre today, the earliest realistic slot is the 9th. Let me confirm and come back in ten minutes.",
    safe: true,
    because:
      "Specific, checkable, and a callback beats an optimistic guess.",
  },
  {
    id: "flag.always_works_out",
    text: "Don't worry, these things always work out.",
    safe: false,
    because:
      "Sounds kind, functions as a promise. When it does not work out the customer remembers this sentence, not the disclaimer.",
  },
];

export const FLAG_DECK: SwipeDeckConfig = {
  drillId: "flag-swipe",
  eyebrow: "Drill · reflex",
  title: "Green flag, red flag",
  description:
    "Ten sentences an agent might type into a live chat. Swipe right if it is safe to say, left if it is never said. You get about one second in a real conversation, so do not deliberate. The reason lands after you call it.",
  right: { label: "✅ Safe to say", stamp: "SAFE ✓", heading: "✅ Safe to say" },
  left: {
    label: "❌ Never say this",
    stamp: "NEVER ✗",
    heading: "❌ Never say",
  },
  cardKicker: "You, in the chat",
  lines: FLAG_LINES,
};
