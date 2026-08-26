import type {
  MockScenario,
  ObjectionScript,
  PauseDrillContent,
  RewriteExercise,
  SorterStatement,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Day 2 · "Shut up for 10 seconds"                                            */
/* -------------------------------------------------------------------------- */

/**
 * The centrepiece drill. The exchange is verbatim from lesson 2.5's IN PRACTICE
 * example - the one where answering fast solves the wrong problem efficiently.
 */
export const PAUSE_DRILL: PauseDrillContent = {
  openingMessage: "Is approval guaranteed?",
  rushedReply: "No visa is guaranteed but…",
  followUpMessage:
    "I was rejected once before and don't want to lose money again.",
  waitSeconds: 10,
  rushedFeedback:
    "You just answered the question. You would have missed the fear. Wait for it.",
  modelAnswer:
    "You're right, and anyone who tells you otherwise is lying to you. Approval is the officer's call. What I control is that nothing in your file gives him a reason to say no, and that if the route is under AtlysProtect, a refusal returns your service fee — the government fee goes to the consulate and doesn't come back. Most refusals aren't about the person, they're about the file. Can I ask what's in your file right now?",
  exerciseKey: "day2.pause_drill_reply",
};

/* -------------------------------------------------------------------------- */
/* Day 2 · Dos vs Don'ts sorter                                                */
/* -------------------------------------------------------------------------- */

/**
 * The doc's five Dos and five Don'ts. The `because` line is the coaching note
 * shown after the joinee sorts each card.
 */
export const SORTER_STATEMENTS: readonly SorterStatement[] = [
  {
    id: "sort.acknowledge_first",
    text: "Acknowledge the customer's concern first",
    verdict: "do",
    because:
      "A concern that isn't acknowledged gets repeated. Naming it is what lets the conversation move on.",
  },
  {
    id: "sort.simple_language",
    text: "Use simple, human language. No jargon",
    verdict: "do",
    because:
      "Jargon sounds like hedging. If they have to decode you, they stop trusting you.",
  },
  {
    id: "sort.clear_timelines",
    text: "Be clear about timelines and next steps", 
    verdict: "do",
    because:
      "Vagueness reads as bad news being withheld. Specific beats optimistic.",
  },
  {
    id: "sort.clarifying_questions",
    text: "Ask clarifying questions before giving answers",
    verdict: "do",
    because:
      "The question they asked is rarely the question they need answered.",
  },
  {
    id: "sort.facts_not_assumptions",
    text: "Reassure with facts, not assumptions",
    verdict: "do",
    because:
      "An assumption that turns out wrong costs you the whole conversation, not just that point.",
  },
  {
    id: "sort.overpromise",
    text: "Promise a timeline or an approval to close the sale",
    verdict: "dont",
    because:
      "Never overpromise timelines or approvals. The refund conversation afterwards costs more than the sale.",
  },
  {
    id: "sort.guess_outcomes",
    text: "Give your best guess on whether their visa will be approved",
    verdict: "dont",
    because:
      "Don't guess visa outcomes. Approval is the officer's call and saying otherwise makes you the liar in the story.",
  },
  {
    id: "sort.rush_customer",
    text: "Push the customer to decide before they've finished thinking",
    verdict: "dont",
    because:
      "Don't rush the customer. Silence is where they tell you the real objection.",
  },
  {
    id: "sort.copy_paste",
    text: "Send a saved reply without reading what they actually asked",
    verdict: "dont",
    because:
      "Don't copy-paste without context. A template that misses the point proves nobody read them.",
  },
  {
    id: "sort.contradict_ops",
    text: "Give your own answer when it differs from what Ops told them",
    verdict: "dont",
    because:
      "Don't contradict Ops or Product guidelines. Two answers from one company means neither is believed.",
  },
];

/* -------------------------------------------------------------------------- */
/* Day 2 · Rewrite a bad chat                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The customer message and model answer are lesson 2.8's price answer. The bad
 * reply is written as a foil - it violates several stated rules at once - and is
 * not a real transcript.
 *
 * TODO(content): replace with a real sanitised Freshchat/Lime Chat transcript
 * once access is granted. See the access questions in the project brief.
 */
export const REWRITE_EXERCISE: RewriteExercise = {
  exerciseKey: "day2.rewrite_bad_chat",
  customerMessage:
    "Why is there an Atlys fee on top of the embassy fee? I'm already paying the government.",
  badReply:
    "Hi! Yes so unfortunately there is a nominal platform convenience charge that is applicable as per our standard pricing policy. I understand it may seem like a lot 😅 but I can check if any discount is available for you. Rest assured your visa will be processed smoothly!",
  problems: [
    '"Unfortunately" and "😅" apologise for the fee. Hesitation reads as the fee being negotiable.',
    '"Nominal platform convenience charge as per our standard pricing policy" is jargon. It explains nothing.',
    'Offering to "check if any discount is available" concedes the fee was too high before they even pushed.',
    '"Your visa will be processed smoothly" is a guess at the outcome, the one thing you must never do.',
    "It never answers the actual question: what does the fee buy?",
  ],
  modelAnswer:
    "The embassy fee pays for them to review your application. It doesn't get you a slot search, a document audit, a photo that passes spec, or someone answering at 11pm. Those are separate things and that's what our fee covers.",
  annotations: [
    "No apology, no softening. The fee is stated as a fact, the way a price is.",
    "Answers the literal question (here is what each fee buys) instead of deflecting to policy.",
    "Concrete deliverables (slot search, document audit, photo spec, 11pm support) replace the abstract word 'convenience'.",
    "Says nothing about the outcome of their application.",
    "Short. Length here signals discomfort.",
  ],
};

/* -------------------------------------------------------------------------- */
/* Day 2 · Objection scripts (lessons 2.8-2.11)                                */
/* -------------------------------------------------------------------------- */

/**
 * The Address step, and only the Address step.
 *
 * Lesson 2.6 is explicit about what these are: "The scripts in the lessons that
 * follow are the Address step — they are what goes here once Probe has told you
 * which conversation you are actually in." They used to be a standalone
 * hold-to-reveal reference tab, which meant the busiest day in the academy read
 * the answers without ever running the loop that decides which answer applies.
 * They are now the third slot of the `apac-loop` drill; `apacRoundFor` in
 * `apac.ts` maps each one to the round it answers.
 */
export const OBJECTION_SCRIPTS: readonly ObjectionScript[] = [
  {
    id: "obj.what_am_i_paying_for",
    objection: "You can't guarantee approval, so what am I paying for?",
    subtext:
      "They're pricing the outcome, and you can't sell the outcome. Move them to pricing the avoidable failure.",
    say: "You're right, and anyone who tells you otherwise is lying to you. Approval is the officer's call. What I control is that nothing in your file gives him a reason to say no, and that if the route is under AtlysProtect, a refusal returns your service fee — the government fee goes to the consulate and doesn't come back. Most refusals aren't about the person, they're about the file.",
    then: "Can I ask what's in your file right now?",
  },
  {
    id: "obj.local_agent_half",
    objection: "My local agent charges half of this.",
    subtext:
      "Usually true, and irrelevant. Don't attack the agent. The customer often knows him personally, and attacking him makes the agent's word more credible, not less.",
    // Both halves of the refund sentence, in the same breath, as 3.4 requires:
    // "Not the total, and not the government fee". This script in particular
    // cannot say only the first half - its own `then` line puts the government
    // fee on the table, so it is the one conversation where the guest is
    // adding up totals.
    say: "He might be great. Two questions worth asking him though: what happens to your money if it's refused, and does he review the file before submitting or just fill and forward? He gets paid either way. We don't, on recovery. And where the route is under AtlysProtect, a refusal returns your service fee — the government fee goes to the consulate and doesn't come back.",
    then: "What did he quote, and does that include the government fee? Half the time the comparison is fee-vs-total and the gap disappears.",
  },
  {
    id: "obj.fee_on_top",
    objection: "Why is there an Atlys fee on top of the embassy fee?",
    subtext:
      "Never apologise for the fee or soften it. Hesitation here reads as the fee being negotiable.",
    say: "The embassy fee buys you a review of your application. It doesn't buy you a slot search, a document audit, a photo that passes spec, or anyone answering the phone at 11pm.",
  },
  {
    id: "obj.do_it_myself",
    objection: "I'll just do it myself on the VFS/portal site.",
    subtext:
      "Don't argue that they can't. Name the two things self-service genuinely can't do: a slot earlier than what the portal is showing them today, and an outside reader on their file.",
    say: "You can, and plenty of people do. Two things it won't get you: a slot earlier than what the portal is showing you today, and someone other than you reading your file before it goes in.",
    then: "How many days out is your travel? Urgency does the selling.",
  },
  {
    id: "obj.lose_the_whole_trip",
    objection: "But if I'm rejected I lose the whole trip, not just the fee.",
    subtext:
      "They're right. Don't pretend a fee refund covers a trip. Agreeing is what makes the rest credible.",
    say: "Honestly, you're right, and I'm not going to pretend a fee refund covers your trip. Nothing does, with us or anyone. Two things actually protect it: a file with no avoidable gaps, and applying early enough that a refusal is a delay instead of a cancellation.",
    then: "Have you booked anything yet, and is it refundable?",
  },
];

/* -------------------------------------------------------------------------- */
/* Day 2 · Mock scenarios (lessons 2.8-2.11)                                   */
/* -------------------------------------------------------------------------- */

/**
 * One scenario per objection lesson. The "closes" reply in each is that
 * lesson's own answer; the "deepens" replies are foils that each break a
 * specific stated rule.
 *
 * These run on Day 2 (see `days.ts`), not Day 5 - the academy has been three
 * days since Aug 2026. The old header said Day 5 and nothing broke, which is
 * exactly how a content edit lands on the wrong day.
 */
export const MOCK_SCENARIOS: readonly MockScenario[] = [
  {
    id: "scenario.price_objection",
    label: "Price objection",
    context:
      "Inbound chat. They have read the pricing page and have not started an application.",
    customerMessage:
      "You can't guarantee approval, so what exactly am I paying for?",
    replies: [
      {
        id: "price.a",
        text: "No visa is guaranteed, but we have a very high success rate and our customers are very happy with the service.",
        outcome: "deepens",
        customerResponse:
          "A high success rate for other people doesn't help me though.",
        feedback:
          "A success rate is a statistic about strangers. It answers nothing they asked and edges towards guessing an outcome.",
      },
      {
        id: "price.b",
        text: "You're right, and anyone who tells you otherwise is lying to you. Approval is the officer's call. What I control is that nothing in your file gives him a reason to say no, and that on a route under AtlysProtect, a refusal returns your service fee — not the government fee, which the consulate keeps. Most refusals aren't about the person, they're about the file. Can I ask what's in your file right now?",
        outcome: "closes",
        customerResponse:
          "Passport, bank statements from the last three months, and my offer letter. Is that enough?",
        feedback:
          "Conceding the point they were braced to fight for is what buys the rest. The closing question moves them from evaluating you to working with you.",
      },
      {
        id: "price.c",
        text: "I can check with my manager whether we can do something on the price for you.",
        outcome: "deepens",
        customerResponse: "So the price is negotiable? What's the real price?",
        feedback:
          "Reaching for a discount concedes the fee was too high before they pushed. Now every number you quote is a starting bid.",
      },
    ],
  },
  {
    id: "scenario.timeline_anxiety",
    label: "Timeline anxiety",
    context:
      "Inbound call transcript. They travel in 23 days and have not applied.",
    customerMessage:
      "I fly on the 20th. Will I definitely have the visa by then?",
    replies: [
      {
        id: "time.a",
        text: "Yes, 23 days is plenty of time. You'll have it well before you fly.",
        outcome: "deepens",
        customerResponse: "Great, so I can go ahead and book the hotel?",
        feedback:
          "You just overpromised a timeline and triggered a non-refundable booking on it. If the slot slips, the trip is your fault now.",
      },
      {
        id: "time.b",
        text: "I'm not going to promise you a date I don't control. The appointment slot and the officer's queue both sit outside us. What I can tell you today is what slots are actually showing for your city, and what applying this week rather than next changes. Have you booked anything that isn't refundable yet?",
        outcome: "closes",
        customerResponse:
          "Only the flight. Everything else I was going to book once the visa came through.",
        feedback:
          "Clear about what you control and what you don't, and the closing question surfaces the real exposure before it grows.",
      },
    ],
  },
  {
    id: "scenario.rejection_fear",
    label: "Visa rejection fear",
    context: "Inbound chat. They were refused a visa once before.",
    customerMessage:
      "If I'm rejected I lose the whole trip, not just your fee.",
    replies: [
      {
        id: "reject.a",
        text: "Don't worry, rejections are very rare and I'm sure you'll be fine.",
        outcome: "deepens",
        customerResponse:
          "I was told that last time too, and I was rejected.",
        feedback:
          '"Don\'t worry" dismisses the fear instead of acknowledging it, and "I\'m sure you\'ll be fine" is a guess at the outcome.',
      },
      {
        id: "reject.b",
        text: "Honestly, you're right, and I'm not going to pretend a fee refund covers your trip. Nothing does, with us or anyone. Two things actually protect it: a file with no avoidable gaps, and applying early enough that a refusal is a delay instead of a cancellation. Have you booked anything yet, and is it refundable?",
        outcome: "closes",
        customerResponse:
          "Nothing booked yet. What counts as an avoidable gap? Is that documents?",
        feedback:
          "Agreeing with the hard part is what makes the reassurance credible. They are now asking how to improve the file rather than whether to buy.",
      },
      {
        id: "reject.c",
        text: "On eligible routes we offer a full refund if you're rejected, so you're covered.",
        outcome: "deepens",
        customerResponse:
          "Covered for your fee. Not for the flights or the leave I've already taken.",
        feedback:
          "Wrong twice. \"Full refund\" is not the policy — AtlysProtect returns the service fee, not the government fee — so this is a written overcommitment. And even stated correctly it answers a smaller question than the one asked: leading with the refund reads as not having listened.",
      },
    ],
  },
  {
    id: "scenario.competitor_comparison",
    label: "Comparing competitors",
    context:
      "Inbound chat. They have a quote from a local agent they know personally.",
    customerMessage: "My local agent charges half of this.",
    replies: [
      {
        id: "compete.a",
        text: "A lot of those local agents are unreliable and people come to us after being let down by them.",
        outcome: "deepens",
        customerResponse:
          "He's done my brother's visa and my uncle's. He's not unreliable.",
        feedback:
          "Attacking the agent makes his word more credible, not less. They know him and they don't know you.",
      },
      {
        id: "compete.b",
        text: "He might be great. Two questions worth asking him though: what happens to your money if it's refused, and does he review the file before submitting or just fill and forward? He gets paid either way. What did he quote, and does that include the government fee?",
        outcome: "closes",
        customerResponse:
          "He said ₹8,000. Actually I'm not sure if that includes the embassy fee. Let me check.",
        feedback:
          "Half the time the comparison is fee-vs-total and the gap disappears when they check. You never had to criticise the agent to get there.",
      },
    ],
  },
];
