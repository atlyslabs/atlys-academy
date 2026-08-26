"use client";

import { EDGE_CASE_SCENARIOS } from "@/content/onboarding/edge-cases";
import {
  ScenarioBranchDrill,
  type ScenarioBranchConfig,
  type ScenarioGuest,
} from "./ScenarioBranch";

/**
 * A face and a name for each Day 3 guest, keyed by scenario id.
 *
 * Named people rather than the Day 2 archetypes ("The price-checker"), because
 * the two drills are labelled differently at the source: a Day 2 scenario is
 * named for an objection type and anyone could be voicing it, while every
 * situation here is one specific person in trouble on one specific call.
 *
 * On the faces: the eight-face set has four spoken for by Day 2, so where the
 * tone of the message wants a face Day 2 already took - alarm, deadpan - it is
 * reused and the blob colour does the separating. All four colours below are
 * ones Day 2 does not use, so no two guests across the two drills read alike at
 * portrait size, which is 30px.
 */
const EDGE_CASE_GUESTS: Record<string, ScenarioGuest> = {
  "edge.airport_denied": {
    name: "Vikram Shetty",
    // Sky, round-eyed alarm, bare head - he is at a counter, not dressed for a
    // conversation he expected to have.
    avatar: { color: 6, face: 5, hat: 0 },
  },
  "edge.overstay": {
    name: "Neha Raghavan",
    // Purple and a happy squint: ten minutes of a chat going well, and she
    // raises the overstay as an afterthought she assumes is nothing.
    avatar: { color: 1, face: 1, hat: 6 },
  },
  "edge.mmt_partner": {
    name: "Karthik Iyer",
    // Olive and deadpan for "Sorry, who is this?" - the halo is the joke he
    // would make himself, having done nothing but book a flight.
    avatar: { color: 7, face: 3, hat: 7 },
  },
  "edge.uae_active_visa": {
    name: "Sana Bhatia",
    // Pink, determined brows: three attempts on her own before she messaged.
    avatar: { color: 5, face: 6, hat: 4 },
  },
};

const EDGE_CASE_CONFIG: ScenarioBranchConfig = {
  drillId: "edge-cases",
  scenarios: EDGE_CASE_SCENARIOS,
  eyebrow: "Drill · escalation",
  title: "When the playbook is wrong",
  description:
    "These are the moments where the standard playbook produces the wrong answer, so the instruction is to escalate early and commit only to what you control.",
  guests: EDGE_CASE_GUESTS,
  // Nothing is being closed here - three of the four right answers hand the
  // guest to someone else - so the count says what was actually achieved.
  countLabel: "handled the right way",
  badgeLabel: "handled",
  verdicts: {
    closes: "This is the right call",
    deepens: "This makes it worse",
  },
  // Lesson 3.8 on the airport case: "Do not hold them for more than 60
  // seconds." It is the only scenario in either drill where the time you take
  // is itself the mistake, so it is the only one that shows a clock.
  timedScenarioId: "edge.airport_denied",
};

/**
 * Day 3 edge cases (lesson 3.8).
 *
 * Same component as the Day 2 mock scenarios, different test. Day 2 asks
 * whether you can answer well; every foil here is a good answer, delivered on
 * the one call where answering was the wrong move.
 */
export function EdgeCaseScenarios() {
  return <ScenarioBranchDrill config={EDGE_CASE_CONFIG} />;
}
