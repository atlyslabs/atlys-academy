"use client";

import { FLAG_DECK } from "@/content/onboarding/flags";
import { SwipeDeck } from "./SwipeDeck";

/**
 * Day 1's red-line reflex drill.
 *
 * The interaction moved into `SwipeDeck` when Day 3's DS-160 check turned out
 * to be the same drill over different cards. This file stays because the drill
 * registry maps a `DrillId` to a zero-prop component, so each deck needs its
 * own named component to register - and because `flag-swipe` is the id the
 * stored results are keyed to.
 */
export function FlagSwipe() {
  return <SwipeDeck deck={FLAG_DECK} />;
}
