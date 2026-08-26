import type { Day } from "./types";

/**
 * The three-day academy.
 *
 * Scoped down from five days (Aug 2026) against the Pre Sales Mastery Playbook:
 * the academy covers Playbook Modules 1 and 2, the tools half of Module 6, and
 * Phase A of the 90-day pipeline. Everything with real depth — the five regions
 * in Module 3, objections and edge cases in Module 7 — is Days 8-90 work and is
 * learnt on the job, so what is here is orientation and the non-negotiables.
 *
 * Each day is one theme: the role and the desk, the guest and the conversation,
 * then visas, money and what you own. Every day ends the same way — an ODPAC
 * report on chats you shadowed, then the quiz.
 *
 * Wording in `learn` and `activities` is the hiring manager's or the playbook's.
 * Do not add training content here that exists in neither.
 *
 * `drills` was rebalanced in Aug 2026 after an audit against the lessons. Day 2
 * had seven drills for eleven lessons and none of them ran APAC; Day 3 had eight
 * lessons and two drills, both over the same nine ownership cards. So
 * `objection-library` (never a drill - hold-to-reveal reading, and 2.6 says its
 * scripts are APAC's Address step) became `apac-loop`, and `ownership-run`
 * (a speed round over cards `ownership-sort` had just dealt) gave its slot to
 * the four Day 3 lessons that had none: 3.8, 3.5, 3.6 and 3.2.
 */
export const DAYS: readonly Day[] = [
  {
    id: 1,
    slug: "day1",
    title: "The role and the desk",
    objective:
      "Understand what Pre Sales actually is here, the non-negotiables, and the tools you work from.",
    learn: [
      "Why we exist",
      "What Pre Sales is: an incremental conversion function, not a persuasion one",
      "The four ways a guest reaches you, and what you are selling",
      "How this role impacts revenue and trust",
      "Pre-checkout vs Post-checkout support",
      "The five operating principles",
      "Call standards, and what gets you flagged",
      "Cadence and the rest of the stack",
      "How you are measured",
    ],
    responsibilities: [
      "Handling inbound customer chats & calls",
      "Educating users before purchase",
      "Identifying intent & urgency",
      "Reducing drop-offs at checkout",
      "Coordinating with Ops for edge cases",
    ],
    activities: [
      {
        key: "day1.read_glossary",
        label: "Read the Company + Product overview",
        detail: "All Things Atlys: Glossary (Notion)",
        href: "https://www.notion.so/goatlys/All-Things-Atlys-Glossary-20bd57ef7388804fbb91f7e1984b7adf",
      },
      {
        key: "day1.request_tool_access",
        label: "Request every tool on the travel kit",
        detail:
          "Cadence, Freshchat, Walkie Talkie, Boomerang, DD, Notion. Chase these today.",
      },
      {
        key: "day1.shadow_chats",
        label: "Shadow 2-3 live chats",
        detail: "Observe only. Do not reply. Your ODPAC report comes from these.",
      },
      {
        key: "day1.learn_the_opening",
        label: "Learn the standard call opening and closing by heart",
        detail: "Recite both without notes. QA scores the opening verbatim.",
      },
      {
        // Key kept: progress rows reference it, and renaming one in place
        // orphans every joinee who has already ticked it. The meeting moved
        // from Shovan to Komal Rawat in Aug 2026; only the label changes.
        key: "day1.intro_shovan",
        label: "Intro meeting with Komal Rawat",
        detail: "1 hour",
      },
    ],
    drills: ["tool-match", "flag-swipe", "connect-islands"],
  },
  {
    id: 2,
    slug: "day2",
    title: "The guest and the conversation",
    objective:
      "Understand who the guest is, what they are actually afraid of, and how a conversation is run.",
    learn: [
      "Who our guests are: persona, geography, intent",
      "Common reasons guests reach out before checkout",
      "Typical fears & objections",
      "Qualify before you pitch: the first 90 seconds",
      '"Shut up for 10 seconds". The guest will tell you how to sell to them if you shut up long enough',
      "APAC: the objection framework",
      "Language for difficult conversations",
      "The four objections you will meet first",
    ],
    activities: [
      {
        key: "day2.review_faqs",
        label: "Review the top pre-checkout FAQs",
        detail: "Freshchat",
      },
      {
        key: "day2.read_transcripts",
        label: "Read past high-quality chat and call transcripts",
        // Not Walkie Talkie: it is a calling tool, not a dashboard, and nothing
        // readable is stored there. The old detail said "Freshchat /
        // Walkie-Talkie", a mechanical rename of the retired "Lime Chat /
        // Exotel" that missed the distinction 1.10 draws between the two.
        detail:
          "Freshchat for chat threads, Cadence for case history and notes. Ask your mentor where call recordings live.",
      },
      {
        key: "day2.shadow_chats",
        label: "Shadow 2-3 live chats",
        detail: "Today's ODPAC report comes from these.",
      },
      {
        key: "day2.rewrite_chats",
        label: "Rewrite poor chat examples into good ones",
        detail: "Do the rewrite drill below.",
      },
      {
        key: "day2.note_patterns",
        label:
          "Note down the questions guests ask repeatedly, and the phrases that build trust",
      },
      {
        // Key kept for the same reason as `day1.intro_shovan`. Day 2's mentor
        // is the joinee's team leader, so the sync is with them.
        key: "day2.sync_shovan",
        label: "Sync with your team leader",
        detail: "30 minutes",
      },
    ],
    // `apac-loop` sits before `mock-scenarios` on purpose: 2.6 is the frame the
    // four objection lessons plug into, so the loop is run before the scenarios
    // that are its Address step.
    drills: [
      "pause-10s",
      "dos-donts",
      "anxiety-wall",
      "reframe-deck",
      "rewrite-chat",
      "apac-loop",
      "mock-scenarios",
    ],
  },
  {
    id: 3,
    slug: "day3",
    title: "Visas, money and what you own",
    objective:
      "Get oriented on the routes we sell, the money you may put in writing, and where your ownership ends.",
    learn: [
      "The routes at a glance: Schengen, US, UK, Canada, and the eVisa markets",
      "The DS-160",
      "The interview",
      "The role of Atlys in the process, and the money you may commit to",
      "Lead status and intent",
      "Follow-ups and handovers",
      "What a full day looks like",
      "Edge cases that break the normal flow",
    ],
    // Two items were removed in Aug 2026 along with Day 3's mentor cards:
    // `day3.ops_failure_points` ("Ask the Ops team for 5 common failure
    // points") and `day3.qa_ops_lead` ("Q&A session with the Ops Lead"). Both
    // sent a joinee to an Ops Lead the academy no longer names or links to, so
    // they asked for a meeting nobody was set up to give. Stored rows under
    // those keys are harmless orphans - nothing reads a row for an activity no
    // longer listed - and Day 3's checklist stamp now needs four ticks, not six.
    activities: [
      {
        key: "day3.review_applications",
        label: "Review real (sanitised) applications",
      },
      {
        key: "day3.shadow_chats",
        label: "Shadow 2-3 live chats",
        detail: "Today's ODPAC report comes from these.",
      },
      {
        // Repointed Aug 2026: this used to be the practical half of the
        // deprecated 1.8. It now runs off "The full stack" (1.9), which is the
        // lesson that survives, and covers the whole stack rather than one tool
        // that is expected to be replaced.
        key: "day3.walk_cadence",
        label: "Walk the tool stack with your mentor",
        detail:
          "Open each tool from “The full stack” in Day 1's reading. In Cadence, find guest history, document status and journey status, and note where each lives.",
      },
      {
        // Key kept: progress rows reference it. The label used to point at a
        // "fishbone self-audit" that exists in no lesson, no doc and no
        // component - the only way to complete it was to tick a box for
        // something never done. Repointed at something reachable that does the
        // same job.
        key: "day3.fishbone",
        label:
          "Name the “what new joiners get wrong” you are most likely to be",
        detail:
          "Pick one from the three days and raise it with your PM before the academy ends.",
      },
    ],
    drills: [
      "ownership-sort",
      "edge-cases",
      "lead-status",
      "followup-rewrite",
      "ds160-consistency",
    ],
  },
];

/**
 * The final day's id, derived rather than written down.
 *
 * Two places need "is this the last day?" for their copy, and both used to
 * hardcode `5`. Collapsing five days to three turned those into silently dead
 * branches - only the type change caught them - so it is derived now.
 */
export const LAST_DAY_ID = DAYS[DAYS.length - 1].id;
