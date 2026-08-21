import type { DayId, ItemKey } from "./types";

export interface Lesson {
  itemKey: ItemKey;
  dayId: DayId;
  /** Where the content comes from - a manual section, or the pending question. */
  ref: string;
  title: string;
  /** Paragraphs. `null` = pending from Shovan; UI shows a placeholder. */
  body: string[] | null;
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

  {
    itemKey: "lesson.day1.motion_and_value",
    dayId: 1,
    ref: "Playbook §1.1–1.3",
    title: "The four ways a guest reaches you, and what you are selling",
    body: [
      "Four shapes of interaction, and they are not the same job. An inbound inquiry arrives by chat, call or video with a trip in mind: qualify, build trust, move them to an application. An outbound follow-up is a lead who showed interest and did not convert: re-engage with value rather than pressure, and find out what actually stopped them. A video consultation is the highest-intent interaction there is, so it gets a structured consultation and closes on a specific next step. And post-inquiry nurture is staying relevant to someone who did not convert first time, which means timely and specific, not a generic reminder.",
      "Across all four, what you are selling is not a visa. The guest is buying confidence that their trip will happen.",
      "Six things we do that they cannot do alone, and it is worth knowing them as a list because this is what the fee buys. Expert guidance on eligibility, so we know which visa applies before they do. Document review before submission, catching the errors that cause rejections. End-to-end application management, so nobody navigates embassy systems alone. Rejection recovery, because if it goes wrong we know what to do next. Speed, meaning the fastest legitimate route for the visa type. And accountability: a named person owns the case.",
      "The sharpest version of it: a guest who applies online alone has nobody to call when something goes wrong. You are that safety net, and peace of mind is the thing they are actually paying for.",
      "Which is why the mindset is trusted advisor rather than salesperson, and the difference is measurable rather than sentimental. Understand the need before pushing a product, because recommendations that fit convert better. Acknowledge concerns rather than “handling objections”, because guests who feel heard churn less. Close completely rather than quickly, because a rushed close produces drop-offs and refund requests. Solve problems rather than chase targets, because the people who solve problems hit targets consistently. And personalise, because personalisation is the single biggest driver of CSAT in Pre Sales.",
    ],
    example:
      "“I just want to know how much it costs” is the most common opener there is, and answering it first is the mistake. Price without a recommendation is a number with nothing attached to it, and it anchors the guest to a figure before they know what route they are even on.",
    commonMistake:
      "Treating all four interaction types as one. An outbound follow-up run like an inbound inquiry becomes a pitch to someone who already heard the pitch, which is why the doc says re-engage with value and specifically not with pressure.",
  },
  {
    itemKey: "lesson.day1.operating_principles",
    dayId: 1,
    ref: "Playbook §2.1",
    title: "The five operating principles",
    body: [
      "These are not values on a poster. Each one has a behaviour attached that you can be audited on, which is the only reason to write principles down at all.",
      "One, ownership always. You own the interaction from first contact to resolution, and you do not hand ownership to another team without making sure the guest is covered. The standard sentence is “I will personally ensure this is resolved by [time]”, not “I'll ask someone”.",
      "Two, specific over vague. Every commitment carries a time, every recommendation carries a reason. “I'll get back to you shortly” is not acceptable; “I will send you the document checklist by 3 PM today” is. Specificity builds trust and vagueness destroys it, and there is no middle setting.",
      "Three, discover before recommending. Never recommend a visa product before you understand the situation: destination, travel date, traveller count, prior visa history, purpose of travel. Every one of those changes the recommendation, so an assumption is not a shortcut, it is wrong advice.",
      "Four, empathy before efficiency. When someone is anxious, frustrated or confused, acknowledge the feeling before you solve the problem. A guest who feels heard is three times more likely to proceed; a guest who feels processed leaves at the first friction point.",
      "Five, every interaction is a data point. Log every call, outcome and objection in Cadence. Today's log is tomorrow's coaching material and the pipeline visibility leadership works from, so an incomplete log is not admin debt, it is a failure of the first principle.",
    ],
    commonMistake:
      "Reading “empathy before efficiency” as “be warm”. It is a sequencing instruction: the acknowledgement comes first in time, before the solution, and swapping the order is what makes a competent answer land badly.",
  },
  {
    itemKey: "lesson.day1.call_standards",
    dayId: 1,
    ref: "Playbook §2.2–2.3",
    title: "Call standards, and what gets you flagged",
    body: [
      "QA audits every call against these, with no exceptions for length or difficulty. Learn the opening verbatim, because it is scored verbatim: “Good morning / afternoon / evening, this is [Name] from Atlys Guest Delight, how may I help you with your visa request today?”",
      "Then: use the guest's name at least twice. Before any hold, state the reason, give a two-minute timeframe and ask permission, and if the hold runs past two minutes, come back, buy more time and thank them on return. Every commitment carries a specific time. Before ending, summarise what was discussed and what happens next, so the guest leaves with zero ambiguity, then ask “Is there anything else I can help you with today?”",
      "The last standard is the one people forget under pressure: read the tone before you close. With an irate or unresolved guest, drop “Have a wonderful day” and “Thank you for choosing Atlys” and use a neutral, empathetic close instead. Cheerfulness aimed at someone who is still angry reads as not having listened.",
      "Eight behaviours produce a QA flag and a coaching conversation, and three repeats on the same one triggers a structured improvement plan. Opening with “Hello” or “Hi” instead of the standard greeting. A vague timeline: shortly, soon, in a while, as soon as possible. Deflecting ownership: let me check with someone, that's not my department, someone will call you. Not asking permission before a hold. Ending with an unresolved guest and no specific follow-up commitment. Using “Have a wonderful day” on an irate guest. Not logging the outcome in Cadence within 15 minutes. And giving incorrect process information without checking first.",
      "Read that list next to the Day 1 red lines and notice they cover different ground. The red lines are about what you promise; these are about how you conduct the call. Both are scored, and you can lose a call on either.",
    ],
    example:
      "“I don't know” is not on the flag list, and saying it is not the failure. Saying it and stopping there is. The sanctioned version is: “That's a great question. I want to give you the right answer, let me check and come back to you by [specific time].”",
    commonMistake:
      "Thinking the greeting is a formality to get past. It is the single most audited sentence you will say, and “Hi, how can I help?” is a flag on a call that may otherwise have been excellent.",
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
    ref: "Manager + Playbook §3.1, Aug 2026",
    title: "The routes at a glance",
    body: [
      "This is orientation, not mastery. Five bodies of work, one paragraph each, so that when a guest says “Schengen” you know what they are talking about and roughly what is coming. The depth on any one of them is learnt on the job over the following weeks, and nobody expects you to carry it out of this room.",
      "First, why any of it converts. Information asymmetry is the gap between what you know and what the guest knows, and in visa work that gap is enormous. A guest applying for Schengen knows they need a visa; they do not know which embassy to apply to, whether their insurance qualifies, or why applications actually get refused. The more they realise you know things they could not easily have found out, the more they trust you — used generously it closes deals, and used to make someone feel stupid it loses them.",
      "SCHENGEN. One visa, twenty-nine countries, and the most common mistake is applying to the wrong embassy: you apply where you spend the most nights, and if the nights tie, to the first country you enter. Travel insurance must cover at least €30,000 across the whole Schengen area for the whole trip, and many off-the-shelf Indian policies do not. Bank statements often need to be stamped by the bank rather than downloaded. Appointment slots at France, Germany and Italy fill months ahead, so late applicants miss the trip rather than merely waiting. And funds under roughly €100 per day of travel is a high-risk file, though there is no published minimum.",
      "UNITED STATES — the B1/B2. Business and tourism on one visa, and the route we know best. The application is the DS-160 form, there is an in-person interview for almost everyone aged 14 to 79, and the two lessons after this one cover both properly. Two facts guests get wrong constantly: a 10-year visa is 10 years of *travel*, not of stay, with each entry typically up to six months and decided by the officer at the port. And 221(g) administrative processing after the interview is not a refusal.",
      "UNITED KINGDOM — the standard visitor visa. Up to six months, assessed on the “balance of probabilities” rather than a checklist. No minimum bank balance is published; what is looked for is consistency and no sudden large deposits just before applying, so a guest topping up to look solvent has made their file worse. Biometrics at a visa application centre are a real bottleneck. Processing comes in three tiers: three weeks standard, five working days priority, next working day super priority.",
      "CANADA. Nationality decides the product: visa-exempt citizens need an eTA, approved in minutes, and everyone else needs a Temporary Resident Visa. Biometrics again. The main form is the IMM 5257. Processing is genuinely unpredictable, from two weeks to three months with season and volume, which makes this the route where inventing a comfortable number does the most damage. Worth knowing the super visa exists for parents and grandparents of citizens and PRs, up to two years per visit — guests never ask for it by name.",
      "THE eVISA AND VISA-ON-ARRIVAL MARKETS, called AFC internally: everywhere outside Schengen where we process eVisas, visas on arrival and embassy visas. Each has one trap. UAE: 30-day visa on arrival for Indian passports, but not for every nationality, and ban status needs checking. Thailand: a 30-day exemption is not the 60-day eVisa, and overstay penalties are severe. Vietnam: 90-day eVisa, and the port of entry must be right on the application. Egypt: the eVisa does not cover Sinai, which needs a separate permit. Kenya: the East African Tourist Visa covers Kenya, Uganda and Rwanda together. Malaysia: ETAS has been required for some nationalities since 2023.",
      "For anything outside these five, and for any detail you are not certain of inside them, the country page is the answer. “Let me confirm that for your destination and come back to you” is a complete, professional response.",
    ],
    example:
      "France for five nights and Spain for three means the French embassy. Guests assume it is whichever embassy has slots, or wherever they land first — and the first-entry rule only breaks a tie. It is a thirty-second piece of knowledge that saves a whole application.",
    commonMistake:
      "Carrying confidence across a border. Knowing one route well makes you feel like you know visas, and a guest cannot tell the difference between an answer you knew and an answer you assumed. On this day the honest answer is usually “let me confirm that”.",
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
      "It runs to more than 40 sections, and inconsistency between the form and the supporting documents is the single most common cause of refusal. Not weakness, not eligibility: inconsistency. That one fact is the whole argument for the review we do.",
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
      "It is also short. The consular interview typically runs two to three minutes, and the officer is reading for credibility and ties to home country rather than working through the file. Guests brace for an interrogation and get a brief conversation, so telling them the real length is itself reassuring, and it explains why consistency matters more than detail: there is no time to recover from an answer that contradicts the form.",
      "Three things guests ask afterwards that you should be able to answer flatly. A 10-year visa does not mean 10 years of stay: entry is typically up to six months and it is the CBP officer at the port of entry who decides, not the visa. A prior US refusal does not block a new application, but it must be declared and put in context rather than quietly omitted. And 221(g) administrative processing is not a refusal: some applications enter it after the interview, and what it needs is careful follow-up, not panic.",
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


    {
    itemKey: "lesson.day4.dashboard",
    dayId: 1,
    ref: "Manager + Playbook, Aug 2026",
    title: "Chat/call dashboard overview",
    body: [
      "The dashboard this day means is Cadence. Everything about a guest sits there in one place: their history with us, the AI overview of the case, document status, journey status. When you need to know what is actually true about an application, that is the screen.",
      "Two tools get mistaken for it, and the second catches almost everybody. Freshchat is inbound chat, so that is where the conversation lives, not where the case does. And Walkie Talkie (WT) is how you call someone: it is a calling tool, not a dashboard. If you have heard WT described as the place you look up an application, unlearn it now, because that belief sends you to the wrong screen at the exact moment accuracy matters.",
      "So the habit is: look it up in Cadence rather than reconstruct it from what the guest remembers. A guest's account of their own application is a fine starting point and a poor source, and the gap between the two is where a confidently wrong status comes from.",
      "Logging is the other half of Cadence, and it is not administrative overhead. Every interaction goes in within 15 minutes of the call ending, the lead status is updated after every touchpoint, and the notes carry what the guest said, what they need, and what you committed to. An unlogged call is an interaction nobody else in the company can see, including whoever picks the case up next.",
      "The screen-by-screen tour is not written down yet, so take it live with your mentor and note where you found each thing as you go. On access: WT comes from Devesh and is on your Day 1 list, but who grants Cadence is not recorded anywhere yet. Ask on Day 1 rather than discovering on Day 4 that you cannot open the tool this whole day is built on.",
    ],
    commonMistake:
      "Answering out of the chat thread because it is already open. The thread is what the guest told us; Cadence is what actually happened.",
  },
  {
    itemKey: "lesson.day4.lead_status",
    dayId: 3,
    ref: "Playbook, Aug 2026 · §6.1 (intent signals, pending)",
    title: "Understanding lead status & intent",
    body: [
      "Five statuses, in the order a lead moves through them: New, Contacted, Qualified, Application Started, then either Converted or Lost. It updates after every touchpoint, not at the end of the day and not when you remember.",
      "Qualified is the one that carries weight, because it is the status that says you ran the six fields from Day 2 and the case is genuinely sellable. Moving a lead to Qualified on a good feeling rather than on a travel date, a destination and a funds answer is how an unsellable case gets counted as pipeline and then reappears as a refund.",
      "Lost is not an admission of failure and should not be avoided. A lead parked at Contacted forever is worse than one honestly marked Lost: it inflates the pipeline, it hides from re-engagement lists, and it means nobody knows whether you have capacity. Disqualified openly on Day 2 becomes Lost here, with the reason in the notes.",
      "The status is also what someone else reads when the case is not yours. Paired with notes carrying what the guest said, what they need and what you committed to, the status is the handover. Without them it is a row in a table.",
      "What is still missing from this lesson is the intent half: which signals mark a lead hot rather than cold. Day 4 asks you to sort leads that way and nobody has yet written down the three or four signals for each. Until they do, use the Day 2 fields as your proxy: a fixed travel date close enough to force a decision, non-refundable bookings already made, and a hard destination are the three that most reliably mean now rather than someday.",
    ],
    example:
      "A guest who says “I fly on the 20th and the flights are booked” and a guest who says “sometime next year, just researching” can both sit at Contacted. One of them is a today problem. The status alone does not tell you which, which is exactly why the intent signals are worth chasing.",
    commonMistake:
      "Treating the statuses as reporting rather than working memory. They are how the next person, and future you, know what this lead is without reading the whole thread.",
  },
  {
    itemKey: "lesson.day4.handovers",
    dayId: 3,
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
    itemKey: "lesson.day4.metrics",
    dayId: 1,
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

  {
    itemKey: "lesson.day4.crm_stack",
    dayId: 1,
    ref: "Playbook §6.1",
    title: "The full stack, and what each tool is for",
    body: [
      "Six tools, and an associate who uses them wrong is invisible to the team rather than merely disorganised. Cadence for the case and the pipeline. Freshchat for live chat. Walkie Talkie for calls. Boomerang for your own numbers. DD, the Daily Dashboard, for the team's. Notion for the glossary and the process docs.",
      "Cadence: log every interaction within 15 minutes of the call ending, update lead status after every touchpoint, and use the notes for what the guest said, what they need and what you committed to. Follow-up tasks get specific dates and times, not vague reminders. Review the pipeline every morning before taking calls, so you know who you are calling today and why.",
      "Freshchat: real time, with a response target under two minutes. Use the message templates for common queries but personalise them with the name and the situation, because an unedited template is the thing that proves nobody read them. And if a query needs more than three back-and-forths, move it to a call. Every chat is logged in Cadence as a lead, converted or not.",
      "Walkie Talkie: this is how you call a guest, and the rules are short. Never use a personal phone for guest communication, ever. If a call drops, call back within 60 seconds, and if you cannot reconnect, message on Freshchat immediately. Then log the call in Cadence like any other interaction.",
      "Boomerang and DD are the two you will skip if nobody tells you why they matter. Boomerang is your own numbers: calls made, leads contacted, conversion rate, and the cold-lead list your re-engagement outreach should be built from. Your manager reviews it daily, so a sparse pipeline is visible whether or not you mention it. DD, the Daily Dashboard, is the team's performance, including which lines of business are under target, and bringing one insight from it to the morning huddle is the difference between being engaged with the team's numbers and only your own.",
      "Notion is the one people forget is a tool. The glossary, the process docs and the country pages live there, and the country page is the answer every time a guest asks something about a route you have not been taught. Knowing where to look is the difference between “let me confirm that” and a confident guess.",
    ],
    example:
      "A chat that has gone four messages without resolving is already past the threshold. The instruction is to move to a call at three, and the reason is that a chat which needs four exchanges is a conversation being conducted in the wrong medium.",
    commonMistake:
      "Logging at the end of the day. The 15-minute rule exists because detail decays fast and because the case may move to someone else before your shift ends. A day of accurate logs written from memory at 6pm is a day of approximations.",
  },
  {
    itemKey: "lesson.day4.daily_workflow",
    dayId: 3,
    ref: "Playbook §6.2",
    title: "What a full day actually looks like",
    body: [
      "Start of shift: Boomerang for your numbers, Cadence for today's follow-ups, DD for the team's, and the morning quiz. That order is deliberate — you find out what state you are in before you start reacting to whatever arrives.",
      "First thirty minutes: action every Cadence follow-up due today, calls, messages and emails, before taking new inbound. This is the part that gets sacrificed when the queue is busy, and it is the part where the revenue is, because a follow-up due today and actioned next week is a lead you have effectively dropped.",
      "Core hours split two ways. Inbound: handle calls and chats in real time, log within 15 minutes, update lead status. Outbound: work your list, ten meaningful outreach actions a day minimum once you are at full autonomy, and log the outcomes.",
      "Mid-shift: clear anything waiting on you, answer chats inside the two-minute target, and check for escalations.",
      "End of shift: update all Cadence notes, set tomorrow's follow-up tasks, and write a post-mortem on one difficult call — one thing you would do differently. Weekly: calibration, QA feedback, update your personal knowledge system, contribute something to the team knowledge base.",
      "The shape to notice is that the day opens and closes with the same tool. Cadence is where you find out what to do and where you record what you did, and everything in between is the work itself.",
    ],
    commonMistake:
      "Taking inbound first because it feels more urgent. Inbound is louder, not more valuable, and a day that never reaches the follow-up list is a day spent on whoever happened to call.",
  },

    {
    itemKey: "lesson.day5.apac",
    dayId: 2,
    ref: "Playbook §7.1",
    title: "APAC: the objection framework",
    body: [
      "An objection is a signal, not a refusal. It means they are still in the conversation, and someone who has decided against you usually goes quiet rather than argues. So the frame is four steps: Acknowledge, Probe, Address, Confirm.",
      "Acknowledge: name the objection and validate it. “I completely understand, that's a really common concern.” This is the step people skip when they are confident about the answer, and skipping it is what makes a correct answer land as a rebuttal.",
      "Probe: ask a question to find the real concern under the surface one. “Can I ask what's making you hesitate on the timeline specifically?” Price objections are frequently timeline objections, and timeline objections are frequently rejection fear. You cannot address what you have not located.",
      "Address: respond to the real concern with specific, credible information. An answer, not a pitch. The scripts in the lessons that follow are the Address step — they are what goes here once Probe has told you which conversation you are actually in.",
      "Confirm: check the concern is resolved. “Does that make sense? Is that helpful?” Then move forward. Without this you do not know whether you answered them or just talked, and the objection returns later as silence.",
      "The order carries the value. Address on its own is a good answer to a question nobody asked, and Probe without Acknowledge sounds like an interrogation.",
    ],
    example:
      "The pause rule from Day 2 is the honest version of Probe. Silence and a question do the same job, and on a call the silence often works better, because the guest fills it with the objection they had not planned to admit.",
    commonMistake:
      "Jumping from Acknowledge to Address because you recognise the objection. Recognising the words is not the same as knowing the concern, and the two most common objections both disguise something else.",
  },
  {
    itemKey: "lesson.day5.edge_cases",
    dayId: 3,
    ref: "Playbook §7.3",
    title: "Edge cases: four situations that break the normal flow",
    body: [
      "Prior overstay history. Even a single day's overstay makes someone high-risk for that country, and it will surface in the application, so it has to be declared. Understand the context — accidental, an emergency, a different jurisdiction — and be honest about the effect on approval probability rather than building false hope. What mitigates it: a strong cover letter, evidence of ties to home country, a clear explanation. And the hard rule: escalate to your PM before advising anyone with a ban or an overstay. Do not guess on this one.",
      "MMT and other partner-platform leads. Some guests arrive from MakeMyTrip or similar and may have been auto-enrolled during a flight booking without clearly choosing a visa service. So establish first whether they actually wanted it. If they did not, and cannot opt out themselves, cancel the application on their behalf immediately and stop processing. Log it in Cadence as an MMT lead with the opt-out requested and the application cancelled. Do not pressure an MMT guest who does not want the service — it produces complaints and negative reviews, which is worse than the lost conversion.",
      "The UAE active-visa error. Some guests hit an error saying an active visa is already on record, blocking a new application. This is a known issue and may be a system fault, so do not tell the guest it is their problem or their fault. Escalate to the operations team immediately, because it needs backend resolution. Then set a specific follow-up time: “I am raising this with our technical team right now, I will update you by [time].” Promise the follow-up, never the resolution.",
      "A guest denied check-in at the airport. This is a genuine emergency and not a process flow. Do not hold them for more than 60 seconds. Escalate to the Emergency Helpline team, who own it. Stay on the call until the handover is confirmed — do not leave a distressed person without a live contact. Document what they said, what the denial reason was and what you did. Follow up with both the guest and the Emergency team within two hours.",
      "The pattern across all four is the same: these are the moments where the standard playbook produces the wrong answer, so the instruction is to escalate early and commit only to what you control.",
    ],
    example:
      "The airport case is the one to have rehearsed, because everything about it fights the habits you have built: no hold, no research, no ownership of the resolution. The correct move is the fastest possible handover to the team whose job it is, while staying on the line.",
    commonMistake:
      "Trying to solve the emergency yourself because ownership has been drilled into you. Ownership here means making sure the guest is covered, not being the one who fixes it, and the difference costs minutes that matter.",
  },
  {
    itemKey: "lesson.day5.language",
    dayId: 2,
    ref: "Playbook §7.4",
    title: "Language for difficult conversations",
    body: [
      "Seven sentences to retire, and what replaces each. These are not softer wordings of the same thing — each swap moves from a dead end to a next action.",
      "“That's not our fault” becomes “I understand this is frustrating, let me look into exactly what happened and what we can do.” “There's nothing I can do” becomes “Here's what I can do right now: [specific action]. Let me start on that immediately.” “You should have done that earlier” becomes “Let's focus on what we can do from here. The most important thing right now is [next step].”",
      "“I don't know” becomes “That's a great question. I want to give you the right answer, let me check and come back to you by [specific time].” “The system doesn't allow it” becomes “There's a technical limitation I need to work around. Give me [timeframe] and I'll come back with options.” “You need to be patient” becomes “I completely understand your urgency. Here's exactly what I'm doing and when you'll hear from me.”",
      "And the one that sounds most harmless: “I'll try my best” becomes “I will personally make sure this is resolved by [specific time].” Trying your best is not a commitment, and a guest who is already worried hears it as a warning.",
      "Every replacement has the same two ingredients: a specific action and a specific time. That is not a coincidence — it is the second operating principle applied to the moments where vagueness is most tempting.",
    ],
    commonMistake:
      "Reading these as politeness formulas. They are ownership statements, and the reason “I'll try my best” is on the never-say list is that it is perfectly polite and commits to nothing.",
  },
  {
    itemKey: "lesson.day5.price",
    dayId: 2,
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
    dayId: 2,
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
    dayId: 2,
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
    dayId: 2,
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
