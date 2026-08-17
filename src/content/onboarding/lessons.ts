import type { DayId, ItemKey } from "./types";

/**
 * Teaching content, one lesson per "What to learn" topic.
 *
 * `body === null` means the content does not exist yet - it is being written by
 * Shovan (the `ref` field is the question number in docs/shovan-questions.md).
 * The UI renders an honest placeholder for those instead of invented filler:
 * a wrong visa fact taught here gets repeated to a paying guest.
 *
 * Where `body` is filled, every sentence is traceable to a source and `ref`
 * names it: `"Manual §1.1"` is the hiring manager's onboarding manual (Days 1
 * and 2), a bare `"§5.1"` is docs/source-journey.md. `"Manager, Aug 2026"` is a
 * direct answer from the hiring manager, recorded against the numbered question
 * in docs/shovan-questions.md. Filling in a lesson is a paste-in edit to this
 * file, nothing else.
 *
 * `itemKey` is persisted in progress rows when a joinee finishes reading -
 * never rename one in place.
 */
export interface Lesson {
  itemKey: ItemKey;
  dayId: DayId;
  /** Where the content comes from - a manual section, or the pending question. */
  ref: string;
  title: string;
  /** Paragraphs. `null` = pending from Shovan; UI shows a placeholder. */
  body: string[] | null;
  /**
   * Pending lessons only: who the missing answer sits with. Written so the
   * placeholder names a person to chase rather than just a question number -
   * an unowned gap is the one that never closes.
   */
  pendingWith?: string;
  /** A real, sanitised situation where this mattered. */
  example?: string;
  /** What new joiners get wrong - becomes the tempting quiz distractor. */
  commonMistake?: string;
}

/**
 * All four Day 4 collaboration topics came back as "read the Notion doc" - a
 * source rather than an answer, and the link has not arrived. Recorded once so
 * the four placeholders say the same thing, and so it is obvious that Day 4 is
 * blocked on one document rather than four separate gaps.
 */
const DAY4_NOTION_DOC =
  "Shovan pointed this at an internal Notion doc rather than answering it, and the link has not arrived. Nobody is named on it, so ask your Day 4 mentor for the doc first. The same one document unblocks all four of these lessons.";

export const LESSONS: readonly Lesson[] = [
  /* ---------------------------------- Day 1 --------------------------------- */
  {
    itemKey: "lesson.day1.why_we_exist",
    dayId: 1,
    ref: "Manual §1.1",
    title: "Why we exist",
    body: [
      "For most people the visa is the part of the trip that can actually go wrong. A flight can be rebooked and a hotel changed; the visa is a decision made by a stranger in a consulate, using rules the traveller has never read.",
      "The confusion is not accidental. The process has historically been kept deliberately confusing, and traditional agents make money from that confusion: they charge upfront and get paid whether or not you are approved. Roughly one in seven Indian Schengen applicants is refused, and visa denials cost Indian travellers an estimated Rs 662 crore in 2024.",
      "Atlys exists to make the visa the predictable part of the trip. Predictable: we commit to a delivery date and are accountable to it. Miss it and the customer is compensated and still gets the visa. Transparent: a published refund policy, a status page, a fee-change log, and a Faultlines page listing the deliveries we missed by name and by how long. Competent: 500,000+ visas across 150+ destinations, 99.5% on-time.",
      "The line to carry into every conversation: customers do not come to buy a visa, they come to stop being afraid of one.",
    ],
    example:
      "No competitor publishes a Faultlines page. Naming our own missed deliveries, and by how long, is accountability a customer can check rather than reassurance they have to believe.",
    commonMistake:
      "Treating it as order processing, and reaching for false reassurance, which only moves the fear further down the line.",
  },
  {
    itemKey: "lesson.day1.what_is_precheckout",
    dayId: 1,
    ref: "Manual §1.2 + Aug 2026",
    title: "What Pre-checkout Sales is",
    body: [
      "Start with what it is not, because the name misleads. This is not a persuasion function. It is an incremental conversion function: turning high-intent drop-offs into paid applications, without overpromising to get there.",
      "The word doing the work is incremental. Campaigns run treatment against control, so what gets reported is the lift you created, not the total that happened to close. A customer who was going to buy anyway is not a sale you made. That is worth knowing on day one, because it quietly rules out the whole category of tactics that look like performance and produce none: pressure, urgency you invented, a discount nobody asked for.",
      "You are the first human the customer speaks to, and usually the only one they will remember.",
      "The job itself is three at once. Diagnosis: which visa category, which consulate, are they even eligible, is the timeline real. Customers are often wrong about all four. Advice: tell them the truth, including when it is inconvenient, and get the file into a state that survives a consular officer. Closing: take payment only on an application that can genuinely be delivered.",
      "One sentence: you own the customer from first message to first payment with a filing-ready document set, and you stay their named person for a fixed period after.",
      "What it is not: a script-reader, order-taking, or post-sale support.",
    ],
    commonMistake:
      "Thinking the job is answering questions, when it is deciding what is true. The version of this that shows up in numbers is counting gross conversions as your own work, including the ones that needed nothing from you.",
  },
  {
    itemKey: "lesson.day1.revenue_and_trust",
    dayId: 1,
    ref: "Manual §1.3",
    title: "How this role impacts revenue and trust",
    body: [
      "What you sell matters more than how much. Roughly one in five conversions are destinations that are visa-free or near-free for an Indian passport; together they produce almost none of the revenue while consuming real agent hours.",
      "The hard countries (US, UK, Schengen, Canada, Japan, Korea, China) are where the value is, and where customers most need a competent human. Rejection recovery is the highest-value work per case by a wide margin on a fraction of the volume, which is why you ask every hard-country customer whether they have ever been refused, anywhere. Most agents forget.",
      "Leads never contacted are the single biggest source of lost revenue, larger than every objection combined.",
      "On trust: almost every angry Atlys customer was made angry pre-checkout. Promised a timeline that could not be met, told a refund covered more than it does, allowed to believe approval was assured, or sold a route that could not be filed. Each one is created by an agent, in writing, before a document reaches ops.",
      "The framing: you are the last point where a customer can be saved from a bad decision, and the first point where we can inflict one.",
      "Two numbers hold that in place, and they are held together: revenue per contacted lead, and the downstream quality of what you sold (refund rate and rejection rate, attributable to you). Optimise only the first and you break the second. That is not a warning about the company's interests, it is arithmetic: a sale that refunds is worse than a sale you never made, because it costs the fee, the hours, and a review.",
      "Which is why comp is blended across conversion, downstream quality and QA score, and why promise violations are counted per 100 calls. The ten red lines are not an ethics lecture with a scoreboard bolted on afterwards. They are the scoreboard. Honesty is the strategy that wins for you, not just the one that keeps the company safe, and that distinction matters most in the month you are behind on target.",
    ],
    example:
      "Because of the on-time guarantee, a timeline promised in writing that ops cannot meet costs the company the entire fee and still produces a detractor.",
    commonMistake:
      "Assuming impact means more sales. The specific version to watch for is a good month on conversion that shows up sixty days later as refunds. You were paid on the first number and judged on both.",
  },
  {
    itemKey: "lesson.day1.pre_vs_post",
    dayId: 1,
    ref: "Manual §1.4",
    title: "Pre-checkout vs Post-checkout support",
    body: [
      "Pre-checkout decides what is right and gets the file ready. You work in uncertainty with no application yet, the main skill is diagnosis and honest persuasion, and you talk about what is possible and what it will take. You win by selling only what can be delivered, and fail by over-promising.",
      "Post-checkout (ops, PRO, CX) executes and delivers. They work a live case with a committed date, the main skill is processing accuracy and embassy coordination, and they talk about where the application is now. They win by delivering what was sold, and fail by slipping the date.",
      "The seam is the handover, and it is where things break: an incomplete file, or a file handed to nobody in particular, and the customer discovers the gap days later.",
      "The test: if it is about whether and what, it is yours. If it is about where it is and when, it is theirs.",
    ],
    commonMistake: "Disappearing at the seam once payment lands.",
  },

  /* ---------------------------------- Day 2 --------------------------------- */
  {
    itemKey: "lesson.day2.guests",
    dayId: 2,
    ref: "Manual §2.3, §2.1",
    title: "Who our guests are: persona, geography, intent",
    body: [
      "Every customer who reaches us is a P0. We do not grade people by fee size, destination, or how politely they wrote, and the quality of attention is identical whether the case is worth Rs 3,000 or Rs 40,000: same honesty, same preparation, same competence.",
      "Empathy is never rationed. Sequence always is. In an emergency room every patient matters equally, which is precisely why triage exists. Nobody honours “all patients are priority” by seeing them in arrival order. Order is set by consequence of delay: not fee, and not who complained loudest.",
      "Nobody waits in silence, though. If you cannot deal with someone now they get a time, not nothing. The unanswered message is the empathy failure; the wait is not.",
      "Past that, treat the customer like your date: a checklist, not a slogan. Read the case before you dial, and never open with “tell me your situation” when it is sitting in the thread. Five minutes means five minutes. Bring the plan, the checklist and the next step instead of making them do the work.",
      "Remember the name, the dates, that it is an anniversary trip; nobody should have to tell you anything twice. One conversation at a time. You do not hand your date to a colleague between courses (that is the single-POC rule in one image), and you do not vanish afterwards, because going quiet once payment lands is the same as not calling back.",
      "The point of a good date was never the evening. It is whether they want to see you again, which is exactly what NPS measures. Warm and attentive, never familiar.",
    ],
    example:
      "The most empathetic sentence in this job is usually the hardest one: “Three weeks is not enough. I am not going to take your money pretending otherwise.”",
    commonMistake:
      "Mistaking warmth for empathy. Warmth costs nothing; empathy is caring enough to say the thing they do not want to hear, and the urge to impress is what makes you promise a timeline or soften a clear no.",
  },
  {
    itemKey: "lesson.day2.why_reach_out",
    dayId: 2,
    ref: "Manual §2.2",
    title: "Common reasons guests reach out before checkout",
    body: [
      "Nearly everything that arrives before checkout is one of six openers: is approval guaranteed, how many days will it take, my visa got rejected last month, why is your price higher than the agent near my house, can I get a visa without a bank statement, and I have already booked tickets for the 20th.",
      "None of them is the real question. Underneath sit a trip already paid for, a travel date they suspect they have left too late, a refusal they believe marks them for life, the fear of being quietly cheated by an app they cannot walk into, and the fear that they are not wealthy enough to be allowed to travel.",
      "So the first move is never the answer. Get the travel date before you quote a timeline. Check refundability before you discuss the visa at all. Ask what the other quote includes before you defend the price. Quote first and you have anchored them to a number you may have to take back.",
      "The same words mean different things from different people. “I might lose the trip” from someone who has not booked is a scheduling conversation; from someone holding non-refundable tickets it is damage control. One question about what is booked and what is refundable tells you which conversation you are in.",
      "Then change what they think the problem is, rather than answering the question better than the last agent did. “The hard part is the form” becomes “the hard part is the appointment”. “A refund protects me” becomes “a refund protects the fee, only time protects the trip”. Research on roughly 6,000 salespeople found that in complex, high-stakes sales the people who focus on being liked are the worst performers, and the best teach the customer something they did not know.",
      "And lead on timeline and price without being pushy. Be the one who says we should file by Tuesday, who names the real cost, who tells someone their date does not work. Passivity feels polite and reads as uncertainty, and an uncertain agent makes an anxious customer worse.",
    ],
    example:
      "“My visa got rejected last month.” Say plainly that a prior refusal does not block a new application, then ask whether they still have the refusal letter. That question moves them from panic to task.",
    commonMistake:
      "Correcting a customer who pushes back. You do not confront resistance, you roll with it: agree with the true part out loud first, then narrow.",
  },
  {
    itemKey: "lesson.day2.fears",
    dayId: 2,
    ref: "Manual §2.4",
    title: "Typical fears & objections",
    body: [
      "Five things, in order of how often they turn up. Fear of loss, which is not about the fee but the trip: the flights, the leave, the anniversary it was planned around. Fear of judgement, that their salary, their balance or a first passport marks them as someone who should not be travelling.",
      "Then powerlessness: a stranger decides, using rules they cannot read, with no appeal. Fear of being cheated, by an app they cannot walk into, in a category full of people who do cheat. And shame, which is badly underestimated. A refusal lands like a verdict on your life, people often have not told their family, and when someone says “I was rejected last month” you are frequently the first person they have said it to.",
      "Six habits answer all five. Name it before you solve it: “I know that is not what you planned for”, then pause. Never let anyone feel judged about money or documents: do not ask why the balance is low, ask what does exist in their name.",
      "Give control back by ending every message with something they can do. Do not make them repeat themselves. Match their register: if they write in Hinglish, do not reply in corporate English. And tolerate silence after hard news.",
      "The fear is rarely stated, which is why the pause rule sits next to this one: given room, customers name the objection themselves.",
      "When the objections do come, they arrive in a reliable order: trust first, then rejection fear, then price against doing it themselves, then timeline panic. Expect them in that sequence rather than being surprised by each one, and answer every one with a verifiable proof point rather than a reassurance. The refund policy stated precisely, never vaguely, is the model for all of them. Something the customer can check beats something they have to believe.",
    ],
    example:
      "“Can I get a visa without a bank statement?” is rarely about documents. Ask what does exist in their name: salary account, FD, ITR, a sponsor. It is usually more than they think.",
    commonMistake:
      "Underestimating shame. It is the fear nobody states out loud, and answering a refusal as a paperwork problem tells them you did not hear it.",
  },
  {
    // Sits immediately before the pause rule on purpose: the two instincts look
    // opposed, and a joinee who meets the checklist first and the silence second
    // will run the checklist over the top of the fear. The reconciliation is in
    // the body rather than left for them to work out.
    itemKey: "lesson.day2.qualify",
    dayId: 2,
    ref: "Aug 2026",
    title: "Qualify before you pitch: the first 90 seconds",
    body: [
      "Six things, inside the first minute and a half, before you have recommended anything: the travel date; nationality and country of residence; destination and visa type; any prior rejections, anywhere; the funds reality; and who is travelling.",
      "They go into structured fields, not free-text notes. A note is unreadable by anyone but you, unsearchable the day someone asks how many refused applicants we spoke to last month, and gone entirely when the case moves to Ops. The field is the deliverable, not the memory of the conversation.",
      "This looks like it contradicts the pause rule on the next page. It does not, and getting the relationship right is most of the skill. You qualify on facts and you pause on fear. The six fields establish what is true (dates, documents, eligibility) and none of them tell you what the customer is afraid of. The silence does that. Run the checklist over the top of someone's fear and you will have a complete record of a conversation you lost.",
      "Then recommend rather than push: the right country, the right visa class, the right timeline. And disqualify openly when the timeline or the documents do not work. That is not a softer, kinder option. Selling to the unqualified is negative margin once refunds and reviews are counted, so the walk-away is the commercially correct move as well as the honest one. You do not need permission to make it.",
      "Most of this does not close on the first call in India. That is normal, it is not failure, and the cadence on Day 4 is where the money actually lands.",
    ],
    example:
      "The disqualification sentence already exists on the previous page: “Three weeks is not enough. I am not going to take your money pretending otherwise.” What is new is why it is allowed: not because we are being nice, but because the alternative books revenue that comes back as a refund and a review.",
    commonMistake:
      "Treating the six fields as an interrogation to complete before the real conversation starts. Prior rejections and funds are the two that get skipped when the customer sounds friendly and the call is going well, and they are the two that decide whether the case is sellable at all.",
  },
  {
    itemKey: "lesson.day2.pause_rule",
    dayId: 2,
    ref: "§2.4",
    title: "“Shut up for 10 seconds”: why it works",
    body: [
      "The guest will tell you how to sell to them if you shut up long enough. That is the whole rule.",
      "If you respond too fast, you answer the question but miss the fear. You are now solving the wrong problem, efficiently. Silence is not politeness; it is how the real objection surfaces on its own.",
      "Instead of pitching prematurely and handling objections defensively, silence makes guests volunteer them: budget concerns, timeline pressure, past bad experiences, competitor comparisons. Free intel, before you have said anything that can be objected to.",
    ],
    example:
      "Customer: “Is approval guaranteed?” → You (too fast): “No visa is guaranteed but…” → Better: pause. → Customer: “I was rejected once before and don't want to lose money again.” Now you know what to address.",
    commonMistake:
      "Using the pause to compose your answer instead of listening to what fills it.",
  },

  /* ---------------------------------- Day 3 --------------------------------- */
  {
    itemKey: "lesson.day3.visa_types",
    dayId: 3,
    ref: "Manager, Aug 2026",
    title: "Types of visas handled",
    body: [
      "Day 3 is one route, taught properly: the US B1/B2. That is confirmed, so treat it as the route you are expected to talk through end to end without checking with anyone.",
      "It earns that place twice over. The US is one of the hard countries, where the value and the anxiety both sit, and the B1/B2 is the visitor route (business and tourism on one visa), which is what almost every guest asking about a US visa actually wants.",
      "What you learn here does not transfer. Every other destination has its own stages, its own document set, its own fee split and its own committed timeline, and the country page is where you check, every time. An answer that was true for the US and wrong for Schengen is still an answer you sent in writing.",
      "There is no master list of every route we handle ranked by volume, and you should not wait for one: the country page is the answer for any route, including the ones you assume you already know. So a route you have not been taught gets “let me confirm that for your destination and come back to you”, not a confident extrapolation.",
    ],
    commonMistake:
      "Carrying US confidence across a border. The B1/B2 is the route you know in depth, not a template for the rest, and a guest cannot tell the difference between an answer you knew and an answer you assumed.",
  },
  // "High-level application stages" and "Where delays typically happen" used to
  // sit here as empty placeholders. Both are now taught by a mentor and on the
  // job rather than in the app, so the cards are gone rather than waiting on
  // §2.3 and §9.1 forever. Day 3's remaining four lessons are all written.
  // Who to ask about the pieces that never landed - appointment booking with
  // Sahil, resubmission rules with Mukul, the five failure points from Ops - is
  // on the Day 3 mentor panel, which is where a joinee would look for a person.
  {
    itemKey: "lesson.day3.ds160",
    dayId: 3,
    ref: "Snehasish, Aug 2026",
    title: "The DS-160",
    body: [
      "The DS-160 is the Online Nonimmigrant Visa Application form, and every US B1/B2 applicant has to file one. It is the application. When a guest asks what they actually have to do to get a US visa, this is the answer.",
      "The guest fills it in, and we do not leave them alone with it: we guide them through it, prefill what can be prefilled, and review it before submission: every section checked against their passport and their supporting documents, with anything inconsistent flagged before it goes to the embassy. This is also the most concrete thing you can point at when a guest asks what our fee actually buys.",
      "The mistakes are boringly consistent, and almost all of them are consistency mistakes rather than hard ones. A name that does not match the passport exactly, middle names and spellings included. A photo with the wrong dimensions or background. Travel dates or a stated purpose that do not match the cover letter or itinerary. Gaps or errors in employment and education history. Wrong social media handles or contact details. The wrong visa class or port of entry selected.",
      "Read that list as a sales tool rather than trivia. Not one of those is about whether the guest deserves a visa. They are all avoidable, and they are why “most refusals aren't about the person, they're about the file” is a true sentence rather than a comforting one. Someone filling this in alone at 1am is exactly who gets their own middle name wrong.",
    ],
    example:
      "The list starts with a name that does not match the passport: a middle name left out, a spelling. It is the least dramatic way imaginable to lose a trip, and a second reader catches it in seconds. That is the entire argument for having one.",
    commonMistake:
      "Describing the DS-160 as paperwork the guest submits and we forward. We check it line by line against the passport, and saying that plainly persuades better than any adjective about our service.",
  },
  {
    itemKey: "lesson.day3.interview",
    dayId: 3,
    ref: "Snehasish, Aug 2026",
    title: "The interview",
    body: [
      "Yes, there is an interview, and a guest should hear it from you rather than discover it. Almost every B1/B2 applicant between 14 and 79 attends one in person at a US Embassy or Consulate.",
      "What the officer asks is narrower than guests fear: the purpose of the trip, how long they are staying, who is funding it, their ties to India (job, family, property) and their travel history. That is the shape of it.",
      "The guidance to give is three words. Honest, concise, and consistent with the DS-160. Consistency is the one doing the work, because the officer has the form in front of them, and it is why the DS-160 review matters beyond tidiness.",
      "Guests should carry their supporting documents (bank statements, employment letter, itinerary) and should expect that the officer may never ask to see them. Say both halves. Told to bring documents and then never asked, a guest decides the whole thing was arbitrary; told they needed nothing and arriving empty-handed, that one is on us.",
      "What this is not is coaching answers. You are describing the shape of a conversation and why consistency matters. Anything that drifts towards rehearsing a story with a guest is on the wrong side of the red lines from Day 1.",
    ],
    example:
      "“Ties to India” sounds like a test of how wealthy someone is, and it is not: job, family, property is a question about why they are coming back. A guest who understands that stops trying to look rich and starts answering plainly.",
    commonMistake:
      "Calming a nervous guest by calling the interview a formality. It is a short conversation with a stranger who can refuse them, and the honest version (here is what they ask, be consistent with your form) settles people far better than a false description of the event.",
  },
  {
    itemKey: "lesson.day3.atlys_role",
    dayId: 3,
    ref: "Manager + Sameer, Aug 2026",
    title: "The role of Atlys in the process",
    body: [
      "Start with the part that is not negotiable: approval is the officer's call, and anyone who tells a guest otherwise is lying to them.",
      "What Atlys controls is the file and the slot. Nothing in the application should give the officer a reason to say no, and the appointment should be booked as early as it can be. Most refusals aren't about the person; they're about the file. That is the avoidable failure, and it is the thing we actually sell against.",
      "For the US B1/B2, that file asks less of the guest than they expect: no documents are needed from them. The one thing that has to be filled is the DS-160, and some guests arrive having already done it, so ask, rather than sending someone off to fill a form twice.",
      "Two limits on that sentence, and both matter in writing. It is a US B1/B2 answer and not a general one, because on most other destinations assembling the document set is the work. And it means nothing is gated on them sending us a document set, not that documents play no part: we check the DS-160 against their passport and their supporting documents, and they carry bank statements, an employment letter and an itinerary to the interview. So “you don't need any documents” is not a sentence to send on its own.",
      "On the money, learn this sentence exactly. If the application is under AtlysProtect and the visa is refused, the guest gets back the service fee. Not the total, and not the government fee: the government fee goes to the consulate and does not come back. Say both halves in the same breath, what returns and what does not.",
      "The cover only exists where the route is under AtlysProtect, so check the route before a number goes into a chat. Our own published pages have disagreed with each other on this, which is exactly why you check rather than recall. A wrong figure typed into a chat is a written commitment the company then has to argue its way out of.",
      "For a guest who has been refused, by us or by anyone else, there is Rejection Recovery: we decode why the visa was refused, build a personalised recovery plan, and reapply for them, and they pay only when they are approved (https://www.atlys.com/en-IN/rejection-recovery). Lead with the pay-on-approval part. They have already lost money once, and that is the sentence that lets them hear the rest of it. Whether they can reapply at all, and how soon, depends on the country, so check that before you agree to a date.",
      "On timelines, commit to the number on the country page. That is the number the company stands behind, so it is the only one you should be putting in writing. Genuine special cases get revised with Ops. You do not invent a number, and you do not improve on the page because a guest wants a better one.",
    ],
    example:
      "The safe version of the refund conversation is already one of the Day 1 flag lines: “Let me check the refund cover for your specific route before I give you a number.”",
    commonMistake:
      "Two slides, both fatal in writing. From “we make sure the file is right” into implying we influence the decision, which makes you the person who lied when it goes the other way. And from “the service fee” into “a full refund”, after which the guest comes back for the government fee too, holding your message as proof.",
  },

  /* ---------------------------------- Day 4 --------------------------------- */
  {
    itemKey: "lesson.day4.dashboard",
    dayId: 4,
    ref: "Manager, Aug 2026",
    title: "Chat/call dashboard overview",
    body: [
      "The dashboard this day means is WT (Walkie Talkie), the internal tool that runs on Retool. Worth stating plainly, because the journey doc never names it and joinees guess.",
      "It is not Freshchat and it is not Grafana. Freshchat is the inbound chat and Exotel is the calls, so that is where the conversation lives. Grafana is pipeline and funnel numbers. WT is where a specific application's real state lives, which makes it the one you open before you say anything factual about a case.",
      "So the habit is: look it up in WT rather than reconstruct it from what the guest remembers. A guest's account of their own application is a fine starting point and a poor source, and the gap between the two is where a confidently wrong status comes from.",
      "The screen-by-screen tour is not written down anywhere yet, so take it live with your mentor and note where you found each thing as you go. You should already have access: WT is on the Day 1 tool list and Devesh is the one who grants it. If it never came through, chase that before this day rather than during it. There is nothing here to do without it.",
    ],
    commonMistake:
      "Answering out of the chat thread because it is already open. The thread is what the guest told us; WT is what actually happened.",
  },
  {
    itemKey: "lesson.day4.lead_status",
    dayId: 4,
    ref: "§6.1",
    title: "Understanding lead status & intent",
    body: null,
    pendingWith: DAY4_NOTION_DOC,
  },
  {
    itemKey: "lesson.day4.handovers",
    dayId: 4,
    ref: "Aug 2026 (follow-ups) · §4.3 (handovers, pending)",
    title: "Follow-ups & handovers",
    body: [
      "Close on the call where you can. Where you cannot, a structured WhatsApp follow-up goes out within two minutes, and then a defined three-touch cadence.",
      "Two minutes is not a politeness target, it is the window while they still remember the conversation. At two minutes you are the person they were just speaking to; at two hours you are a notification. The message is structured rather than “just following up”: what was discussed, what you recommended, what happens next, and one thing for them to do.",
      "Then the cadence, and this is the part new joiners under-rate hardest. In India most of this does not close on the first call. That is the normal shape of the business, not a personal failure, and the follow-up sequence is where the revenue actually lands. An agent who is excellent on calls and casual about the cadence will be beaten by someone mediocre on calls who works it, which is also why leads never contacted are the single biggest source of lost revenue, larger than every objection combined.",
      "So follow-up is not admin you do after the selling. On most cases it is the selling.",
      "The handover half of this day (what a good handover actually contains when a conversation moves to someone else) has not been written down yet. Until it is, work from the Day 1 seam: the next person needs the context, and the guest must never be asked to repeat themselves. A guest repeating themselves is the clearest signal a handover was done badly.",
    ],
    example:
      "The two-minute message is short: “As discussed: B1/B2, you fly on the 20th, we file this week. I need your DS-160 if you have already started one. I will check back Thursday.” Discussed, recommended, next step, one thing for them to do.",
    commonMistake:
      "Treating a follow-up as a reminder rather than a step. “Just checking in” carries no new information, gives the guest nothing to react to, and burns one of your three touches.",
  },
  {
    itemKey: "lesson.day4.product",
    dayId: 4,
    ref: "§4.4",
    title: "Product: feature clarity, bugs, roadmap",
    body: null,
    pendingWith: DAY4_NOTION_DOC,
  },
  {
    itemKey: "lesson.day4.ops",
    dayId: 4,
    ref: "§4.5",
    title: "Ops: visa processing, timelines, exceptions",
    body: null,
    pendingWith: DAY4_NOTION_DOC,
  },
  {
    itemKey: "lesson.day4.metrics",
    dayId: 4,
    ref: "Aug 2026",
    title: "How you are measured",
    body: [
      "Worth knowing early, because you cannot correct against a scoreboard you have not seen. Speed and reach: time to first touch, and contact rate: what fraction of assigned leads you actually reached. Conversion: consult-to-payment, and revenue per contacted lead. Handling: average handle time and after-call work. Quality: QA score, promise violations per 100 calls, and the refund and rejection rate attributable to you.",
      "Read that list once more and notice its shape. Four of those measure whether you sold; four measure whether you should have. Comp is blended across conversion, downstream quality and QA together, which is what stops the first four from eating the second four.",
      "Two of them deserve singling out. Promise violations per 100 calls is the ten red lines from Day 1, counted. Every one of those sentences is a scored event, not a matter of taste. And refund and rejection rate attributable to you means a sale does not finish closing on the day it is paid for; it finishes sixty days later when the outcome arrives.",
      "The last thing to understand is incrementality. Campaigns run treatment against control, so what is reported is the lift you created rather than the gross number that closed. Some of your conversions would have happened without you, and those are not evidence of anything. It sounds like a technicality and it is actually the whole reason this is an advisory function rather than a pushy one: pressure moves gross numbers and does nothing to lift.",
    ],
    example:
      "Two agents book the same revenue. One has a refund rate twice the other's and three promise violations. Blended comp is the mechanism that makes them different. Without it, the honest one is simply paid less for doing the job properly.",
    commonMistake:
      "Optimising the metric that reports fastest. Conversion lands today; refunds, rejections and QA land weeks later, so a bad month can look like a good one right up until it does not.",
  },

  /* ---------------------------------- Day 5 --------------------------------- */
  {
    itemKey: "lesson.day5.price",
    dayId: 5,
    ref: "§5.1",
    title: "Price objection",
    body: [
      "“You can't guarantee approval, so what am I paying for?” They are pricing the outcome, and the outcome is not ours to sell. Move them to pricing the avoidable failure: the file.",
      "The embassy fee buys a review of the application. It does not buy a slot search, a document audit, a photo that passes spec, or anyone answering the phone at 11pm. That is what the Atlys fee buys. Say it plainly. Never apologise for the fee or soften it; hesitation reads as the fee being negotiable.",
    ],
    commonMistake:
      "Defending the price instead of moving the conversation to what the guest is actually buying.",
  },
  {
    itemKey: "lesson.day5.timeline",
    dayId: 5,
    ref: "§5.2",
    title: "Timeline anxiety",
    body: [
      "Be clear about timelines and next steps, and be explicit about what is not ours to control: the appointment queue is the consulate's, not ours. An average from past applications is an assumption dressed as a fact.",
      "Urgency is also the honest close: applying early enough turns a refusal into a delay instead of a cancellation. “How many days out is your travel?” does more selling than any reassurance.",
    ],
    commonMistake:
      "Quoting a comfortable average instead of what the slots actually show today.",
  },
  {
    itemKey: "lesson.day5.rejection_fear",
    dayId: 5,
    ref: "§5.3",
    title: "Visa rejection fear",
    body: [
      "“If I'm rejected I lose the whole trip, not just the fee.” They are right, and agreeing with the hard part is what makes the rest credible. Do not pretend a fee refund covers a trip. Nothing does, with us or anyone.",
      "Two things actually protect the trip: a file with no avoidable gaps, and applying early enough that a refusal is a delay rather than a cancellation. Then: “have you booked anything yet, and is it refundable?”",
    ],
    commonMistake:
      "Leading with the refund policy. It answers the money and ignores the trip, which is the thing they are actually afraid of losing.",
  },
  {
    itemKey: "lesson.day5.competitors",
    dayId: 5,
    ref: "§5.4",
    title: "Comparing competitors",
    body: [
      "“My local agent charges half.” Usually true, and irrelevant. Don't attack the agent. The guest often knows him personally, and attacking him makes his word more credible, not less.",
      "Ask two questions instead: what happens to the money if it's refused, and does he review the file before submitting or just fill and forward? He gets paid either way. Then: “what did he quote, and does that include the government fee?” Half the time the comparison is fee-vs-total and the gap disappears on its own.",
    ],
    commonMistake:
      "Arguing the competitor is bad, when the winning move is asking questions the guest takes back to him.",
  },
];

/** Lightweight index used by the points engine. */
export const LESSON_KEYS: readonly { dayId: DayId; itemKey: ItemKey }[] =
  LESSONS.map((lesson) => ({ dayId: lesson.dayId, itemKey: lesson.itemKey }));

export function lessonsForDay(dayId: DayId): Lesson[] {
  return LESSONS.filter((lesson) => lesson.dayId === dayId);
}
