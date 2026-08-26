import type { LeadCard, LeadStatus } from "./types";

/**
 * Day 3 · Move the lead (lesson 3.5).
 *
 * A five-column version of the ownership sort, over Cadence notes rather than
 * abstractions. 3.5 makes two claims that only a sorting drill can test:
 *
 *  - Qualified asserts something. "It is the status that says you ran the six
 *    fields from Day 2 and the case is genuinely sellable." So the deck holds
 *    cards that feel Qualified and are not, and the miss is always one of the
 *    six fields - usually prior rejections or funds, "the two that get skipped
 *    when the customer sounds friendly."
 *  - Lost is not a failure. "A lead parked at Contacted forever is worse than
 *    one honestly marked Lost: it inflates the pipeline, it hides from
 *    re-engagement lists, and it means nobody knows whether you have capacity."
 *
 * `closed` covers Converted-or-Lost, which 3.5 treats as one terminal step.
 */
export const LEAD_STATUS_COLUMNS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  started: "Application Started",
  closed: "Converted / Lost",
};

/** The order a lead moves through them. Printed under the columns. */
export const LEAD_STATUS_ORDER: readonly LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "started",
  "closed",
];

export const LEAD_CARDS: readonly LeadCard[] = [
  {
    id: "lead.untouched",
    note: "Web form, Tuesday 09:14. Schengen, no other detail. Nobody has called.",
    status: "new",
    because:
      "Nothing has happened to it yet. Worth remembering what this row costs while it sits here: leads never contacted are the single biggest source of lost revenue, larger than every objection combined.",
  },
  {
    id: "lead.friendly_no_fields",
    note: "Lovely 20-minute call. Wants Schengen for a family holiday, says budget is not an issue, asked lots of questions. Sending him the brochure.",
    status: "contacted",
    because:
      "It feels Qualified and it is not. No travel date, no prior-rejection answer, no funds answer. Moving a lead to Qualified on a good feeling rather than on a travel date, a destination and a funds answer is how an unsellable case gets counted as pipeline and then reappears as a refund.",
  },
  {
    id: "lead.six_fields_done",
    note: "Called back. US B1/B2, both parents travelling, flying 12 March, resident in India, no prior refusals anywhere, salary account plus an FD in his name. Sending the DS-160 walkthrough.",
    status: "qualified",
    because:
      "All six fields answered, and the case is genuinely sellable. That is what the status asserts — not that you like your chances.",
  },
  {
    id: "lead.rejection_unasked",
    note: "Schengen, flying 2 April, two travellers, salary account looks fine. Keen to pay this week. Did not get round to asking about earlier applications.",
    status: "contacted",
    because:
      "Five of six is not six, and the missing one is the field that decides whether the case is sellable at all. Prior rejections and funds are the two that get skipped when the customer sounds friendly and the call is going well.",
  },
  {
    id: "lead.ds160_started",
    note: "Paid nothing yet, but he has started his DS-160 and sent me the application ID to review.",
    status: "started",
    because:
      "The work has begun on the application itself. The status is how the next person knows that without reading the whole thread.",
  },
  {
    id: "lead.six_weeks_cold",
    note: "Six weeks at Contacted. Three calls unanswered, two WhatsApps unread, no reply since the first conversation.",
    status: "closed",
    because:
      "Mark it Lost, with the reason in the notes. A lead parked at Contacted forever inflates the pipeline, hides from re-engagement lists, and means nobody knows whether you have capacity. Lost is not an admission of failure and should not be avoided.",
  },
  {
    id: "lead.disqualified",
    note: "Wants a Schengen visa for a trip in eleven days. Told him plainly that the timeline does not work and I was not going to take his money pretending otherwise.",
    status: "closed",
    because:
      "Disqualified openly on Day 2 becomes Lost here, with the reason in the notes. The walk-away is the commercially correct move as well as the honest one — selling to the unqualified is negative margin once refunds and reviews are counted.",
  },
  {
    id: "lead.researching",
    note: "“Sometime next year, just researching.” Destination undecided. Answered every question happily.",
    status: "contacted",
    because:
      "Contacted, and genuinely so. Note what the status does not tell you: this and a guest flying on the 20th with booked flights both sit here, and only one is a today problem. Use the Day 2 fields as your proxy — a fixed travel date, non-refundable bookings, a hard destination.",
  },
  {
    id: "lead.paid",
    note: "Paid this morning. File handed to Ops with the checklist and my notes.",
    status: "closed",
    because:
      "Converted. And the notes are the handover — status without them is a row in a table, and the next person has to ask the guest to repeat themselves.",
  },
];
