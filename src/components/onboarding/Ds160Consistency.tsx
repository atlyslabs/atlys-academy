"use client";

import { DS160_DECK } from "@/content/onboarding/ds160";
import { SwipeDeck } from "./SwipeDeck";

/**
 * Day 3's DS-160 second read, on the shared swipe deck.
 *
 * Same registration-only wrapper as `FlagSwipe`: the drill registry maps a
 * `DrillId` to a zero-prop component, and the deck itself - copy, labels,
 * stamps and cards - is `DS160_DECK`, which is where the drill is explained.
 */
export function Ds160Consistency() {
  return <SwipeDeck deck={DS160_DECK} />;
}
