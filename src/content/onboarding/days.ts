import type { Day } from "./types";

/**
 * The five-day journey, transcribed from `docs/source-journey.md`.
 *
 * Wording is the hiring manager's. Where a line has been lightly edited for the
 * screen (punctuation, sentence case) the meaning is unchanged. Do not add
 * training content here that does not exist in the source doc.
 */
export const DAYS: readonly Day[] = [
  {
    id: 1,
    slug: "day1",
    title: "Welcome",
    objective: "Understand where Pre-checkout Sales fits.",
    learn: [
      "Why we exist",
      "What Pre-checkout Sales is",
      "How this role impacts revenue and trust",
      "The difference between Pre-checkout and Post-checkout support",
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
        key: "day1.shadow_chats",
        label: "Shadow 2-3 live chats",
        detail: "Observe only. Do not reply.",
      },
      {
        key: "day1.intro_shovan",
        label: "Intro meeting with Shovan",
        detail: "1 hour",
      },
    ],
    drills: ["tool-match", "flag-swipe"],
  },
  {
    id: 2,
    slug: "day2",
    title: "Product & Customer Basics",
    objective: "Understand who the customer is and what they care about.",
    learn: [
      "Who our guests are: persona, geography, intent",
      "Common reasons guests reach out before checkout",
      "Typical fears & objections",
      '"Shut up for 10 seconds". The guest will tell you how to sell to them if you shut up long enough',
    ],
    activities: [
      {
        key: "day2.review_faqs",
        label: "Review the top pre-checkout FAQs",
        detail: "Lime Chat",
        accessNeeded: true,
      },
      {
        key: "day2.read_transcripts",
        label: "Read past high-quality chat and call transcripts",
        detail: "Lime Chat / Exotel",
        accessNeeded: true,
      },
      {
        key: "day2.rewrite_chats",
        label: "Rewrite poor chat examples into good ones",
        detail: "Do the rewrite drill below.",
      },
      {
        key: "day2.tone_guidelines",
        label: "Read the tone guidelines",
        detail: "Friendly, calm, confident.",
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
    ],
  },
  {
    id: 3,
    slug: "day3",
    title: "Visa Deep Dive",
    objective: "Understand the end-to-end visa flow.",
    learn: [
      "Types of visas handled",
      "High-level application stages",
      "The role of Atlys in the process",
      "Where delays typically happen",
    ],
    activities: [
      {
        key: "day3.read_us_visa_doc",
        label: "Read the US Visa process doc",
        detail:
          "DS-160 basics · required documents · appointment booking logic · rejections & resubmissions",
        accessNeeded: true,
      },
      {
        key: "day3.test_application",
        label: "Complete the test application exercise",
      },
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
        key: "day3.qa_ops_lead",
        label: "Q&A session with the Ops Lead",
        detail: "1 hour. Map customer questions against correct explanations.",
      },
      {
        key: "day3.qa_gd",
        label: "Q&A session with Growth/Design",
        detail: "1 hour. The top things customers need reassurance on.",
      },
    ],
    drills: ["ownership-sort", "ownership-run"],
  },
  {
    id: 4,
    slug: "day4",
    title: "Execution & Collaboration",
    objective: "Learn how to manage active conversations.",
    learn: [
      "Chat/call dashboard overview",
      "Understanding lead status & intent",
      "Follow-ups & handovers",
      "Product: feature clarity, bugs, roadmap",
      "Ops: visa processing, timelines, exceptions",
    ],
    activities: [
      {
        key: "day4.monitor_pipeline",
        label: "Monitor the live pipeline with your mentor",
        accessNeeded: true,
      },
      { key: "day4.hot_vs_cold", label: "Identify hot vs cold leads" },
      { key: "day4.escalation_paths", label: "Learn the escalation paths" },
      { key: "day4.decision_ownership", label: "Understand decision ownership" },
      {
        key: "day4.own_flowchart",
        label: "Create your own flowchart",
        detail: "Keep it simple. One page.",
      },
      {
        key: "day4.sync_santosh_shovan",
        label: "Sync with Santosh / Shovan",
        detail: "1 hour",
      },
    ],
    drills: ["connect-islands"],
  },
  {
    id: 5,
    slug: "day5",
    title: "Mock Chats & Calls",
    objective: "Build confidence before going live.",
    learn: [
      "Price objection",
      "Timeline anxiety",
      "Visa rejection fear",
      "Comparing competitors",
    ],
    activities: [
      {
        key: "day5.run_mock_scenarios",
        label: "Work through all four mock scenarios below",
      },
      {
        key: "day5.roleplay_shovan",
        label: "Role-play with Shovan",
        detail: "1 hour",
      },
      {
        key: "day5.collect_feedback",
        label: "Get feedback on tone, accuracy and confidence",
      },
    ],
    drills: ["mock-scenarios"],
  },
];
