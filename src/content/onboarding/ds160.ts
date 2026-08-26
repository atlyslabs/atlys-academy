import type { SwipeDeckConfig, SwipeLine } from "./types";

/**
 * Day 3 · The DS-160 second read (lesson 3.2).
 *
 * The same swipe deck as the Day 1 red lines, over a different call. 3.2 is the
 * most drill-shaped content in the academy and nothing used it: "inconsistency
 * between the form and the supporting documents is the single most common cause
 * of refusal. Not weakness, not eligibility: inconsistency."
 *
 * Which is why the deck is built as pairs rather than statements. The joinee is
 * not being asked whether a detail is correct in the abstract - they are being
 * asked to hold two documents side by side and see whether they agree, which is
 * the actual review we sell. 3.2 again: "a second reader catches it in seconds.
 * That is the entire argument for having one."
 *
 * `safe: true` means the pair is consistent and goes to the embassy as it
 * stands. The deck labels below say so on screen.
 */
export const DS160_LINES: readonly SwipeLine[] = [
  {
    id: "ds160.middle_name",
    text: "Passport: RAJESH KUMAR SHARMA · DS-160 surname/given names: Sharma, Rajesh",
    safe: false,
    because:
      "The middle name is missing. A name that does not match the passport exactly, middle names and spellings included, is the first item on the list — and the least dramatic way imaginable to lose a trip.",
  },
  {
    id: "ds160.spelling",
    text: "Passport: PRIYA MENON · DS-160: Priya Menon",
    safe: true,
    because:
      "Exact match, capitalisation aside. This is what the check is looking for and most of the deck will look like this — which is the point: the errors are rare, boring, and invisible unless someone is reading for them.",
  },
  {
    id: "ds160.dates_itinerary",
    text: "Itinerary: arriving 12 March, returning 26 March · DS-160 intended arrival: 2 March",
    safe: false,
    because:
      "Travel dates that do not match the itinerary. The officer has the form in front of them at the interview, and there is no time to recover from an answer that contradicts it.",
  },
  {
    id: "ds160.purpose_letter",
    text: "Cover letter: attending a partner's sales conference · DS-160 purpose of trip: Tourism",
    safe: false,
    because:
      "A stated purpose that does not match the cover letter. B1/B2 covers both business and tourism, so the visa class is not the problem — the contradiction is.",
  },
  {
    id: "ds160.port_of_entry",
    text: "Ticket: lands at Newark (EWR) · DS-160 port of entry: JFK",
    safe: false,
    because:
      "The wrong port of entry selected. It is on the mistake list, it is thirty seconds to fix before submission, and it is not fixable afterwards.",
  },
  {
    id: "ds160.employment_gap",
    text: "CV: eight months between jobs in 2023 · DS-160 employment history: continuous, no gap shown",
    safe: false,
    because:
      "Gaps or errors in employment history. Nothing about a gap is disqualifying; concealing one is a contradiction the officer can see.",
  },
  {
    id: "ds160.photo_spec",
    text: "Photo: 2x2 inches, plain white background, taken last month",
    safe: true,
    because:
      "Meets spec. A photo with the wrong dimensions or background is on the list, and it is exactly the sort of thing a guest filling this in alone at 1am does not check.",
  },
  {
    id: "ds160.social_handle",
    text: "DS-160 social media: an Instagram handle the guest closed two years ago",
    safe: false,
    because:
      "Wrong social media handles or contact details. It reads as carelessness on a form where every other answer is being read for credibility.",
  },
  {
    id: "ds160.funds_declared",
    text: "Bank statement: salary account in his own name · DS-160: trip funded by self, employer named as current employer",
    safe: true,
    because:
      "Consistent, and it answers who is funding the trip — one of the five things the officer actually asks about.",
  },
  {
    id: "ds160.prior_refusal",
    text: "Guest mentioned a 2023 Schengen refusal on the call · DS-160 previous visa refusals: No",
    safe: false,
    because:
      "The most serious one here. A prior refusal does not block a new application, but it must be declared and put in context rather than quietly omitted — and omitting it is a different problem from having it.",
  },
];

export const DS160_DECK: SwipeDeckConfig = {
  drillId: "ds160-consistency",
  eyebrow: "Drill · second read",
  title: "The second reader",
  description:
    "Ten pairs from a DS-160 and the documents behind it. Swipe right if the two agree and it can go as it stands, left if they contradict each other. Inconsistency between the form and the supporting documents is the single most common cause of refusal — not weakness, not eligibility. This is the review the fee actually buys.",
  right: { label: "✅ Consistent", stamp: "CONSISTENT ✓", heading: "✅ Consistent" },
  left: {
    label: "❌ Contradicts",
    stamp: "CONTRADICTS ✗",
    heading: "❌ Contradicts the file",
  },
  cardKicker: "Form against file",
  lines: DS160_LINES,
};
