import "server-only";

import type { AnswerKey, QuestionId, QuizSlug } from "./types";

/**
 * Correct answers and explanations. **Server-only.**
 *
 * The `import "server-only"` above turns any accidental client import into a
 * build error, which is what enforces "the client never learns the answer until
 * after submission". Do not re-export anything from here through a module that
 * client components import.
 *
 * Option ids here are positional in `quiz.ts` (`a`/`b`/`c`/`d`) but the quiz
 * runner shuffles both questions and options per attempt, so the position a
 * correct answer happens to occupy in the source file carries no signal.
 */
export const ANSWERS: Record<QuizSlug, Record<QuestionId, AnswerKey>> = {
  day1: {
    "d1.q6": {
      correct: "a",
      explanation:
        "Customers do not come to buy a visa, they come to stop being afraid of one. What removes the fear is the things we can actually be held to (a committed delivery date we are accountable to, a published refund policy, a route that can be filed), not a confident tone. New joiners miss this two ways: treating the conversation as order processing, and reaching for false reassurance, which only moves the fear further down the line.",
    },
    "d1.q7": {
      correct: "a",
      explanation:
        "Roughly one in five conversions are destinations that are visa-free or near-free for an Indian passport; together they produce almost none of the revenue while consuming real agent hours. The hard countries (US, UK, Schengen, Canada, Japan, Korea, China) are where the value is and where the customer most needs a competent human. Grading a customer by their fee is forbidden; choosing where your own hours go is a different question.",
    },
    "d1.q8": {
      correct: "a",
      explanation:
        "Ask every hard-country customer whether they have ever been refused, anywhere. Most agents forget, and rejection recovery is the highest-value work per case by a wide margin, on a fraction of the volume. A prior refusal does not block a new application, but it changes the file, and learning about it after payment is learning about it too late.",
    },
    "d1.q9": {
      correct: "a",
      explanation:
        "Almost every angry Atlys customer was made angry pre-checkout: promised a timeline that could not be met, told a refund covered more than it does, allowed to believe approval was assured, or sold a route that could not be filed. Each one is created by an agent, in writing, before a document reaches ops, and because of the on-time guarantee a bad promise costs the company the entire fee and produces a detractor. You are the last point where a customer can be saved from a bad decision, and the first point where we can inflict one.",
    },
    "d1.q10": {
      correct: "a",
      explanation:
        "The test: if it is about whether and what, it is yours; if it is about where it is and when, it is theirs. Adding a dependant is whether-and-what (category, eligibility, whether the file survives an officer), so deciding it is your job, not something to acknowledge and forward. You stay their named person for a fixed period after checkout. Disappearing at the seam once payment lands is the Day 1 mistake new joiners make most.",
    },
    "d1.q12": {
      correct: "a",
      explanation:
        "Disqualify openly. Selling to someone whose timeline cannot work is negative margin once the refund, the hours and the review are counted, so the walk-away is the commercially correct move, not just the kind one, and you do not need permission to make it. Writing the risk into the chat protects the record and not the customer; you still took money for a filing you expect to fail. \"They are an adult\" outsources a judgement that is the whole point of an advisory function. And asking Ops to prioritise spends someone else's capacity to rescue a sale that should not have been made.",
    },
    "d1.q13": {
      correct: "a",
      explanation:
        "Campaigns run treatment against control, so what is reported is incremental conversion (the lift you created), not the gross number that closed. Conversions that would have happened without you are not evidence of anything. This is the reason the function is advisory rather than pushy: pressure moves gross numbers and does nothing to lift, so the tactics that look like performance produce none.",
    },
    "d1.q11": {
      correct: "a",
      explanation:
        "Fabricated documents get customers banned, not just refused, so this is a walk-away with a flag: immediate, and not a negotiation. Asking what else exists in their name is the right move for someone who is *worried* their balance is weak; it is no longer the move once they have asked you to change what a document says. Leaving the decision with them is the same red line with your fingerprints wiped off it.",
    },
  },

  day2: {
    "d2.q1": {
      correct: "a",
      explanation:
        "The guest will tell you how to sell to them if you shut up long enough. Silence is an intel-gathering tool, not a politeness one.",
    },
    "d2.q2": {
      correct: "a",
      explanation:
        'Answering fast means you answered the question and missed the fear. The doc\'s example: the real message was "I was rejected once before and don\'t want to lose money again."',
    },
    "d2.q3": {
      correct: "a",
      explanation:
        "Budget concerns, timeline pressure, past bad experiences, competitor comparisons. All volunteered rather than extracted. Free intel.",
    },
    "d2.q4": {
      correct: "a",
      explanation:
        "Don't guess visa outcomes. The other three options are all on the Dos list.",
    },
    "d2.q5": {
      correct: "a",
      explanation:
        "Don't copy-paste without context. Read what they asked; the template is a starting point, not the reply.",
    },
    "d2.q6": {
      correct: "a",
      explanation:
        "Don't contradict Ops or Product guidelines. Two different answers from one company means the guest believes neither.",
    },
    "d2.q7": {
      correct: "a",
      explanation: "Friendly, calm, confident: the doc's tone guideline.",
    },
    "d2.q8": {
      correct: "a",
      explanation:
        "Reassure with facts, not assumptions. Reassurance that isn't grounded in something true is just a guess with a nicer voice.",
    },
    "d2.q9": {
      correct: "a",
      explanation:
        "Teach. Do not answer the question better than the last agent. Change what the customer thinks the problem is. \"The hard part is the form\" becomes \"the hard part is the appointment\". Once he sees the problem differently our answer is the obvious one and price stops being the conversation. Research on around 6,000 salespeople found that in complex, high-stakes sales the people who set out to be liked are the worst performers; the best teach the customer something they did not know.",
    },
    "d2.q10": {
      correct: "a",
      explanation:
        "Empathy is never rationed; sequence always is. In an emergency room every patient matters equally, which is precisely why triage exists. Nobody honours \"all patients are priority\" by seeing them in arrival order. The quality of attention is identical whether the case is worth Rs 3,000 or Rs 40,000; the order is set by consequence of delay, not by fee and not by who complained loudest. And nobody waits in silence: if you cannot deal with someone now, they get a time, not nothing. The unanswered message is the empathy failure. The wait is not.",
    },
    "d2.q11": {
      correct: "a",
      explanation:
        "The most important reframe we have. A refund protects the fee. Only time protects the trip. A refusal seven weeks out is a delay he can recover from; the same refusal ten days out is a cancelled holiday. Sell the calendar, not the guarantee, and never put a refund figure in writing without checking the cover for that exact route.",
    },
  },

  day3: {
    "d3.q1": {
      correct: "a",
      explanation:
        "Approval is the officer's call. Saying anything else makes you the person who lied when it goes the other way.",
    },
    "d3.q2": {
      correct: "a",
      explanation:
        "What we control is that nothing in the file gives the officer a reason to say no, and that the appointment is booked as early as it can be.",
    },
    "d3.q3": {
      correct: "a",
      explanation:
        "You cannot sell the outcome, so sell against the avoidable failure: the gaps nobody caught before submission.",
    },
    "d3.q4": {
      correct: "a",
      explanation:
        "Ops sees the failures first-hand. Those five points are the raw material for your best objection answers.",
    },
    "d3.q5": {
      correct: "a",
      explanation:
        "Be clear about timelines, and clear about what is outside our control. An average from past applications is an assumption dressed as a fact.",
    },
    "d3.q6": {
      correct: "a",
      explanation:
        "Under AtlysProtect a refusal returns the service fee. The government fee went to the consulate and does not come back, and no cover changes that. Say both halves in the same breath: what returns and what does not. And the cover only exists where the route is under AtlysProtect, so check the route before the number goes in, which is why \"the service fee on any route\" is wrong for a different reason than \"the total\". Our own published pages have disagreed with each other on this, so you check rather than recall. \"Full refund\" typed into a chat is a written commitment the guest can hold up later, and honouring it costs the company money it never kept.",
    },
    "d3.q7": {
      correct: "a",
      explanation:
        "Lead with pay-on-approval. We decode why the visa was refused, build a personalised recovery plan and reapply, and the guest pays only when they are approved (https://www.atlys.com/en-IN/rejection-recovery). Someone who has already lost money once cannot hear anything else until that is out of the way, which is why it goes first rather than third. The other three are not lies so much as bad openers: a prior refusal genuinely does not block a new application, but \"nothing to worry about\" is false reassurance; the refusal reason is the whole input to the plan, not a detail to move past; and whether they can reapply, and how soon, depends on the country, so that is something you check before you agree to any date.",
    },
    "d3.q10": {
      correct: "a",
      explanation:
        "We guide the guest through the DS-160, prefill what can be prefilled, and review every section against their passport and supporting documents, flagging anything inconsistent before it reaches the embassy. Say that concretely. It is the most tangible thing our fee buys. The guest still fills the form, so \"they never have to look at it\" is not what we do. \"Nothing beyond submitting it\" gives away the actual work. And a contact at the consulate is one of the Day 1 red lines: no such person exists, and offering one is a promise that ends in a complaint.",
    },
    "d3.q11": {
      correct: "a",
      explanation:
        "Almost every applicant between 14 and 79 attends in person. The officer asks about purpose, duration, who is funding the trip, ties to India (job, family, property) and travel history, and the answers have to be consistent with the DS-160, which is why the form review matters beyond tidiness. Guests should carry bank statements, an employment letter and an itinerary, and should also be told the officer may never ask for them. Calling it a formality is a false description of a conversation that can end in a refusal. Carrying everything they own is not the instruction either. And preparing answers together drifts into rehearsing a story, which is the wrong side of the red lines. You describe the shape of the conversation, you do not script it.",
    },
    "d3.q9": {
      correct: "a",
      explanation:
        "For the US B1/B2 we need no documents from the guest. The only thing that has to be filled is the DS-160, and some guests arrive having already done it, so ask before you send someone off to fill a form twice. All three wrong answers are the same instinct: inventing a document set because a visa surely must need one, whether that is a standard checklist, a bank statement, or a list that supposedly lands after the appointment. Two limits: this is a US B1/B2 answer and not a general one, because on most other destinations assembling the documents is the work; and it means nothing is gated on them sending us a document set, not that documents play no part. They carry bank statements, an employment letter and an itinerary to the interview, and we check the DS-160 against them. So it is not a sentence to send on its own.",
    },
    "d3.q8": {
      correct: "a",
      explanation:
        "Commit to the number on the country page. That is the number the company stands behind and the one ops is held to, so it is the only one that belongs in a chat. A buffer of your own invention is still a number you invented, and it becomes the date the guest plans the trip around. An average from the last few applications is an assumption dressed as a fact. Refusing to give any number sounds careful and reads as not knowing your own product. Genuine special cases exist and get revised with Ops: the country page is the default, and improving on it is not your call.",
    },
  },

  day4: {
    "d4.q1": {
      correct: "a",
      explanation:
        "Ops owns visa processing, timelines and exceptions. Product owns feature clarity, bugs and roadmap.",
    },
    "d4.q2": {
      correct: "a",
      explanation:
        "Bugs are Product. Knowing which team owns which decision is the point of Day 4.",
    },
    "d4.q3": {
      correct: "a",
      explanation:
        "Intent and urgency: identifying them is one of the five core responsibilities from Day 1.",
    },
    "d4.q4": {
      correct: "a",
      explanation:
        "The flowchart is for you. Its value is that you stop having to ask who owns the next step.",
    },
    "d4.q5": {
      correct: "a",
      explanation:
        "Follow-ups and handovers are a named part of the day. A guest repeating themselves is the clearest signal a handover was done badly.",
    },
    "d4.q6": {
      correct: "a",
      explanation:
        "Close on the call where you can; where you cannot, a structured follow-up goes out within two minutes and then a defined three-touch cadence. Two minutes is the window while they still remember the conversation. At two hours you are a notification. In India most of this does not close on the first call, so the cadence is where the revenue actually lands, which is also why marking the lead cold is the most expensive of these options: leads never contacted are the single biggest source of lost revenue, larger than every objection combined. \"Giving them room\" sounds respectful and is how a warm lead goes cold, and resending the pricing page adds no new information for them to react to.",
    },
    "d4.q7": {
      correct: "a",
      explanation:
        "Blended comp is what makes honesty the associate's own winning strategy rather than only the company's safe one, and that distinction matters most in the month you are behind on target. Paid on conversion alone, the fastest-reporting metric wins: conversion lands today, while refunds, rejections and QA land weeks later, so a bad month looks like a good one right up until it does not. Promise violations per 100 calls is the same idea applied to the Day 1 red lines: they are scored events, not matters of taste.",
    },
  },

  day5: {
    "d5.q1": {
      correct: "a",
      explanation:
        "They are pricing the outcome, and the outcome is not ours to sell. Move them to pricing the avoidable failure: the file.",
    },
    "d5.q2": {
      correct: "a",
      explanation:
        "They often know him personally. Attacking him makes his word more credible, not less. Ask questions about him instead.",
    },
    "d5.q3": {
      correct: "a",
      explanation:
        "Half the time the comparison is our total against his fee. Once the government fee is added, the gap disappears on its own.",
    },
    "d5.q4": {
      correct: "a",
      explanation:
        "Say plainly what the fee buys: slot search, document audit, a photo that passes spec, someone answering at 11pm. Hesitation reads as the fee being negotiable.",
    },
    "d5.q5": {
      correct: "a",
      explanation:
        "Agreeing with the hard part is what makes the rest credible. Then name the two things that do protect the trip: no avoidable gaps, and applying early enough that a refusal is a delay rather than a cancellation.",
    },
    "d5.q6": {
      correct: "a",
      explanation:
        "Don't argue that they can't do it themselves. Name the two things self-service genuinely can't do, then let urgency do the selling.",
    },
  },
};

