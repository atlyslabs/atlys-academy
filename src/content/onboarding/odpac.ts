import type { DayId, ExerciseKey } from "./types";

/**
 * ODPAC — the daily shadowing report.
 *
 * Every day of the academy, a joinee shadows two to three live chats and then
 * files one ODPAC report on what they saw. It is a required activity alongside
 * the day's quiz, and unlike the quiz it is not auto-graded: a mentor reads it.
 *
 * The five stages are a lens for watching a conversation, not a script for
 * having one. The point of writing it up daily is that the same five headings
 * applied to twenty different chats is how a new joiner starts noticing pattern
 * rather than incident.
 *
 * Storage: one submission per day under `dayN.odpac`, holding all five sections
 * as labelled text. One key rather than five because the existing exercise store
 * takes a single string body per key, and because the admin desk and the daily
 * Slack report both already render exercise bodies verbatim — so a labelled blob
 * arrives readable in both places with no plumbing added.
 */

export type OdpacStageId =
  | "opening"
  | "development"
  | "paraphrasing"
  | "authentication"
  | "closing";

export interface OdpacStage {
  id: OdpacStageId;
  /** The letter it contributes to the acronym. */
  letter: string;
  label: string;
  /** What the stage actually is, in one line. */
  whatItIs: string;
  /** What to watch for while shadowing — the observable behaviours. */
  watchFor: string;
  /** The question the joinee answers in their report. */
  prompt: string;
  /**
   * A worked answer at the right altitude. Shown next to the box, because
   * "write what you observed" produces one-line answers until someone has seen
   * what a useful one looks like.
   */
  example: string;
}

export const ODPAC_STAGES: readonly OdpacStage[] = [
  {
    id: "opening",
    letter: "O",
    label: "Opening",
    whatItIs:
      "The first fifteen seconds, and what they tell the guest about who they are dealing with.",
    watchFor:
      "Was the standard greeting used in full? Did the agent give their name, and use the guest's? Did it open a conversation or start a transaction?",
    prompt:
      "Write what the agent actually said to open, and what happened to the guest's tone in the reply.",
    example:
      "Opened with the full time-based greeting and gave her name. The guest had typed in caps and dropped it by the second message. She used the guest's name twice in the first minute.",
  },
  {
    id: "development",
    letter: "D",
    label: "Development",
    whatItIs:
      "Where the need gets uncovered. Questions, before any recommendation.",
    watchFor:
      "Which of the six qualification fields actually got asked — travel date, nationality and residence, destination and visa type, prior rejections, funds, who is travelling? Did anything get recommended before they were answered?",
    prompt:
      "List the questions asked, in order, and what came out that pitching first would have missed.",
    example:
      "Travel date first (18 Nov, so five weeks), then destination, then prior rejections. The rejection question surfaced a Schengen refusal in 2023 the guest had not mentioned — that changed the whole recommendation. Funds and who-is-travelling never got asked.",
  },
  {
    id: "paraphrasing",
    letter: "P",
    label: "Paraphrasing",
    whatItIs:
      "Playing the situation back, so both sides know it landed before anyone solves anything.",
    watchFor:
      "Did the agent restate the problem in their own words? Did the guest correct them, and what did the correction reveal? A paraphrase that gets corrected is the one that earned its place.",
    prompt:
      "Quote or paraphrase the play-back, and say what changed in the conversation after it.",
    example:
      "“So the trip is fixed for the 18th, and what is worrying you is losing the flights rather than the fee — have I got that right?” The guest said no, actually the leave was the problem, which moved the whole conversation off price.",
  },
  {
    id: "authentication",
    letter: "A",
    label: "Authentication",
    whatItIs:
      "Backing what you say with something checkable — including the money. Every number a guest hears should be broken down, not rounded off.",
    watchFor:
      "The payment breakup above all: was the total split into the Atlys service fee and the government or consulate fee, so the guest knows what goes where? Was the refund position stated precisely — service fee back under AtlysProtect, government fee gone — rather than as “you're covered”? Then the rest: was anything looked up in Cadence before it was stated? Were claims specific and verifiable, or reassuring and vague? Was anything promised that the agent does not control?",
    prompt:
      "Write the payment breakup exactly as the guest heard it — what each part of the money was for. Then note anything else stated as fact, and how it was backed.",
    example:
      "Payment breakup: quoted ₹X total, then split it — government fee ₹Y straight to the consulate, Atlys service fee ₹Z for the slot search, the form review and support. Said plainly that on a refusal the service fee comes back under AtlysProtect and the government fee does not. Checked the timeline on the country page before quoting it, and opened Cadence to confirm the guest's earlier application rather than trusting their memory.",
  },
  {
    id: "closing",
    letter: "C",
    label: "Closing",
    whatItIs:
      "Leaving the guest with no ambiguity about what happens next, and who owns it.",
    watchFor:
      "Was there a recap of what was discussed and what happens next? Did every commitment carry a specific time? Was “anything else I can help you with?” asked? Was the sign-off read against the guest's tone, or delivered on autopilot?",
    prompt:
      "Write how it ended, and exactly what the guest would say if you asked them what happens next.",
    example:
      "Recapped the route, the date and the fee, then committed to sending the checklist by 3 PM today. Asked if there was anything else. The guest was still tense so she skipped “have a wonderful day” and closed neutrally. If asked, the guest would say: checklist by 3, file by Friday.",
  },
];

/** How many live chats to shadow before filing the day's report. */
export const ODPAC_SHADOW_TARGET = "2–3 live chats";

/**
 * Why the report is mandatory rather than encouraged. Shown above the form —
 * the honest reason works better than calling it best practice.
 */
export const ODPAC_WHY =
  "Shadowing without writing it up is watching television. Write what you actually saw and heard, not what should have happened: quote the words where you can, and “the agent skipped this entirely” is a legitimate and useful answer. Your mentor reads it — nothing here is machine-scored.";

/** Stable key for one day's report. Persisted — never renamed in place. */
export function odpacExerciseKey(dayId: DayId): ExerciseKey {
  return `day${dayId}.odpac`;
}

/** True when every stage has something written in it. */
export function isOdpacComplete(
  sections: Partial<Record<OdpacStageId, string>>,
): boolean {
  return ODPAC_STAGES.every((stage) => (sections[stage.id] ?? "").trim() !== "");
}

/**
 * Compose the five sections into the single stored body.
 *
 * Labelled with the stage name so the admin desk and the Slack report stay
 * readable without either of them needing to know ODPAC exists.
 */
export function composeOdpacBody(
  sections: Partial<Record<OdpacStageId, string>>,
): string {
  return ODPAC_STAGES.map(
    (stage) => `${stage.label}: ${(sections[stage.id] ?? "").trim()}`,
  ).join("\n\n");
}

/**
 * Split a stored body back into sections, so a joinee can reopen and edit.
 *
 * Tolerant by design: anything that does not parse cleanly comes back under
 * `opening` rather than being silently dropped, because losing someone's
 * written work to a parser is worse than showing it in the wrong box.
 */
export function parseOdpacBody(
  body: string,
): Partial<Record<OdpacStageId, string>> {
  const byLabel = new Map(
    ODPAC_STAGES.map((stage) => [stage.label, stage.id] as const),
  );
  // Anchored to the start of a line, because `composeOdpacBody` always writes a
  // label at the start of a block. Matching a bare "Closing:" anywhere would
  // truncate a joinee's own sentence — "the agent skipped Closing: entirely"
  // silently lost everything after the colon before this was anchored.
  const pattern = new RegExp(
    `^(${ODPAC_STAGES.map((stage) => stage.label).join("|")}):`,
    "gm",
  );

  const marks: { id: OdpacStageId; from: number; to: number }[] = [];
  for (const match of body.matchAll(pattern)) {
    const id = byLabel.get(match[1]);
    if (id !== undefined && match.index !== undefined) {
      marks.push({ id, from: match.index, to: match.index + match[0].length });
    }
  }

  // No labels at all: hand the whole thing back rather than dropping it.
  if (marks.length === 0) return { opening: body };

  const out: Partial<Record<OdpacStageId, string>> = {};
  marks.forEach((mark, index) => {
    const stop = index + 1 < marks.length ? marks[index + 1].from : body.length;
    out[mark.id] = body.slice(mark.to, stop).trim();
  });
  return out;
}
