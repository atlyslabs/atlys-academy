"use client";

import { FOLLOWUP_EXERCISE } from "@/content/onboarding/followup";
import { RewriteExercise } from "./RewriteExercise";

/**
 * Day 3 · Write the two-minute follow-up (lesson 3.6).
 *
 * The Day 2 writing drill pointed at the message a joinee sends most often.
 * All the teaching is in `FOLLOWUP_EXERCISE`; this only carries the framing.
 */
export function FollowupRewrite() {
  return (
    <RewriteExercise
      exercise={FOLLOWUP_EXERCISE}
      drillId="followup-rewrite"
      eyebrow="Drill · writing"
      title="The two-minute follow-up"
      description="It goes out inside two minutes, because at two minutes you are the person they were just speaking to and at two hours you are a notification. It carries what was discussed, what you recommended, what happens next, and one thing for them to do."
      inputLabel="Your follow-up message"
      placeholder="Recap first, then the one thing you need from them. Name the day you will be back."
    />
  );
}
