import type { Quiz, QuizSlug } from "./types";

/**
 * Questions and options only - **no correct answers**. This module is imported
 * by client components, so anything in here ships to the browser. Correct
 * answers and explanations live in `answers.ts`, which imports `"server-only"`.
 *
 * Question ids are persisted in `quiz_response.question_id`. Never rename one;
 * retire it and add a new id instead.
 *
 * Every question must be answerable from the source material: Day 1 and the last
 * three Day 2 questions come from the onboarding manual (§1.1-§1.4, §2.1-§2.4),
 * the rest from `docs/source-journey.md`. Where the source is thin (Days 3 and 4
 * are mostly activity lists rather than teachable facts) the questions test the
 * framing the doc *does* state. See the TODO notes on those quizzes.
 */

export const PASS_THRESHOLD = 0.7;

const day1: Quiz = {
  slug: "day1",
  title: "Day 1 · Welcome",
  dayId: 1,
  // Built from the manual, §1.1-§1.4 plus the red lines in §5. `d1.q1`-`d1.q5`
  // were retired rather than reworded - the ids are persisted in
  // `quiz_response.question_id` and old responses must not be re-scored against
  // different text.
  questions: [
    {
      id: "d1.q6",
      prompt:
        'A customer with a Schengen trip six weeks out keeps circling back to "but will it be fine?". What are you actually there to do?',
      options: [
        {
          id: "a",
          label:
            "Make the visa the predictable part of the trip: a committed date, a published policy, a route that can be filed",
        },
        {
          id: "b",
          label:
            "Tell them the profile looks strong, then move to payment while they are still confident",
        },
        {
          id: "c",
          label:
            "Answer the factual questions accurately and leave them to decide how worried to be",
        },
        {
          id: "d",
          label:
            "Get the application filed quickly, because the waiting is what makes people anxious",
        },
      ],
    },
    {
      id: "d1.q7",
      prompt:
        "Two agents convert the same number of customers this month. One's list is mostly destinations that are visa-free or near-free on an Indian passport; the other's is mostly Schengen, US and Canada. How should you read that?",
      options: [
        {
          id: "a",
          label:
            "The second agent produced almost all the revenue. What you sell matters more than how much",
        },
        {
          id: "b",
          label:
            "They performed the same. Conversions are the number the role is measured on, whatever the destination",
        },
        {
          id: "c",
          label:
            "The first agent is ahead on volume, which is the honest read on effort and pipeline health",
        },
        {
          id: "d",
          label:
            "It is a difference in fee size, and we are told never to grade customers by fee",
        },
      ],
    },
    {
      id: "d1.q8",
      prompt:
        "A customer wants a UK visa in five weeks. Which question do most agents forget to ask?",
      options: [
        {
          id: "a",
          label: "Whether they have ever been refused a visa, anywhere",
        },
        {
          id: "b",
          label: "Whether they have applied for this destination before",
        },
        {
          id: "c",
          label: "Whether anyone else is travelling on the same dates",
        },
        {
          id: "d",
          label: "Whether they have compared our price with a local agent's",
        },
      ],
    },
    {
      id: "d1.q9",
      prompt:
        "A customer is furious by the time their case is with ops. Where was the damage almost certainly done?",
      options: [
        {
          id: "a",
          label:
            "Pre-checkout, in writing: a timeline, a refund figure or a route that could not be delivered",
        },
        {
          id: "b",
          label:
            "At the handover, when ops picked up a file with a gap nobody had flagged",
        },
        {
          id: "c",
          label:
            "In ops, when the committed date slipped and nobody told the customer",
        },
        {
          id: "d",
          label:
            "At the consulate, when the decision went against a file that looked strong",
        },
      ],
    },
    {
      id: "d1.q10",
      prompt:
        'Payment has landed and the file is with ops. The customer messages you: "Should I add my wife to this application or file separately?" Whose question is it?',
      options: [
        {
          id: "a",
          label:
            "Yours. It is a whether-and-what question, and payment landing does not transfer it",
        },
        {
          id: "b",
          label:
            "Ops'. The case is live now, and one owner per live case is the point of the split",
        },
        {
          id: "c",
          label:
            "Yours to acknowledge, then pass to ops with the context so they can answer it",
        },
        {
          id: "d",
          label:
            "Whoever gets to it first. After checkout the pre/post split stops mattering",
        },
      ],
    },
    {
      id: "d1.q11",
      prompt:
        'A customer\'s bank balance is thin and they ask whether the statement could be "adjusted" before submission. What do you do?',
      options: [
        {
          id: "a",
          label:
            "Exit and flag it. A request to fabricate a document is not a negotiation",
        },
        {
          id: "b",
          label:
            "Refuse the edit, then ask what else exists in their name and carry on with the file",
        },
        {
          id: "c",
          label:
            "Explain the risk of a mismatch and leave the decision with them. It is their document",
        },
        {
          id: "d",
          label:
            "File what they send, noting that the statement was supplied by the customer",
        },
      ],
    },
    {
      id: "d1.q12",
      prompt:
        "A customer wants to file for a destination where their timeline genuinely does not work. They are willing to pay today. What is the correct move?",
      options: [
        {
          id: "a",
          label:
            "Disqualify openly. Selling to the unqualified is negative margin once refunds and reviews are counted",
        },
        {
          id: "b",
          label:
            "Take the payment but write the risk clearly into the chat, so the record shows they were warned",
        },
        {
          id: "c",
          label:
            "Take it. They are an adult who has been told the risk, and refusing the money is not your call",
        },
        {
          id: "d",
          label:
            "Take it and ask Ops to prioritise the case so the timeline has a chance of holding",
        },
      ],
    },
    {
      id: "d1.q13",
      prompt:
        "Your month shows strong gross conversions. Why is that not automatically evidence you did well?",
      options: [
        {
          id: "a",
          label:
            "Campaigns run treatment against control, so what counts is the lift you created, not conversions that would have happened anyway",
        },
        {
          id: "b",
          label:
            "Gross conversions are only counted once the customer travels",
        },
        {
          id: "c",
          label:
            "Conversions are shared across the team rather than attributed individually",
        },
        {
          id: "d",
          label:
            "Volume matters less than the fee size of each application sold",
        },
      ],
    },
    {
      id: "d1.q14",
      prompt:
        "A guest picks up your outbound call. What are the first words out of your mouth?",
      options: [
        {
          id: "a",
          label:
            "“Good morning / afternoon / evening, this is [Name] from Atlys Guest Delight, how may I help you with your visa request today?”",
        },
        {
          id: "b",
          label:
            "“Hi, am I speaking with [Name]? I'm calling from Atlys about your visa enquiry.”",
        },
        {
          id: "c",
          label: "“Hello! This is [Name] from Atlys. Is now a good time?”",
        },
        {
          id: "d",
          label:
            "Whatever matches the guest's tone, since a scripted opening sounds robotic",
        },
      ],
    },
    {
      id: "d1.q15",
      prompt:
        "A guest asks something you cannot resolve without another team. Which reply meets the standard?",
      options: [
        {
          id: "a",
          label: "“I'm raising this with Ops now and I will update you by 4 PM today.”",
        },
        {
          id: "b",
          label: "“Let me check with someone and we'll get back to you.”",
        },
        {
          id: "c",
          label: "“That's not my department, but someone will call you.”",
        },
        { id: "d", label: "“I'll try my best to sort this out for you today.”" },
      ],
    },
    {
      id: "d4.q1",
      prompt: "Which team owns visa processing, timelines and exceptions?",
      options: [
        { id: "a", label: "Ops" },
        { id: "b", label: "Product" },
        { id: "c", label: "Growth/Design" },
        { id: "d", label: "Pre-checkout Sales" },
      ],
    },
    {
      id: "d4.q2",
      prompt:
        "You have found what looks like a bug in the checkout flow. Who do you take it to?",
      options: [
        { id: "a", label: "Product" },
        { id: "b", label: "Ops" },
        { id: "c", label: "The customer's own bank" },
        { id: "d", label: "Nobody. Work around it in the chat" },
      ],
    },
    {
      id: "d4.q4",
      prompt: "Why does the day ask you to draw your own flowchart?",
      options: [
        {
          id: "a",
          label:
            "So you know where a conversation goes next and who owns the decision, without asking",
        },
        { id: "b", label: "So it can be added to the team's documentation" },
        { id: "c", label: "So your mentor can grade your process knowledge" },
        { id: "d", label: "So Product can redesign the dashboard around it" },
      ],
    },
    {
      id: "d4.q7",
      prompt:
        "Why is comp blended across conversion, downstream quality and QA rather than paid on conversion alone?",
      options: [
        {
          id: "a",
          label:
            "So honesty is the winning strategy for you personally, not only the safe one for the company",
        },
        {
          id: "b",
          label:
            "Because conversion is too hard to attribute to an individual advisor",
        },
        {
          id: "c",
          label:
            "To keep payouts predictable month to month across the team",
        },
        {
          id: "d",
          label:
            "Because QA scores are the metric managers can measure most easily",
        },
      ],
    },
  ],
};

const day2: Quiz = {
  slug: "day2",
  title: "Day 2 · Product & Customer Basics",
  dayId: 2,
  questions: [
    {
      id: "d2.q1",
      prompt: 'What is the "Shut up for 10 seconds" rule actually for?',
      options: [
        {
          id: "a",
          label:
            "The guest fills the silence and tells you the real fear behind their question",
        },
        { id: "b", label: "It gives you time to look up the right answer" },
        { id: "c", label: "It makes you sound more senior and considered" },
        {
          id: "d",
          label: "It keeps your average handling time within the target",
        },
      ],
    },
    {
      id: "d2.q2",
      prompt:
        'A guest asks "Is approval guaranteed?" and you reply immediately. What has gone wrong?',
      options: [
        {
          id: "a",
          label:
            "You answered the question but missed the fear. You are now solving the wrong problem",
        },
        { id: "b", label: "Nothing, as long as the answer is accurate" },
        { id: "c", label: "You broke the response-time SLA" },
        {
          id: "d",
          label: "You should have escalated the question to Ops first",
        },
      ],
    },
    {
      id: "d2.q3",
      prompt:
        "Which of these does the doc list as something silence gets you for free?",
      options: [
        {
          id: "a",
          label:
            "Intel: budget concerns, timeline pressure, past bad experiences, competitor comparisons",
        },
        { id: "b", label: "A higher conversion rate on the first message" },
        { id: "c", label: "Permission to quote a discount" },
        { id: "d", label: "A shorter conversation" },
      ],
    },
    {
      id: "d2.q4",
      prompt: "Which of these is a Don't?",
      options: [
        { id: "a", label: "Guessing whether a visa will be approved" },
        { id: "b", label: "Asking clarifying questions before you answer" },
        { id: "c", label: "Acknowledging the concern first" },
        { id: "d", label: "Being clear about timelines and next steps" },
      ],
    },
    {
      id: "d2.q5",
      prompt:
        "You have a saved reply that roughly fits the question a guest just asked. What do you do?",
      options: [
        {
          id: "a",
          label:
            "Do not send it as-is. A template sent without context proves nobody read them",
        },
        { id: "b", label: "Send it, then follow up if they push back" },
        { id: "c", label: "Send it. Consistency of wording is the point" },
        { id: "d", label: "Send it and add an apology in case it misses" },
      ],
    },
    {
      id: "d2.q6",
      prompt:
        "Ops has told a guest one thing and you believe a different answer is correct. What do you do?",
      options: [
        {
          id: "a",
          label:
            "Do not contradict Ops. Resolve it with Ops before you reply to the guest",
        },
        {
          id: "b",
          label: "Give the guest your answer, since you spoke to them last",
        },
        { id: "c", label: "Give the guest both answers and let them choose" },
        { id: "d", label: "Stop replying and hand the chat to someone else" },
      ],
    },
    {
      id: "d2.q7",
      prompt: "What tone are you aiming for?",
      options: [
        { id: "a", label: "Friendly, calm, confident" },
        { id: "b", label: "Formal and precise" },
        { id: "c", label: "Urgent and high-energy" },
        { id: "d", label: "Apologetic and accommodating" },
      ],
    },
    {
      id: "d2.q8",
      prompt: "How should you reassure a nervous guest?",
      options: [
        { id: "a", label: "With facts" },
        { id: "b", label: "With your best estimate of the likely outcome" },
        { id: "c", label: "With reassuring language, whatever the facts are" },
        { id: "d", label: "By moving the conversation to the price instead" },
      ],
    },
    // From the manual: the three moves (§2.2), triage (§2.3), the refund reframe.
    {
      id: "d2.q9",
      prompt:
        "You are the third agent a customer has spoken to this week. All of them answered his questions well. What is the strongest thing you can do differently?",
      options: [
        {
          id: "a",
          label:
            "Change what he thinks the problem is, rather than answering the same questions better",
        },
        {
          id: "b",
          label:
            "Answer them more thoroughly and more warmly, so he would rather deal with you",
        },
        {
          id: "c",
          label:
            "Build the relationship first and let the price conversation come once he trusts you",
        },
        {
          id: "d",
          label:
            "Match the best offer he has been given so price stops being a reason to keep shopping",
        },
      ],
    },
    {
      id: "d2.q10",
      prompt:
        "Every customer who reaches us is a P0. Four are waiting and you can only work one. How do you choose?",
      options: [
        {
          id: "a",
          label:
            "By consequence of delay, and the other three get a time from you, not silence",
        },
        {
          id: "b",
          label:
            "In the order they arrived. Anything else is grading people, which P0 forbids",
        },
        {
          id: "c",
          label:
            "By what each case is worth, since revenue is the honest tie-breaker",
        },
        {
          id: "d",
          label:
            "By who sounds most distressed, since they are in the worst state right now",
        },
      ],
    },
    {
      id: "d2.q11",
      prompt:
        "A customer travelling in seven weeks says our refund policy is what makes it safe to book with us. What do you teach him?",
      options: [
        {
          id: "a",
          label:
            "A refund protects the fee; only time protects the trip, which is why seven weeks is the asset here",
        },
        {
          id: "b",
          label:
            "That the cover is stronger than he thinks, once you walk him through it for his route",
        },
        {
          id: "c",
          label:
            "That the refund is secondary, because a coherent file is what actually decides the outcome",
        },
        {
          id: "d",
          label:
            "Nothing. He has read the product correctly, so confirm it and move on to documents",
        },
      ],
    },
    {
      id: "d5.q1",
      prompt:
        'A guest says "you can\'t guarantee approval, so what am I paying for?" What is really going on?',
      options: [
        {
          id: "a",
          label:
            "They are pricing the outcome. You cannot sell the outcome, so move them to pricing the avoidable failure",
        },
        { id: "b", label: "They want a discount and are opening the bargaining" },
        { id: "c", label: "They have already decided not to buy" },
        { id: "d", label: "They do not understand what the embassy fee is" },
      ],
    },
    {
      id: "d5.q2",
      prompt:
        'A guest says their local agent charges half. Why should you not attack the agent?',
      options: [
        {
          id: "a",
          label:
            "They often know him personally. Attacking him makes his word more credible, not less",
        },
        { id: "b", label: "It is against company policy to name competitors" },
        { id: "c", label: "The agent may later become a channel partner" },
        { id: "d", label: "You cannot verify what he charges" },
      ],
    },
    {
      id: "d5.q3",
      prompt:
        "What is the most useful question to ask about a competing quote?",
      options: [
        {
          id: "a",
          label: "Whether the quoted amount includes the government fee",
        },
        { id: "b", label: "How long the agent has been in business" },
        { id: "c", label: "Whether the agent has an office you can visit" },
        { id: "d", label: "Whether the agent will match our price" },
      ],
    },
    {
      id: "d5.q4",
      prompt: "How should you handle the Atlys fee when it is questioned?",
      options: [
        {
          id: "a",
          label:
            "State plainly what it buys. Never apologise for it or soften it",
        },
        { id: "b", label: "Acknowledge it is high and offer to check for a discount" },
        { id: "c", label: "Describe it as a nominal convenience charge" },
        { id: "d", label: "Redirect to the refund policy instead" },
      ],
    },
    {
      id: "d5.q5",
      prompt:
        'A guest says "if I\'m rejected I lose the whole trip, not just the fee." What is the right opening move?',
      options: [
        {
          id: "a",
          label:
            "Agree with them (do not pretend a fee refund covers a trip), then name what actually protects it",
        },
        { id: "b", label: "Lead with the refund policy on eligible routes" },
        { id: "c", label: "Reassure them that rejections are rare" },
        { id: "d", label: "Suggest they book refundable flights and move on" },
      ],
    },
    {
      id: "d5.q6",
      prompt:
        'A guest says they will just apply themselves on the VFS portal. What is the strongest response?',
      options: [
        {
          id: "a",
          label:
            "Name the two things self-service cannot do (an earlier slot than the portal shows, and an outside reader on their file), then ask how far out their travel is",
        },
        { id: "b", label: "Explain that the portal is difficult to use correctly" },
        { id: "c", label: "Point out that mistakes on the portal cannot be undone" },
        { id: "d", label: "Offer a discount so the price gap closes" },
      ],
    },
    {
      id: "d5.q7",
      prompt: "In the APAC framework, what is the Probe step for?",
      options: [
        {
          id: "a",
          label:
            "Finding the real concern underneath the stated objection, before you answer it",
        },
        { id: "b", label: "Testing whether the guest is a serious buyer" },
        {
          id: "c",
          label: "Collecting the qualification fields you did not get earlier",
        },
        { id: "d", label: "Buying time while you look up the right answer" },
      ],
    },
  ],
};

const day3: Quiz = {
  slug: "day3",
  title: "Day 3 · Visa Deep Dive",
  dayId: 3,
  // Day 3 is the US B1/B2 route, confirmed by the manager (Aug 2026).
  // `d3.q1`-`d3.q5` test process framing only, which is all the journey doc
  // supports. `d3.q6`-`d3.q8` come from the manager's answers: the AtlysProtect
  // refund scope, Rejection Recovery, and committed timelines.
  // `d3.q9` comes from Sameer's answer on the document list (§2.5); `d3.q10` and
  // `d3.q11` from Snehasish's on the DS-160 and the interview (§2.4, §2.15).
  // TODO(content): appointment booking logic (§2.6) is the last B1/B2 fact this
  // quiz cannot test.
  questions: [
    {
      id: "d3.q1",
      prompt: "Who decides whether a visa is approved?",
      options: [
        { id: "a", label: "The consular officer reviewing the application" },
        { id: "b", label: "Atlys, based on the strength of the file" },
        { id: "c", label: "The appointment centre (VFS) at the interview" },
        { id: "d", label: "An automated eligibility check on the portal" },
      ],
    },
    {
      id: "d3.q2",
      prompt: "What is Atlys's role in the process?",
      options: [
        {
          id: "a",
          label:
            "Getting the file right and the appointment booked, not influencing the decision",
        },
        { id: "b", label: "Advocating for the applicant with the embassy" },
        { id: "c", label: "Guaranteeing the outcome for eligible applicants" },
        { id: "d", label: "Issuing the visa once documents are verified" },
      ],
    },
    {
      id: "d3.q3",
      prompt:
        'The doc says most refusals "aren\'t about the person, they\'re about the file." What does that imply for your job?',
      options: [
        {
          id: "a",
          label:
            "The avoidable failure (gaps in the file) is the thing you can actually sell against",
        },
        {
          id: "b",
          label: "You can tell strong applicants that they will be approved",
        },
        {
          id: "c",
          label: "Refusals are the applicant's fault and not worth discussing",
        },
        {
          id: "d",
          label: "File quality matters less than which appointment slot you get",
        },
      ],
    },
    {
      id: "d3.q5",
      prompt:
        "A guest asks you how long the appointment queue is for their city. What is the correct instinct?",
      options: [
        {
          id: "a",
          label:
            "Tell them what the slots actually show today, and be explicit that the queue is not something we control",
        },
        { id: "b", label: "Give the average from the last few applications" },
        { id: "c", label: "Say it is usually fine at this time of year" },
        { id: "d", label: "Avoid the question and move to the documents" },
      ],
    },
    {
      id: "d3.q6",
      prompt:
        "A guest on a route covered by AtlysProtect asks, on WhatsApp, exactly what they get back if the visa is refused. What do you put in writing?",
      options: [
        {
          id: "a",
          label:
            "The service fee comes back and the government fee does not, once you have confirmed this route is under AtlysProtect",
        },
        {
          id: "b",
          label:
            "The total they paid, including the government fee, since a refusal means they got nothing for it",
        },
        {
          id: "c",
          label:
            "The government fee, because the service fee has already paid for work we did",
        },
        {
          id: "d",
          label:
            "The service fee on any route, because the cover is standard on everything we file",
        },
      ],
    },
    {
      id: "d3.q7",
      prompt:
        "A guest was refused a US visa last year through another agent, paid for it, and is frightened of spending money again. What do you lead with?",
      options: [
        {
          id: "a",
          label:
            "We decode why it was refused, build a personalised recovery plan and reapply for them, and they pay only when they are approved",
        },
        {
          id: "b",
          label:
            "That a previous refusal does not block a new application, so there is nothing to worry about this time",
        },
        {
          id: "c",
          label:
            "That the old refusal reason matters less than making the new file stronger than the last one",
        },
        {
          id: "d",
          label:
            "That they can reapply straight away, since a refusal carries no waiting period",
        },
      ],
    },
    {
      id: "d3.q8",
      prompt:
        "A guest asks how long their visa will take. The country page gives a number and they were hoping for better. What do you commit to?",
      options: [
        {
          id: "a",
          label:
            "The number on the country page, and a genuine special case gets revised with Ops rather than by you",
        },
        {
          id: "b",
          label:
            "A slightly longer number than the page, so there is a buffer if the consulate is slow",
        },
        {
          id: "c",
          label:
            "What the last few applications on this route actually took, since that is closer to reality",
        },
        {
          id: "d",
          label:
            "No number until the appointment is booked, because the queue is not ours to control",
        },
      ],
    },
    {
      id: "d3.q9",
      prompt:
        "A guest starting a US B1/B2 asks which documents they need to send you. What is the correct answer?",
      options: [
        {
          id: "a",
          label:
            "None. The only thing they have to fill is the DS-160, and it is worth checking whether they already have",
        },
        {
          id: "b",
          label:
            "The standard set (passport scan, bank statement, ITR and photographs), and you send the checklist over",
        },
        {
          id: "c",
          label:
            "A bank statement strong enough to show they can fund the trip, since that is what refusals turn on",
        },
        {
          id: "d",
          label:
            "Nothing yet. The list depends on the consulate and comes through once the appointment is booked",
        },
      ],
    },
    {
      id: "d3.q10",
      prompt:
        "A guest asks what you actually do on the DS-160 that they could not do themselves. What is the honest answer?",
      options: [
        {
          id: "a",
          label:
            "Guide them through it, prefill what we can, and review every section against their passport and supporting documents before submission",
        },
        {
          id: "b",
          label:
            "File it on their behalf, so they never have to look at the form at all",
        },
        {
          id: "c",
          label:
            "Have it checked by our contact at the consulate before it is submitted",
        },
        {
          id: "d",
          label:
            "Nothing beyond submitting it. The form is the applicant's own responsibility",
        },
      ],
    },
    {
      id: "d3.q11",
      prompt:
        "A nervous guest asks what actually happens at the US interview. What do you tell them?",
      options: [
        {
          id: "a",
          label:
            "Almost everyone aged 14 to 79 attends in person; the officer asks about purpose, duration, funding, ties to India and travel history, and the answers must match the DS-160",
        },
        {
          id: "b",
          label:
            "It is a formality. Most applicants are through in two minutes and it rarely changes anything",
        },
        {
          id: "c",
          label:
            "We will prepare their answers together beforehand so the account comes out consistent and convincing",
        },
        {
          id: "d",
          label:
            "They should carry every document they own, because the officer works through the whole file",
        },
      ],
    },
    {
      id: "d3.q12",
      prompt:
        "A guest is travelling to France for five nights and Spain for three. Which embassy do they apply to?",
      options: [
        {
          id: "a",
          label: "France, because that is where they spend the most nights",
        },
        {
          id: "b",
          label: "Whichever of the two has appointment slots available soonest",
        },
        {
          id: "c",
          label: "The first country they enter, so it depends on the flight route",
        },
        {
          id: "d",
          label:
            "Either, since a Schengen visa is valid across the whole zone regardless of issuer",
        },
      ],
    },
    {
      id: "d3.q13",
      prompt: "What must a Schengen applicant's travel insurance cover?",
      options: [
        {
          id: "a",
          label:
            "At least €30,000, valid across the entire Schengen area for the full duration of the trip",
        },
        {
          id: "b",
          label: "At least €30,000, valid in the country whose embassy they applied to",
        },
        {
          id: "c",
          label: "There is no minimum; any policy naming the destination is accepted",
        },
        {
          id: "d",
          label: "At least €10,000, provided medical evacuation is included",
        },
      ],
    },
    {
      id: "d3.q15",
      prompt:
        "A guest with a 10-year US visa asks how long they are allowed to stay. What is the correct answer?",
      options: [
        {
          id: "a",
          label:
            "The visa lets them travel for 10 years; each entry is typically up to six months and the CBP officer at the port decides",
        },
        { id: "b", label: "Ten years of continuous stay" },
        { id: "c", label: "Six months in total, spread across the ten years" },
        { id: "d", label: "As long as the travel dates they entered on the DS-160" },
      ],
    },
    {
      id: "d3.q16",
      prompt:
        "A guest's US application has gone into 221(g) administrative processing. What do you tell them it means?",
      options: [
        {
          id: "a",
          label:
            "It is not a refusal: additional processing after the interview, which needs careful follow-up",
        },
        { id: "b", label: "A refusal they can appeal within 30 days" },
        { id: "c", label: "A request to complete the DS-160 again from scratch" },
        { id: "d", label: "A 12-month bar on reapplying" },
      ],
    },
    {
      id: "d3.q17",
      prompt:
        "A guest needs a UK standard visitor visa and travels in eight days. What do you say?",
      options: [
        {
          id: "a",
          label:
            "Super priority is next working day and priority is five, but check the biometrics appointment before committing to either",
        },
        {
          id: "b",
          label:
            "Standard processing is three weeks, so they should postpone the trip",
        },
        {
          id: "c",
          label: "Priority at five working days will definitely make it in time",
        },
        {
          id: "d",
          label: "Apply on standard and request an upgrade later if it looks tight",
        },
      ],
    },
    {
      id: "d3.q19",
      prompt:
        "What decides whether a guest needs an eTA or a Temporary Resident Visa for Canada?",
      options: [
        {
          id: "a",
          label:
            "Nationality: citizens of visa-exempt countries need an eTA, everyone else needs a TRV",
        },
        { id: "b", label: "Trip length, with under six months qualifying for an eTA" },
        {
          id: "c",
          label: "Purpose of travel, with tourism on an eTA and business on a TRV",
        },
        { id: "d", label: "Whether they have visited Canada before" },
      ],
    },
    {
      id: "d3.q20",
      prompt:
        "A guest holds an Egypt eVisa and plans to spend part of the trip in Sinai. What do you flag?",
      options: [
        {
          id: "a",
          label: "Sinai needs a separate permit; the eVisa does not cover it",
        },
        { id: "b", label: "Nothing, because the eVisa covers all of Egypt" },
        { id: "c", label: "They will need the multiple-entry version of the eVisa" },
        { id: "d", label: "Sinai requires a visa on arrival instead of an eVisa" },
      ],
    },
    {
      id: "d3.q21",
      prompt: "A guest wants to spend 45 days in Thailand. What do you recommend?",
      options: [
        {
          id: "a",
          label:
            "The eVisa, which covers up to 60 days, because the 30-day exemption does not cover the trip and overstay penalties are severe",
        },
        {
          id: "b",
          label: "Travel on the 30-day exemption and extend locally once there",
        },
        {
          id: "c",
          label: "The 30-day exemption, with a short trip out of the country and back",
        },
        { id: "d", label: "A visa on arrival, which allows 45 days" },
      ],
    },
    {
      id: "d4.q3",
      prompt: "What makes a lead hot rather than cold?",
      options: [
        { id: "a", label: "Intent and urgency" },
        { id: "b", label: "The size of the order" },
        { id: "c", label: "How many messages they have sent" },
        { id: "d", label: "Whether they arrived by chat or by call" },
      ],
    },
    {
      id: "d4.q5",
      prompt:
        "A conversation needs to pass to someone else mid-way. What matters most?",
      options: [
        {
          id: "a",
          label:
            "A clean handover. The next person has the context and the guest is not asked to repeat themselves",
        },
        { id: "b", label: "Closing the chat quickly to protect your metrics" },
        { id: "c", label: "Making sure the guest knows it was not your fault" },
        { id: "d", label: "Waiting until the guest asks to speak to someone else" },
      ],
    },
    {
      id: "d4.q6",
      prompt:
        "A consult ends without payment. The guest is interested but wants to think. What happens next?",
      options: [
        {
          id: "a",
          label:
            "A structured WhatsApp follow-up within two minutes, then a defined three-touch cadence",
        },
        {
          id: "b",
          label:
            "Leave them room to decide and check back in a few days so it does not feel like pressure",
        },
        {
          id: "c",
          label:
            "Mark the lead cold and move to the next one. They did not close on the call",
        },
        {
          id: "d",
          label:
            "Send the pricing page again so they have everything in writing to compare",
        },
      ],
    },
    {
      id: "d5.q8",
      prompt:
        "A guest calls from the airport. They have been denied check-in over a visa problem. What do you do?",
      options: [
        {
          id: "a",
          label:
            "Escalate to the Emergency Helpline immediately, stay on the line until handover is confirmed, and never hold them longer than 60 seconds",
        },
        {
          id: "b",
          label:
            "Put them on hold, check the case in Cadence, then advise them directly",
        },
        {
          id: "c",
          label: "Take the details and commit to calling back within two hours",
        },
        {
          id: "d",
          label: "Refer them to the airline, since check-in is the airline's decision",
        },
      ],
    },
  ],
};



export const QUIZZES: readonly Quiz[] = [day1, day2, day3];

export function getQuizBySlug(slug: QuizSlug): Quiz | undefined {
  return QUIZZES.find((quiz) => quiz.slug === slug);
}
