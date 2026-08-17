/**
 * Day 2 coaching material from the manager's training hub.
 *
 * Two sets, both verbatim. The anxiety wall is the diagnosis half - what the
 * customer's opening line is actually about - and the reframes are the teaching
 * half. Wording is the hiring manager's; the only edit is that the customer's
 * words are stored unquoted so the components can print their own quote marks.
 */

export interface AnxietyOpener {
  id: string;
  /** The customer's opening line, as they type it. */
  message: string;
  /** What is underneath it. Never the same as the surface question. */
  fear: string;
  /** What you do before you answer - the first move, not the full reply. */
  move: string;
}

/**
 * Six openers, in the order the hub lists them. Every one of them looks like a
 * question about process and is really a question about loss.
 */
export const ANXIETY_OPENERS: readonly AnxietyOpener[] = [
  {
    id: "anxiety.approval_guaranteed",
    message: "Is Schengen visa approval guaranteed?",
    fear: "They have already paid for a trip and just realised the visa could take it away.",
    move: "Do not answer yes or no. Ask what they have booked and whether it is refundable. Their answer tells you which conversation you are actually in.",
  },
  {
    id: "anxiety.how_many_days",
    message: "How many days it will take?",
    fear: "The travel date is already fixed and they suspect they have left it too late.",
    move: "Get the travel date before you quote any timeline. Quote first and you have anchored them to a number you may have to take back.",
  },
  {
    id: "anxiety.rejected_last_month",
    message: "My visa got rejected last month",
    fear: "That they are marked for life and no country will let them in now.",
    move: "Say plainly that a prior refusal does not block a new application. Then ask if they still have the refusal letter. That question moves them from panic to task.",
  },
  {
    id: "anxiety.price_vs_local_agent",
    message: "Why is your price higher than the agent near my house?",
    fear: "Being quietly cheated by an app they cannot walk into.",
    move: "Ask what his quote includes and whether it covers the government fee. Half the time you are comparing a fee to a total and the gap disappears.",
  },
  {
    id: "anxiety.without_bank_statement",
    message: "Can I get visa without bank statement?",
    fear: "That they are not wealthy enough to be allowed to travel.",
    move: "Never make them feel judged. Ask what does exist in their name: salary account, FD, ITR, a sponsor. It is usually more than they think.",
  },
  {
    id: "anxiety.already_booked_tickets",
    message: "I already booked tickets for the 20th",
    fear: "That the money is gone either way and nobody will tell them straight.",
    move: "Check refundability first, before discussing the visa at all. A date change costs a fee; a lost trip costs everything.",
  },
];

export interface Reframe {
  id: string;
  /** What the customer walks in believing the problem is. */
  believe: string;
  /** What you change their mind to. The teaching move. */
  teach: string;
  /** Why the swap holds - the reasoning the agent has to be able to give. */
  why: string;
}

/**
 * The five reframes. Teaching is the first of the three moves: you do not answer
 * the question better than the last agent, you change what the customer thinks
 * the problem is.
 */
export const REFRAMES: readonly Reframe[] = [
  {
    id: "reframe.the_form",
    believe: "The hard part is filling the form.",
    teach: "The hard part is the appointment.",
    why: "Forms take twenty minutes. Slots take weeks and open at odd hours across centres nobody is watching.",
  },
  {
    id: "reframe.the_refund",
    believe: "A refund protects me if it goes wrong.",
    teach: "A refund protects the fee. Only time protects the trip.",
    why: "The most important reframe we have. A refusal seven weeks out is a delay you can recover from; the same refusal ten days out is a cancelled holiday. Sell the calendar, not the guarantee.",
  },
  {
    id: "reframe.who_i_am",
    believe: "I was rejected because of who I am.",
    teach: "Most refusals are about the file, not the person.",
    why: "Weak profiles get approved when the file is coherent; strong profiles get refused when it is not.",
  },
  {
    id: "reframe.cheaper_agent",
    believe: "The cheaper agent gets me the same outcome.",
    teach: "He is paid whether you are approved or not. That is the product difference.",
    why: "Do not attack the agent, attack the incentive. Ask what happens to their money if it is refused.",
  },
  {
    id: "reframe.apply_later",
    believe: "I will apply later, in case plans change.",
    teach: "Applying late is the most common reason people lose the trip.",
    why: "Delay feels like caution and is actually the biggest risk they are carrying.",
  },
];
