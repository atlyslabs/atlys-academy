import type { RewriteExercise } from "./types";

/**
 * Day 3 · Write the two-minute follow-up (lesson 3.6).
 *
 * The same interaction as the Day 2 rewrite, pointed at the behaviour a joinee
 * will repeat most often. 3.6: "In India most of this does not close on the
 * first call... An agent who is excellent on calls and casual about the cadence
 * will be beaten by someone mediocre on calls who works it." Until this drill
 * existed, the most repeated behaviour in the job was recognition-tested once
 * in a quiz, while a one-off price reply got a full writing drill.
 *
 * The bad reply is the lesson's own named failure - "Just checking in" carries
 * no new information, gives the guest nothing to react to, and burns one of
 * your three touches - and the model answer is 3.6's IN PRACTICE message
 * verbatim.
 */
export const FOLLOWUP_EXERCISE: RewriteExercise = {
  exerciseKey: "day3.followup_message",
  customerMessage:
    "Call ended. B1/B2, they fly on the 20th, no payment yet — they want to talk to their wife first. You said you would send something across.",
  badReply:
    "Hi Rajesh! Just following up on our call earlier 😊 Do let me know if you'd like to go ahead and I'll get things started. Thanks!",
  problems: [
    "It carries no new information. Nothing in it that was not already said on the call, so there is nothing for them to react to.",
    "It gives them nothing to do. The next move is entirely theirs to invent, which for an anxious guest means it does not happen.",
    "It burns one of your three touches on a reminder. Follow-up is not admin you do after the selling — on most cases it is the selling.",
    "Nothing is recapped, so if the wife asks what was actually recommended, he cannot tell her.",
    "No time on anything. “Let me know” is the vaguest possible commitment and it is yours to make, not theirs.",
  ],
  modelAnswer:
    "As discussed: B1/B2, you fly on the 20th, we file this week. I need your DS-160 if you have already started one. I will check back Thursday.",
  annotations: [
    "Four parts, in order: what was discussed, what you recommended, what happens next, and one thing for them to do.",
    "Sent inside two minutes. At two minutes you are the person they were just speaking to; at two hours you are a notification.",
    "The one ask is specific and small — the DS-160 if it exists — rather than “let me know”.",
    "It names when you will be back, so the next touch is expected rather than an interruption.",
    "It is short enough to forward to the wife without editing, which is the actual next conversation.",
  ],
};
