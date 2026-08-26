import type { ApacRound } from "./types";

/**
 * Day 2 · APAC, run as a loop rather than read as a list.
 *
 * Lesson 2.6 is the only framework in the academy with an order that carries
 * meaning - "Address on its own is a good answer to a question nobody asked,
 * and Probe without Acknowledge sounds like an interrogation" - and until this
 * drill existed nothing made a joinee run it. They could name the four letters
 * in the quiz and had never sequenced them.
 *
 * Two things the drill has to teach that a quiz question cannot:
 *
 *  1. The step people actually skip. 2.6: "This is the step people skip when
 *     they are confident about the answer, and skipping it is what makes a
 *     correct answer land as a rebuttal." So the price round offers its own
 *     correct Address line as an Acknowledge option. It is the right sentence.
 *     It is in the wrong slot. That is the lesson, and a `wrong-step` verdict
 *     says so rather than marking it simply wrong.
 *
 *  2. That Probe changes the answer. 2.6: "Price objections are frequently
 *     timeline objections, and timeline objections are frequently rejection
 *     fear." Each round's Probe step carries a `reveal`, and the Address
 *     options are written against what the reveal surfaced - so the textbook
 *     answer to the objection the guest *said* is a wrong pick once Probe has
 *     told you which conversation you are in.
 *
 * The Address options are the scripts from `OBJECTION_SCRIPTS` in `drills.ts`,
 * which is what 2.6 says they are for: "The scripts in the lessons that follow
 * are the Address step - they are what goes here once Probe has told you which
 * conversation you are actually in."
 *
 * Two rounds, seven picks. It ran three rounds and twelve once: the competitor
 * round went because `mock-scenarios` and `obj.local_agent_half` already drill
 * that objection end to end, and the second round starts with Acknowledge
 * pre-played (see `opening`) because the first round just drilled it. What is
 * kept is exactly 2.6's sentence: price is frequently timeline, and timeline is
 * frequently rejection fear.
 */
export const APAC_ROUNDS: readonly ApacRound[] = [
  {
    id: "apac.price_is_timeline",
    label: "The price that is not about price",
    context:
      "Inbound chat. They have read the pricing page and have not started an application.",
    objection: "Honestly, this is more than I wanted to spend.",
    steps: [
      {
        id: "acknowledge",
        brief: "Name the objection and validate it. Nothing else yet.",
        options: [
          {
            id: "apac.p.a1",
            text: "I completely understand, that's a really common concern.",
            verdict: "correct",
            because:
              "Straight from the lesson. It costs one sentence and it is what stops everything after it landing as a rebuttal.",
          },
          {
            id: "apac.p.a2",
            text: "The embassy fee buys a review of the application. It doesn't buy a slot search, a document audit, a photo that passes spec, or anyone answering the phone at 11pm.",
            verdict: "wrong-step",
            because:
              "That is a good answer, and it is the Address step. This is the step people skip when they are confident about the answer, and skipping it is what makes a correct answer land as a rebuttal.",
          },
          {
            id: "apac.p.a3",
            text: "I hear you, but the pricing is what it is.",
            verdict: "wrong",
            because:
              "“I hear you, but” deletes the acknowledgement it opens with. It validates nothing and offers nothing.",
          },
        ],
      },
      {
        id: "probe",
        brief:
          "Find the real concern under the surface one. You cannot address what you have not located.",
        reveal:
          "It's not really the amount. I fly in nine days and I'm scared I'll pay and still not have it in time.",
        options: [
          {
            id: "apac.p.p1",
            text: "Can I ask what's making you hesitate specifically — is it the number itself, or something about the timing?",
            verdict: "correct",
            because:
              "A question aimed under the surface. Price objections are frequently timeline objections, and this is the sentence that finds out.",
          },
          {
            id: "apac.p.p2",
            text: "Does that make sense so far?",
            verdict: "wrong-step",
            because:
              "That is Confirm, and there is nothing yet to confirm. Confirm is the last step, not a filler.",
          },
          {
            id: "apac.p.p3",
            text: "Would a small discount help you decide today?",
            verdict: "wrong",
            because:
              "A discount nobody asked for. It concedes the fee was too high before they pushed, and now every number you quote is a starting bid.",
          },
        ],
      },
      {
        id: "address",
        brief:
          "Respond to the real concern with specific, credible information. An answer, not a pitch.",
        options: [
          {
            id: "apac.p.d1",
            text: "I'm not going to promise you a date I don't control — the appointment queue is the consulate's. What I can tell you is what slots are actually showing for your city today, and what applying this week rather than next changes.",
            verdict: "correct",
            because:
              "Probe said timeline, so this is a timeline conversation. Be explicit about what is not ours to control, and quote what the slots show today rather than a comfortable average.",
          },
          {
            id: "apac.p.d2",
            text: "The embassy fee buys a review of the application. It doesn't buy a slot search, a document audit, a photo that passes spec, or anyone answering the phone at 11pm.",
            verdict: "wrong",
            because:
              "This is the right answer to the objection they said out loud, and the wrong one now. Probe has told you which conversation you are actually in, and answering the surface question after locating the real one wastes the only thing Probe bought you.",
          },
          {
            id: "apac.p.d3",
            text: "Nine days is tight but we'll get it done for you.",
            verdict: "wrong",
            because:
              "A delivery date you do not control, in writing. That is a promise violation, counted per 100 calls — and if the slot slips, the trip is your fault now.",
          },
        ],
      },
      {
        id: "confirm",
        brief:
          "Check the concern is resolved, then move forward. Without this you do not know whether you answered them or just talked.",
        options: [
          {
            id: "apac.p.c1",
            text: "Does that make sense? Is that helpful?",
            verdict: "correct",
            because:
              "The whole step, and it is two short questions. Skip it and the objection returns later as silence.",
          },
          {
            id: "apac.p.c2",
            text: "Great — I'll send the payment link across now.",
            verdict: "wrong",
            because:
              "Moving forward is right; moving forward without checking is not. You have no idea yet whether you answered them.",
          },
          {
            id: "apac.p.c3",
            text: "Let me know if you have any other questions.",
            verdict: "wrong",
            because:
              "Hands the work back to an anxious guest and ends on nothing they can do. Every message should end with something they can act on.",
          },
        ],
      },
    ],
    lesson:
      "An objection is a signal, not a refusal — someone who has decided against you goes quiet rather than argues. This one said price and meant timeline, and only Probe could have told you.",
  },
  {
    id: "apac.timeline_is_rejection_fear",
    label: "The timeline that is not about timing",
    context: "Inbound call. They travel on the 20th and have not applied.",
    objection: "Can you actually get this done before the 20th?",
    // Acknowledge is pre-played: the round before just drilled that slot, so
    // this round picks the call up one line in and runs the three steps that
    // still have something to teach.
    opening: {
      text: "I know that is not what you planned for.",
      note: "You have already acknowledged — that slot is done. Pick the loop up from Probe.",
    },
    steps: [
      {
        id: "probe",
        brief: "Locate the concern. Ask, or say nothing and let them fill it.",
        reveal:
          "I was refused once before. If it happens again I've lost the flights and the leave too, not just your fee.",
        options: [
          {
            id: "apac.t.p1",
            text: "Can I ask what's making you hesitate on the timeline specifically?",
            verdict: "correct",
            because:
              "The lesson's own Probe, word for word. Timeline objections are frequently rejection fear, and this is how you find out before you answer.",
          },
          {
            id: "apac.t.p2",
            text: "… (say nothing for ten seconds)",
            verdict: "correct",
            because:
              "Also right, and often better on a call. The pause rule is the honest version of Probe: silence and a question do the same job, and the guest fills it with the objection they had not planned to admit.",
          },
          {
            id: "apac.t.p3",
            text: "It should be fine — how many days out are you exactly?",
            verdict: "wrong",
            because:
              "The question is a good one, but “it should be fine” answered the objection before locating it, and it answered with a guess.",
          },
        ],
      },
      {
        id: "address",
        brief: "Now answer the concern Probe actually surfaced.",
        options: [
          {
            id: "apac.t.d1",
            text: "Honestly, you're right, and I'm not going to pretend a fee refund covers your trip. Nothing does, with us or anyone. Two things actually protect it: a file with no avoidable gaps, and applying early enough that a refusal is a delay instead of a cancellation.",
            verdict: "correct",
            because:
              "Agreeing with the hard part is what makes the rest credible. And it answers the trip, which is what they are afraid of losing.",
          },
          {
            id: "apac.t.d2",
            text: "Here's what slots are showing for your city today, and what applying this week rather than next changes.",
            verdict: "wrong",
            because:
              "The right answer to the timeline question they asked, and Probe has just told you the timeline was never the concern. Timeline objections are frequently rejection fear.",
          },
          {
            id: "apac.t.d3",
            text: "On a route under AtlysProtect you get a full refund if you're refused, so you're covered either way.",
            verdict: "wrong",
            because:
              "Wrong twice. AtlysProtect returns the service fee, not the total and not the government fee — so this is a written overcommitment. And leading with the refund answers the money and ignores the trip, which reads as not having listened.",
          },
        ],
      },
      {
        id: "confirm",
        brief: "Close the loop before you move.",
        options: [
          {
            id: "apac.t.c1",
            text: "Does that land? And can I ask — have you booked anything yet, and is it refundable?",
            verdict: "correct",
            because:
              "Confirms the concern is resolved and moves forward in the same breath. The booking question surfaces the real exposure before it grows.",
          },
          {
            id: "apac.t.c2",
            text: "So shall we get started?",
            verdict: "wrong",
            because:
              "A close, not a confirm. You still do not know whether the rejection fear was answered, and an unconfirmed objection comes back as silence.",
          },
          {
            id: "apac.t.c3",
            text: "I completely understand, that's a really common concern.",
            verdict: "wrong-step",
            because:
              "That is Acknowledge, and it has already been played. Arriving here it reads as a stall.",
          },
        ],
      },
    ],
    lesson:
      "Two objections in a row that disguised something else. That is not bad luck — 2.6 names both of these as the usual pattern, which is why Probe is not optional.",
  },
];

/** Total picks in a full run - one per step, per round. */
export const APAC_MAX_SCORE = APAC_ROUNDS.reduce(
  (total, round) => total + round.steps.length,
  0,
);

/** Step labels, printed on the four slots. */
export const APAC_STEP_LABELS = {
  acknowledge: "Acknowledge",
  probe: "Probe",
  address: "Address",
  confirm: "Confirm",
} as const;
