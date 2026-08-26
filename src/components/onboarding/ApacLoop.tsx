"use client";

import { useMemo, useState } from "react";
import {
  APAC_MAX_SCORE,
  APAC_ROUNDS,
  APAC_STEP_LABELS,
} from "@/content/onboarding/apac";
import type {
  ApacOption,
  ApacStep,
  ApacStepId,
  ApacVerdict,
} from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SpeakButton } from "@/components/ui/SpeakButton";
import {
  MAX_DRILL_ATTEMPTS,
  canReplayDrill,
  drillAttemptsLeft,
  drillAttemptsUsed,
  isTerminalDrillStatus,
} from "@/lib/progress/attempts";
import { useProgress } from "@/lib/progress/provider";
import { seededShuffle } from "@/lib/shuffle";
import { cn } from "@/lib/utils";
import { ChatBubble } from "./ChatBubble";
import { DrillSection } from "./DrillSection";

/** One pick at one step, in the order it was made. */
interface Attempt {
  optionId: string;
  verdict: ApacVerdict;
}

/** Every pick in the run, flat across rounds and keyed by `stepKey`. */
type Attempts = Record<string, Attempt[]>;

/**
 * How each verdict is dressed.
 *
 * `wrong-step` is amber rather than coral deliberately, and it is the reason
 * the drill exists: the sentence is right and the slot is wrong, which is a
 * different mistake from a bad answer and has to look like one. Printed in the
 * same red as "Would a small discount help you decide today?", it would teach
 * the joinee that the round's own correct Address line is a bad line.
 */
const VERDICTS: Record<
  ApacVerdict,
  { label: string; ink: string; frame: string }
> = {
  correct: {
    label: "Right step",
    ink: "text-badge-green",
    frame: "border-badge-green/40 bg-badge-green-soft",
  },
  "wrong-step": {
    label: "Right words, wrong step",
    ink: "text-badge-amber",
    frame: "border-badge-amber/40 bg-badge-amber-soft",
  },
  wrong: {
    label: "Wrong move",
    ink: "text-badge-coral",
    frame: "border-badge-coral/40 bg-badge-coral-soft",
  },
};

/** Attempts are stored flat, so the key has to carry the round as well. */
function stepKey(roundId: string, stepId: ApacStepId): string {
  return `${roundId}·${stepId}`;
}

/**
 * Whether a step has been played right - not whether it was played right
 * first time. Wrong picks leave the step open, so this is what the sequencing
 * gate reads.
 */
function playedRight(attempts: Attempt[] | undefined): boolean {
  return Boolean(attempts?.some((attempt) => attempt.verdict === "correct"));
}

function playedCount(attempts: Attempts): number {
  return Object.values(attempts).filter(playedRight).length;
}

/**
 * The score: steps whose *first* pick was correct.
 *
 * Retries are unlimited by design - the drill wants the joinee to arrive at the
 * sequence rather than be graded on a guess - so counting every pick would
 * measure persistence and nothing else. Scoring the first one is the only way
 * the number means anything, which is why the UI says so out loud on every
 * solved step rather than leaving it to be inferred from a total that moves in
 * ways nobody can explain.
 */
function firstPickScore(attempts: Attempts): number {
  return Object.values(attempts).filter((list) => list[0]?.verdict === "correct")
    .length;
}

/**
 * The section chrome, declared once because two different bodies hang off it:
 * the playable rounds, and the recorded-result panel a returning joinee is
 * handed instead. A second copy of the heading would be free to drift from
 * this one, and it has to read as the same drill either way.
 */
const SECTION = {
  eyebrow: "Drill · sequence",
  title: "APAC, in order",
  description:
    "Acknowledge, Probe, Address, Confirm — and the order is the framework. Each slot opens only once the one above it has been played, so there is no skipping the step you are confident about. You are scored on your first pick in each step; a wrong pick tells you why and leaves the step open.",
} as const;

/**
 * APAC as a loop you run, not four letters you can name (lesson 2.6).
 *
 * Two rounds, one at a time - the first runs all four slots, the second picks
 * the call up with Acknowledge already sent (`round.opening`) and runs the
 * remaining three. Step N + 1 does not open until step N is played right, and
 * that gate is the whole drill: "the order carries the value. Address on its
 * own is a good answer to a question nobody asked, and Probe without
 * Acknowledge sounds like an interrogation." A joinee could always name the
 * four letters in the quiz; nothing until now made them sequence the four.
 *
 * A wrong pick never advances. It prints its coaching line and leaves the step
 * open, because arriving at the right sequence is the point - the first pick is
 * what gets scored, and the rest is teaching.
 */
export function ApacLoop() {
  const { state, ready, setDrillResult, beginDrillAttempt } = useProgress();
  const [roundIndex, setRoundIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempts>({});
  /** Seeds the option shuffle; bumped on a restart so a rerun is not memory. */
  const [seed, setSeed] = useState(0);
  /**
   * The last pick, written out for the status region.
   *
   * Held as the finished sentence rather than as the pick itself, because the
   * guest's reply and the round's lesson land in the same breath as the
   * verdict, and a reader who hears only "Right step" has been told the least
   * useful half of it.
   */
  const [announcement, setAnnouncement] = useState("");
  /**
   * Set when a play is spent on a rerun, and never cleared.
   *
   * Stored progress is what decides whether a returning joinee gets a deck or
   * the record of their last run, and a rerun leaves that stored result final
   * for as long as it takes to finish - so without this flag the panel would
   * drop straight back over the deck the joinee just paid for.
   */
  const [replaying, setReplaying] = useState(false);

  const stored = state.drills["apac-loop"];
  // Read from stored progress rather than from `seed`, which counts reshuffles
  // in this session only: the cap is on plays of the drill across the whole
  // academy, so a joinee who comes back tomorrow has to find the same count
  // waiting for them.
  const playsUsed = drillAttemptsUsed(state, "apac-loop");
  const playsLeft = drillAttemptsLeft(state, "apac-loop");
  const round = APAC_ROUNDS[roundIndex];
  const lastRound = roundIndex === APAC_ROUNDS.length - 1;
  const score = firstPickScore(attempts);

  // The open step is the first one not yet played right; everything below it is
  // locked. -1 once the round is closed.
  const openIndex = round.steps.findIndex(
    (step) => !playedRight(attempts[stepKey(round.id, step.id)]),
  );
  const roundDone = openIndex === -1;
  // Rounds only move forward, so a closed last round is a closed drill.
  const allDone = roundDone && lastRound;

  /**
   * Show the record instead of a playable deck.
   *
   * Everything else in this file decides "is the drill finished" from local
   * state, and local state is empty after a reload - so a joinee could finish
   * the loop, press F5, and be dealt a whole new run without the replay button
   * ever charging one of their three plays. The cap only means anything if it
   * is enforced against what is stored.
   *
   * Gated on `ready` because `state.drills` is empty until the store has been
   * read: before that this is false and the drill stays playable, which is the
   * right default and also why it must never yank a deck away once hydration
   * lands. `allDone` is what keeps that promise for someone who has finished
   * in this session - they keep their own closing card, with their picks and
   * both round lessons on it, rather than a summary of the run they just did.
   */
  const storedStatus = stored?.status;
  // The local counterweight is "has this joinee touched the deck in THIS
  // session", not "have they finished it". That distinction is the whole
  // correctness of this guard. `ready` starts false and, in remote mode,
  // `store.load()` is a network round-trip - so a joinee can mount, start
  // playing, and only then have hydration land. If the counterweight were the
  // finished signal, that half-played run would be replaced by the recorded
  // panel mid-play and continuing would cost them a play. Untouched is the only
  // state it is safe to lock.
  const lockedToStoredResult =
    ready &&
    !replaying &&
    isTerminalDrillStatus(storedStatus) &&
    !allDone &&
    Object.keys(attempts).length === 0;

  // Declared rather than inlined because both bodies wear the same badge: the
  // recorded panel is reporting the very number this stamps.
  const statusBadge =
    stored?.score !== undefined ? (
      <Badge tone={stored.score === stored.maxScore ? "green" : "amber"}>
        {stored.score}/{stored.maxScore} first-pick
      </Badge>
    ) : null;

  function pick(step: ApacStep, option: ApacOption) {
    const key = stepKey(round.id, step.id);
    const list = attempts[key] ?? [];
    // Spent options stay mounted as `aria-disabled` buttons rather than being
    // swapped for plain text, so the pick that spends one does not throw a
    // keyboard user back to the top of the page. The click still arrives,
    // which is what this guard is for.
    if (
      playedRight(list) ||
      list.some((attempt) => attempt.optionId === option.id)
    ) {
      return;
    }

    const next: Attempts = {
      ...attempts,
      [key]: [...list, { optionId: option.id, verdict: option.verdict }],
    };
    setAttempts(next);

    // Never write "in-progress" over a finished run. A rerun's first pick would
    // otherwise demote a complete 7/7 back to in-progress, and both
    // `points.ts` and `stamps.ts` key off that status - so pressing the drill's
    // own "run it again" button took 25 points and the Sequenced stamp back off
    // the joinee mid-session. `SwipeDeck` and `OwnershipSort` sidestep this by
    // only writing on the last card; this drill writes on every pick so the
    // score survives a half-finished run, so it needs the guard instead.
    const finished = playedCount(next) === APAC_MAX_SCORE;
    if (finished || stored?.status !== "complete") {
      setDrillResult("apac-loop", {
        status: finished ? "complete" : "in-progress",
        score: firstPickScore(next),
        maxScore: APAC_MAX_SCORE,
      });
    }

    const closed = round.steps.every((item) =>
      playedRight(next[stepKey(round.id, item.id)]),
    );
    setAnnouncement(
      [
        `${VERDICTS[option.verdict].label}.`,
        option.because,
        option.verdict === "correct" && step.reveal
          ? `The guest answers: ${step.reveal}`
          : "",
        closed ? `Round closed. ${round.lesson}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  function nextRound() {
    setRoundIndex(roundIndex + 1);
    setAnnouncement("");
  }

  /**
   * Reshuffle and start over. A finished run stays recorded for the whole
   * rerun: `pick` refuses to write anything but another finished run over a
   * `complete` result, so the rerun can only replace it once it finishes too.
   */
  function restart() {
    // Spend the play before anything local moves, so the count and the board
    // can never disagree about what is being replayed. Called unconditionally
    // on purpose: the reducer only charges an attempt when the stored status is
    // already terminal, so a mid-play reshuffle stays free and the rule lives
    // in one place instead of in every drill.
    beginDrillAttempt("apac-loop");
    // The play is paid for, so stored progress has to stop deciding what is on
    // screen: the result it holds stays terminal until this rerun finishes, and
    // that is exactly what `lockedToStoredResult` reads.
    setReplaying(true);
    setSeed(seed + 1);
    setRoundIndex(0);
    setAttempts({});
    setAnnouncement("");
  }

  // A joinee coming back to a finished drill reads what they scored; the deck
  // is behind the replay control, because that control is what spends a play.
  // Deliberately short - the rounds themselves are the teaching, and reprinting
  // them here would make a reload look like a run.
  if (lockedToStoredResult) {
    return (
      <DrillSection {...SECTION} status={statusBadge}>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Already played · recorded result
        </p>
        <p className="mt-2 max-w-[60ch] font-display text-[20px] italic leading-tight text-ink">
          {stored?.score !== undefined && stored.maxScore !== undefined
            ? `${stored.score} of ${stored.maxScore} steps played right on the first pick.`
            : `Recorded as ${storedStatus}.`}
        </p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim tabular-nums">
          {playsUsed} of {MAX_DRILL_ATTEMPTS} plays used
        </p>
        {/* Same reversal as the closing card makes: out of plays, out of
            button, with the reason in its place. */}
        {canReplayDrill(state, "apac-loop") ? (
          <Button
            className="mt-4"
            variant="secondary"
            size="sm"
            onClick={restart}
          >
            Reshuffle and run it again
          </Button>
        ) : (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            All {MAX_DRILL_ATTEMPTS} plays used · the recorded score stands
          </p>
        )}
      </DrillSection>
    );
  }

  return (
    <DrillSection {...SECTION} status={statusBadge}>
      {/* Mounted for the whole drill so every pick lands in the same region.
          Carries the reason as well as the verdict - the reason is the drill. */}
      <p className="sr-only" role="status">
        {announcement}
      </p>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted tabular-nums">
          Round {roundIndex + 1} of {APAC_ROUNDS.length}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim tabular-nums">
          {score}/{APAC_MAX_SCORE} steps played right first time
        </p>
      </div>

      {/* Keyed by round: the rounds share step ids, so without this the
          slots of the next round reconcile onto the ones just closed and
          inherit whatever the old subtree was holding. */}
      <div
        key={round.id}
        className="mt-3 rounded-xl border border-hairline bg-white/[0.02] p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text">
            {round.label}
          </p>
          {roundDone && <Badge tone="green">Round closed</Badge>}
        </div>
        <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
          {round.context}
        </p>

        <div className="mt-5 flex items-end gap-1">
          <ChatBubble from="customer">{round.objection}</ChatBubble>
          <SpeakButton text={round.objection} />
        </div>

        {/* A line already sent when the round picks the conversation up. The
            note says the step is done, so a three-slot round reads as a
            conversation joined one line in, never as a step gone optional. */}
        {round.opening && (
          <div className="mt-3">
            <ChatBubble from="agent">{round.opening.text}</ChatBubble>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              {round.opening.note}
            </p>
          </div>
        )}

        <ol className="mt-6 space-y-3">
          {round.steps.map((step, index) => {
            const previous = index > 0 ? round.steps[index - 1] : undefined;

            return (
              <li key={step.id}>
                <StepSlot
                  step={step}
                  index={index}
                  attempts={attempts[stepKey(round.id, step.id)]}
                  locked={!roundDone && index > openIndex}
                  // Unique per run, round and step, so no two slots deal the
                  // same order and a restart deals a different hand. Wide
                  // spacing rather than summed step counts: rounds no longer
                  // have equal lengths, and the old arithmetic could deal two
                  // different slots the same hand.
                  seed={seed * 1000 + roundIndex * 100 + index}
                  previousLabel={
                    previous ? APAC_STEP_LABELS[previous.id] : undefined
                  }
                  // Only read by an unlocked slot, and a slot is unlocked only
                  // once the step above it has been played - so by the time
                  // this is on screen the reveal has already appeared.
                  previousReveal={previous?.reveal}
                  onPick={(option) => pick(step, option)}
                />
              </li>
            );
          })}
        </ol>
      </div>

      {roundDone && !allDone && (
        <div className="animate-rise-in mt-4 rounded-xl border border-brand-text/40 bg-accent-soft p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text">
            What that round was teaching
          </p>
          <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-ink-secondary">
            {round.lesson}
          </p>
          <Button className="mt-4" size="sm" onClick={nextRound}>
            Next round
          </Button>
        </div>
      )}

      {/* The closing card reprints both lessons rather than just the last
          one: the rounds unmount as you move through them, and they read as
          one argument only when they are next to each other. */}
      {allDone && (
        <div className="animate-rise-in mt-4">
          <p className="max-w-[60ch] font-display text-[20px] italic leading-tight text-ink">
            Two objections run in order. {score} of {APAC_MAX_SCORE} steps
            played right on the first pick.
          </p>
          <ul className="mt-4 space-y-3">
            {APAC_ROUNDS.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-hairline bg-white/[0.02] p-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text">
                  {item.label}
                </p>
                <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-ink-secondary">
                  {item.lesson}
                </p>
              </li>
            ))}
          </ul>
          {/* Out of plays, out of button. A permanently dead "run it again"
              would read as something broken rather than as a rule, so the
              control is removed and the reason takes its place - the same
              reversal `MentorPanel` made for its ID-less entries. */}
          {canReplayDrill(state, "apac-loop") ? (
            <Button
              className="mt-4"
              variant="secondary"
              size="sm"
              onClick={restart}
            >
              Reshuffle and run it again
              {/* Only once a play is on the record: before that the count is
                  the cap, and printing "3 left" next to a first run reads as a
                  warning about a limit nobody has approached. */}
              {playsUsed > 0 && (
                <span className="ml-1 font-mono text-[11px] tracking-[0.08em] opacity-70 tabular-nums">
                  {playsLeft} left
                </span>
              )}
            </Button>
          ) : (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              All {MAX_DRILL_ATTEMPTS} plays used · the recorded score stands
            </p>
          )}
        </div>
      )}
    </DrillSection>
  );
}

/**
 * One of the four slots.
 *
 * Locked slots still print their label. The joinee should see the shape of the
 * loop from the first screen - four steps, in this order - rather than
 * discovering it a step at a time.
 */
function StepSlot({
  step,
  index,
  attempts = [],
  locked,
  seed,
  previousLabel,
  previousReveal,
  onPick,
}: {
  step: ApacStep;
  index: number;
  attempts?: Attempt[];
  locked: boolean;
  seed: number;
  previousLabel?: string;
  /** The guest's reply to the step above, where that step had one. */
  previousReveal?: string;
  onPick: (option: ApacOption) => void;
}) {
  // Seeded rather than random: the options are shuffled during render on both
  // the server and the client, and every step in the content file happens to
  // list its correct option first, so leaving them in file order would make
  // the drill a memory game about position.
  const options = useMemo(
    () => seededShuffle(step.options, seed),
    [step.options, seed],
  );

  const label = APAC_STEP_LABELS[step.id];
  const played = playedRight(attempts);
  const firstPick = attempts[0]?.verdict === "correct";

  const heading = (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim tabular-nums">
        Step {index + 1}
      </span>
      <span
        className={cn(
          "font-display text-[17px] italic leading-tight",
          locked ? "text-ink-dim" : "text-ink",
        )}
      >
        {label}
      </span>
    </div>
  );

  if (locked) {
    return (
      <div className="rounded-xl border border-dashed border-hairline p-4">
        {heading}
        <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">
          Opens once {previousLabel} is played.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        {heading}
        {/* The badge is where first-pick scoring is made visible: a step solved
            on the third go says so, next to the step it was scored on. */}
        {played ? (
          firstPick ? (
            <Badge tone="green">First pick</Badge>
          ) : (
            <Badge tone="amber">Played on pick {attempts.length}</Badge>
          )
        ) : (
          <Badge tone="teal">Your move</Badge>
        )}
      </div>

      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
        {step.brief}
      </p>

      {previousReveal && (
        <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-brand-text">
          Answer what the guest just said, not the objection they opened with.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {options.map((option) => {
          const attempt = attempts.find((item) => item.optionId === option.id);
          // Picked, or the step moved on without it - either way the option is
          // no longer live and its coaching opens. Opening the unpicked ones
          // once the step is played is deliberate: the `wrong-step` trap is
          // the lesson of the whole drill, and a joinee who gets Acknowledge
          // right first time would otherwise never be shown it.
          const spent = Boolean(attempt) || played;
          const verdict = VERDICTS[option.verdict];
          // An unpicked correct option only exists where a step has two of
          // them - the Probe that is a question or a ten-second silence.
          const verdictLabel =
            !attempt && option.verdict === "correct"
              ? "Also right"
              : verdict.label;

          return (
            <li
              key={option.id}
              className={cn(
                "rounded-lg border transition-colors duration-150",
                spent
                  ? verdict.frame
                  : "border-hairline bg-white/[0.02] hover:border-hairline-lit hover:bg-white/[0.04]",
              )}
            >
              <button
                type="button"
                // `aria-disabled` rather than `disabled`: a spent option keeps
                // its place in the tab order, so nothing under the reading
                // finger disappears at the moment of the pick. `onPick`
                // ignores the click.
                aria-disabled={spent || undefined}
                // Three long sentences are indistinguishable in a screen
                // reader's button list without the slot they belong to.
                aria-label={`${label} option: ${option.text}`}
                onClick={() => onPick(option)}
                className={cn(
                  "block w-full rounded-lg p-3.5 text-left text-sm leading-relaxed",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text",
                  spent ? "cursor-default text-ink-muted" : "text-ink",
                )}
              >
                {option.text}
              </button>

              {spent && (
                <div className="animate-rise-in border-t border-dashed border-hairline-lit px-3.5 pt-3 pb-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p
                      className={cn(
                        "font-mono text-[11px] uppercase tracking-[0.12em]",
                        verdict.ink,
                      )}
                    >
                      {verdictLabel}
                    </p>
                    {attempt && (
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim">
                        You picked this
                      </p>
                    )}
                  </div>
                  <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-ink-secondary">
                    {option.because}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* The guest's reply to a played Probe. Framed as loudly as the drill
          allows and set between the two steps, because the Address options
          below are written against this line - one of them is the textbook
          answer to the objection the guest opened with, which this sentence
          has just made wrong. A joinee who scrolls past it can still pick
          correctly, but not for the right reason. */}
      {played && step.reveal && (
        <div className="animate-rise-in mt-4 rounded-xl border border-brand-text/40 bg-accent-soft p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text">
            What {label} surfaced
          </p>
          <div className="mt-3 flex items-end gap-1">
            <ChatBubble from="customer">{step.reveal}</ChatBubble>
            <SpeakButton text={step.reveal} />
          </div>
          <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-ink-secondary">
            That is the conversation you are actually in. The next step answers
            this, and the right answer to the objection they opened with is now
            the wrong pick.
          </p>
        </div>
      )}
    </div>
  );
}
