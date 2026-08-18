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
        accessNeeded: true,
      },
      {
        key: "day1.request_tool_access",
        label: "Request every tool on the travel kit",
        detail:
          "Cadence, Freshdesk, Freshchat, Exotel, WT, and the rest. Chase these today.",
        accessNeeded: true,
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
        key: "day1.intro_shovan",
        label: "Intro meeting with Shovan",
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
        accessNeeded: true,
      },
      {
        key: "day2.read_transcripts",
        label: "Read past high-quality chat and call transcripts",
        detail: "Freshchat / Exotel",
        accessNeeded: true,
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
        key: "day2.sync_shovan",
        label: "Sync with Shovan",
        detail: "30 minutes",
      },
    ],
    drills: [
      "pause-10s",
      "dos-donts",
      "anxiety-wall",
      "reframe-deck",
      "rewrite-chat",
      "objection-library",
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
    activities: [
      {
        key: "day3.ops_failure_points",
        label: "Ask the Ops team for 5 common failure points",
        detail: "Write them down. They become your best objection answers.",
      },
      {
        key: "day3.review_applications",
        label: "Review real (sanitised) applications",
        accessNeeded: true,
      },
      {
        key: "day3.shadow_chats",
        label: "Shadow 2-3 live chats",
        detail: "Today's ODPAC report comes from these.",
      },
      {
        key: "day3.walk_cadence",
        label: "Walk through Cadence with your mentor",
        detail:
          "Guest history, AI overview, document status, journey status. Note where each lives.",
        accessNeeded: true,
      },
      {
        key: "day3.qa_ops_lead",
        label: "Q&A session with the Ops Lead",
        detail: "1 hour. Map guest questions against correct explanations.",
      },
      {
        key: "day3.fishbone",
        label: "Identify your weakest bone from the fishbone self-audit",
        detail: "Raise it with your PM before the academy ends.",
      },
    ],
    drills: ["ownership-sort", "ownership-run"],
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
