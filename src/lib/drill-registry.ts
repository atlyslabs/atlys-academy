"use client";

import type { ComponentType } from "react";
import type { DrillId } from "@/content/onboarding/types";
import { AnxietyWall } from "@/components/onboarding/AnxietyWall";
import { ApacLoop } from "@/components/onboarding/ApacLoop";
import { ConnectIslands } from "@/components/onboarding/ConnectIslands";
import { DosDontsSorter } from "@/components/onboarding/DosDontsSorter";
import { Ds160Consistency } from "@/components/onboarding/Ds160Consistency";
import { EdgeCaseScenarios } from "@/components/onboarding/EdgeCaseScenarios";
import { FlagSwipe } from "@/components/onboarding/FlagSwipe";
import { FollowupRewrite } from "@/components/onboarding/FollowupRewrite";
import { LeadStatusSort } from "@/components/onboarding/LeadStatusSort";
import { OwnershipSort } from "@/components/onboarding/OwnershipSort";
import { PauseDrill } from "@/components/onboarding/PauseDrill";
import { ReframeDeck } from "@/components/onboarding/ReframeDeck";
import { RewriteExercise } from "@/components/onboarding/RewriteExercise";
import { ScenarioBranch } from "@/components/onboarding/ScenarioBranch";
import { ToolMatchPuzzle } from "@/components/onboarding/ToolMatchPuzzle";

/**
 * Which component renders each drill.
 *
 * Extracted from `DayPanel` when the page layer was reset for the redesign.
 * The map is wiring rather than presentation: `days.ts` lists drill ids per
 * day, and this is the only place that knows which component answers an id.
 * Whatever the new day page looks like, it can mount a day's drills by
 * reading `day.drills` and looking each id up here.
 *
 * Four of these entries are the same component twice over, which is deliberate:
 * `flag-swipe` and `ds160-consistency` are one swipe deck with two configs,
 * `rewrite-chat` and `followup-rewrite` one writing drill, `ownership-sort` and
 * `lead-status` one column sorter, `mock-scenarios` and `edge-cases` one
 * branching scenario. Adding a drill is usually a content file and a four-line
 * wrapper, not a new interaction.
 */
export const DRILL_COMPONENTS: Record<DrillId, ComponentType> = {
  "pause-10s": PauseDrill,
  "dos-donts": DosDontsSorter,
  "rewrite-chat": RewriteExercise,
  "apac-loop": ApacLoop,
  "mock-scenarios": ScenarioBranch,
  "tool-match": ToolMatchPuzzle,
  "ownership-sort": OwnershipSort,
  "connect-islands": ConnectIslands,
  "flag-swipe": FlagSwipe,
  "anxiety-wall": AnxietyWall,
  "reframe-deck": ReframeDeck,
  "edge-cases": EdgeCaseScenarios,
  "followup-rewrite": FollowupRewrite,
  "lead-status": LeadStatusSort,
  "ds160-consistency": Ds160Consistency,
};

/**
 * A short human name per drill, for whatever the redesign uses as a heading.
 *
 * These are plain descriptions of what the drill does. The previous names were
 * airport-desk staging ("Gate hold", "Baggage claim") that belonged to the
 * travel theme rather than to the drills themselves, so they are not carried
 * over; the drill content in `src/content/onboarding` is untouched.
 */
export const DRILL_LABELS: Record<DrillId, string> = {
  "pause-10s": "The ten-second pause",
  "dos-donts": "Do and don't",
  "rewrite-chat": "Rewrite the chat",
  "apac-loop": "Run the loop",
  "mock-scenarios": "Mock scenarios",
  "tool-match": "Match the tool",
  "ownership-sort": "Who owns it",
  "connect-islands": "Route the situation",
  "flag-swipe": "Spot the flag",
  "anxiety-wall": "The anxiety wall",
  "reframe-deck": "Reframe the objection",
  "edge-cases": "When the playbook is wrong",
  "followup-rewrite": "The two-minute follow-up",
  "lead-status": "Move the lead",
  "ds160-consistency": "The second reader",
};
