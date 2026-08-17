"use client";

import type { ComponentType } from "react";
import type { DrillId } from "@/content/onboarding/types";
import { AnxietyWall } from "@/components/onboarding/AnxietyWall";
import { ConnectIslands } from "@/components/onboarding/ConnectIslands";
import { DosDontsSorter } from "@/components/onboarding/DosDontsSorter";
import { FlagSwipe } from "@/components/onboarding/FlagSwipe";
import { LaneRunner } from "@/components/onboarding/LaneRunner";
import { ObjectionLibrary } from "@/components/onboarding/ObjectionLibrary";
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
 * Every id in the `DrillId` union now resolves. The old map in `DayPanel`
 * covered nine of the twelve - `flag-swipe`, `anxiety-wall` and
 * `reframe-deck` had shipped as components but were never wired to a card, so
 * Day 1's flag drill and two of Day 2's were unreachable in the UI. They are
 * included here so the redesign starts from the full set.
 */
export const DRILL_COMPONENTS: Record<DrillId, ComponentType> = {
  "pause-10s": PauseDrill,
  "dos-donts": DosDontsSorter,
  "rewrite-chat": RewriteExercise,
  "objection-library": ObjectionLibrary,
  "mock-scenarios": ScenarioBranch,
  "tool-match": ToolMatchPuzzle,
  "ownership-sort": OwnershipSort,
  "ownership-run": LaneRunner,
  "connect-islands": ConnectIslands,
  "flag-swipe": FlagSwipe,
  "anxiety-wall": AnxietyWall,
  "reframe-deck": ReframeDeck,
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
  "objection-library": "Objection library",
  "mock-scenarios": "Mock scenarios",
  "tool-match": "Match the tool",
  "ownership-sort": "Who owns it",
  "ownership-run": "Ownership run",
  "connect-islands": "Connect the teams",
  "flag-swipe": "Spot the flag",
  "anxiety-wall": "The anxiety wall",
  "reframe-deck": "Reframe the objection",
};
