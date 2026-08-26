"use client";

import { useEffect, useState } from "react";
import { MOCK_SCENARIOS } from "@/content/onboarding/drills";
import type {
  DrillId,
  MockScenario,
  ScenarioReply,
} from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { JoineeAvatar } from "@/components/ui/JoineeAvatar";
import { PixelDialogue } from "@/components/ui/PixelDialogue";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { defaultAvatar } from "@/lib/avatar";
import {
  MAX_DRILL_ATTEMPTS,
  canReplayDrill,
  drillAttemptsUsed,
  isTerminalDrillStatus,
} from "@/lib/progress/attempts";
import { useProgress } from "@/lib/progress/provider";
import type { AvatarConfig } from "@/lib/progress/types";
import { cn } from "@/lib/utils";
import { DrillSection } from "./DrillSection";

/** Which reply the joinee picked in each scenario, keyed by scenario id. */
type Choices = Record<string, string>;

/** A face and a name for one guest. */
export interface ScenarioGuest {
  name: string;
  avatar: AvatarConfig;
}

/**
 * Everything that differs between the two branching drills.
 *
 * Day 2 and Day 3 run the identical interaction - read the situation, pick a
 * reply, hear what the guest says back - so the second one is this component
 * again with different content rather than a copy of it. Only the content, the
 * framing and the wording of the two outcomes are configurable; the interaction
 * is not.
 */
export interface ScenarioBranchConfig {
  /** Where the result is stored, and the id the registry mounts this under. */
  drillId: DrillId;
  scenarios: readonly MockScenario[];
  eyebrow: string;
  title: string;
  description: string;
  /** Name and face per scenario id. An unmapped id degrades, never throws. */
  guests: Record<string, ScenarioGuest>;
  /**
   * What a closing reply is called in the running line. Day 2 closes
   * objections; Day 3 has no objection in it, so the noun cannot be hardcoded
   * without one of the two drills miscounting in words.
   */
  countLabel: string;
  /**
   * The same noun, shortened for the status stamp. Separate from `countLabel`
   * because the stamp is mono, uppercased and letter-spaced in a flex-wrap
   * header slot: "2/4 OBJECTIONS CLOSED" wraps where "2/4 CLOSED" does not.
   */
  badgeLabel: string;
  /** The line printed over the coaching note, per outcome. */
  verdicts: Record<ScenarioReply["outcome"], string>;
  /**
   * Scenario that shows the sixty-second read-out, if the set has one. Keyed by
   * id rather than a flag on the scenario because it is a presentational
   * decision about one card and the content module stays out of it.
   */
  timedScenarioId?: string;
}

/**
 * A face and a name for each Day 2 guest, keyed by scenario id.
 *
 * The content module carries no guest identity - the names here are read off
 * each scenario's label, so this stays presentation and the source of truth for
 * the drill itself never moves.
 */
const MOCK_SCENARIO_GUESTS: Record<string, ScenarioGuest> = {
  "scenario.price_objection": {
    name: "The price-checker",
    avatar: { color: 4, face: 3, hat: 2 },
  },
  "scenario.timeline_anxiety": {
    name: "The clock-watcher",
    avatar: { color: 0, face: 5, hat: 5 },
  },
  "scenario.rejection_fear": {
    name: "The once-refused",
    avatar: { color: 2, face: 7, hat: 0 },
  },
  "scenario.competitor_comparison": {
    name: "The comparison-shopper",
    avatar: { color: 3, face: 6, hat: 1 },
  },
};

const MOCK_SCENARIO_CONFIG: ScenarioBranchConfig = {
  drillId: "mock-scenarios",
  scenarios: MOCK_SCENARIOS,
  eyebrow: "Drill · role-play",
  title: "Four conversations you will have",
  description:
    "Pick the reply you would actually send. You will hear what the guest says back.",
  guests: MOCK_SCENARIO_GUESTS,
  countLabel: "objections closed",
  badgeLabel: "closed",
  verdicts: {
    closes: "This closes the objection",
    deepens: "This deepens the concern",
  },
};

/** Pips on the guest's patience meter. */
const PATIENCE_MAX = 5;

/** Seconds lesson 3.8 allows on the airport call: "Do not hold them for more
 *  than 60 seconds." */
const HOLD_LIMIT_SECONDS = 60;

/**
 * Day 5 mock scenarios (PRD §7.5 - the journey was still five days when the
 * PRD was written; they run on Day 2 now).
 *
 * Every scenario has one reply that closes the objection and one or two that
 * deepen it. Picking a wrong one is the point - the customer's answer shows you
 * why it was wrong more convincingly than a rule would.
 */
export function ScenarioBranch() {
  return <ScenarioBranchDrill config={MOCK_SCENARIO_CONFIG} />;
}

export function ScenarioBranchDrill({
  config,
}: {
  config: ScenarioBranchConfig;
}) {
  const { scenarios } = config;
  const { state, ready, setDrillResult, beginDrillAttempt } = useProgress();
  const [choices, setChoices] = useState<Choices>({});
  /**
   * Set once a pass has been asked for, and never cleared again.
   *
   * Without it a reload was a free replay: the deck the joinee sees is built
   * from `choices`, which starts empty on every mount, so a finished drill came
   * back fully playable and the three-play cap could be walked past with F5
   * instead of with the replay control that spends a play. Once this is true the
   * joinee is inside a pass they have paid for, so nothing may take the deck
   * back off them.
   */
  const [replaying, setReplaying] = useState(false);

  const stored = state.drills[config.drillId];
  const closed = countClosed(scenarios, choices);
  const answeredHere = Object.keys(choices).length;
  const playsUsed = drillAttemptsUsed(state, config.drillId);

  /**
   * The stored result stands and the deck is withheld until a play is spent.
   *
   * Gated on `ready` because `state.drills` is empty until the store has been
   * read, and a guard that trusted that emptiness would flash a recorded-result
   * panel over every first visit. The last clause is what keeps a joinee who
   * just finished the set in front of their own answers: the whole point of the
   * closing screens is the guest's reply to the reply they picked, and swapping
   * that for a summary the moment hydration lands would take it away.
   */
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
    isTerminalDrillStatus(stored?.status) &&
    answeredHere === 0;

  function choose(scenario: MockScenario, reply: ScenarioReply) {
    const next = { ...choices, [scenario.id]: reply.id };
    setChoices(next);

    const attempted = Object.keys(next).length;

    setDrillResult(config.drillId, {
      status: attempted === scenarios.length ? "complete" : "in-progress",
      score: countClosed(scenarios, next),
      maxScore: scenarios.length,
    });
  }

  function reset(scenarioId: string) {
    const next = { ...choices };
    delete next[scenarioId];
    setChoices(next);
    // Dropping one reply puts the set back under its full count while the
    // stored status is still `complete`, which is exactly the shape the guard
    // above reads as a returning visitor - so without this the joinee's own
    // retry would replace the scenario they just reopened with the summary
    // panel. This is the same pass they are already inside; it costs nothing.
    setReplaying(true);
  }

  /**
   * Take another pass over the whole set, at the price of one of the three
   * plays.
   *
   * `beginDrillAttempt` first, so the count the panel reads is already the new
   * one, and unconditional on purpose: the reducer charges a play only when the
   * stored status is terminal, which is the only state this control is rendered
   * in anyway. The recorded result stays on the board until the new pass writes
   * over it, so walking away mid-pass loses the play but not the score.
   */
  function replay() {
    beginDrillAttempt(config.drillId);
    setReplaying(true);
    // Nothing reachable leaves a half-answered set behind the locked panel, but
    // a pass that says it starts over has to start over.
    setChoices({});
  }

  return (
    <DrillSection
      eyebrow={config.eyebrow}
      title={config.title}
      description={config.description}
      status={
        stored?.score !== undefined ? (
          <Badge tone={stored.score === scenarios.length ? "green" : "amber"}>
            {stored.score}/{stored.maxScore} {config.badgeLabel}
          </Badge>
        ) : null
      }
    >
      {lockedToStoredResult ? (
        // The running count and the deck both read off local state, which knows
        // nothing about the pass that is already on the record - so both are
        // withheld and what was actually scored is printed instead.
        <div className="rounded-[3px] border-2 border-ink/20 bg-surface-soft p-5 shadow-[3px_3px_0_0_rgba(20,20,26,0.12)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            Already played
          </p>
          <p className="mt-1.5 text-sm text-ink-secondary">
            {stored?.score !== undefined
              ? `${stored.score} of ${stored.maxScore ?? scenarios.length} ${config.countLabel} on the recorded pass.`
              : `Recorded as ${stored?.status}.`}
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            plays · {playsUsed} of {MAX_DRILL_ATTEMPTS}
          </p>

          {/* Out of plays, out of button: a control that can only refuse reads
              as something broken rather than as a rule, so the reason takes its
              place - the same reversal the other capped drills made. */}
          {canReplayDrill(state, config.drillId) ? (
            <Button
              className="mt-4"
              variant="secondary"
              size="sm"
              onClick={replay}
            >
              Play the set again
            </Button>
          ) : (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              All {MAX_DRILL_ATTEMPTS} plays used · the recorded result stands
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="mb-5 text-sm text-ink-muted">
            {closed} of {scenarios.length} {config.countLabel} so far.
          </p>

          <ol className="space-y-6">
            {scenarios.map((scenario) => (
              <li key={scenario.id}>
                <Scenario
                  scenario={scenario}
                  guest={resolveGuest(config.guests, scenario)}
                  verdicts={config.verdicts}
                  timed={scenario.id === config.timedScenarioId}
                  chosenReplyId={choices[scenario.id]}
                  joineeAvatar={state.avatar}
                  onChoose={(reply) => choose(scenario, reply)}
                  onReset={() => reset(scenario.id)}
                />
              </li>
            ))}
          </ol>
        </>
      )}
    </DrillSection>
  );
}

/**
 * How many scenarios have a chosen reply that closes.
 *
 * Read twice on every pick - once for the line above the list, once for the
 * score that gets stored - so the filter lives in one place instead of being
 * written out twice with the two copies free to drift.
 */
function countClosed(scenarios: readonly MockScenario[], choices: Choices) {
  return scenarios.filter((scenario) =>
    scenario.replies.some(
      (reply) => reply.id === choices[scenario.id] && reply.outcome === "closes",
    ),
  ).length;
}

/**
 * The guest for a scenario, or a stand-in when the map has no entry for it.
 *
 * A missing key never threw - both reads were already optional-chained - but
 * the old fallback passed `null` to `JoineeAvatar`, which renders
 * `defaultAvatar("atlys-joinee")`: the same face the joinee wears until they
 * build their own, so an unmapped guest turned up in the conversation wearing
 * the joinee's face. Seeding the default off the scenario id instead keeps the
 * fallback deterministic - identical markup on server and client - and gives
 * each unmapped scenario a face of its own.
 */
function resolveGuest(
  guests: Record<string, ScenarioGuest>,
  scenario: MockScenario,
): ScenarioGuest {
  return (
    guests[scenario.id] ?? {
      name: "Guest",
      avatar: defaultAvatar(scenario.id),
    }
  );
}

function Scenario({
  scenario,
  guest,
  verdicts,
  timed,
  chosenReplyId,
  joineeAvatar,
  onChoose,
  onReset,
}: {
  scenario: MockScenario;
  guest: ScenarioGuest;
  verdicts: Record<ScenarioReply["outcome"], string>;
  /** Show the sixty-second read-out while this scenario is unanswered. */
  timed: boolean;
  chosenReplyId?: string;
  joineeAvatar?: AvatarConfig;
  onChoose: (reply: ScenarioReply) => void;
  onReset: () => void;
}) {
  const chosen = scenario.replies.find((reply) => reply.id === chosenReplyId);
  const verdict = chosen ? verdicts[chosen.outcome] : "";

  // Neutral until they answer; the meter is the guest reacting, so it climbs on
  // a reply that closes and drops to almost nothing on one that deepens.
  const patience = !chosen ? 3 : chosen.outcome === "closes" ? 4 : 1;

  const guestPortrait = <JoineeAvatar config={guest.avatar} size={30} />;

  return (
    <div className="rounded-[3px] border-2 border-ink/20 bg-surface-soft p-5 shadow-[3px_3px_0_0_rgba(20,20,26,0.12)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
          {scenario.label}
        </p>
        {/* Unmounting the read-out is what stops it: picking a reply drops it,
            and the effect's cleanup clears the interval. A reset mounts a fresh
            one, which starts the count again. */}
        {timed && !chosen ? <HoldTimer /> : null}
      </div>
      <p className="mt-1 text-sm text-ink-muted">{scenario.context}</p>

      {/* How the guest took the chosen reply, for readers who never see the
          box appear below the options. */}
      <p aria-live="polite" className="sr-only">
        {chosen
          ? `${guest.name} replies: ${chosen.customerResponse}. ${verdict}.`
          : ""}
      </p>

      <div className="mt-8 space-y-6">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <PixelDialogue
              speaker={guest.name}
              tone="guest"
              portrait={guestPortrait}
              meter={{
                label: "PATIENCE",
                value: patience,
                max: PATIENCE_MAX,
              }}
            >
              {scenario.customerMessage}
            </PixelDialogue>
          </div>
          <SpeakButton text={scenario.customerMessage} />
        </div>
        {chosen && (
          <div className="animate-rise-in">
            <PixelDialogue
              speaker="You"
              tone="you"
              portrait={<JoineeAvatar config={joineeAvatar} size={30} />}
            >
              {chosen.text}
            </PixelDialogue>
          </div>
        )}
      </div>

      {!chosen ? (
        <ul className="mt-6 space-y-2">
          {scenario.replies.map((reply) => (
            <li key={reply.id}>
              <button
                type="button"
                onClick={() => onChoose(reply)}
                className={cn(
                  "w-full rounded-[3px] border-2 border-ink/20 bg-surface p-3.5 text-left text-sm",
                  "shadow-[3px_3px_0_0_rgba(20,20,26,0.12)]",
                  "hover:border-accent/40 hover:bg-accent-soft",
                  // Same press as Button: the card meets the page as it is
                  // picked, so a reply feels chosen rather than merely clicked.
                  "transition-[transform,box-shadow,background-color,border-color] duration-100 ease-out",
                  "motion-reduce:transition-none",
                  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                )}
              >
                {reply.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="animate-rise-in mt-6 space-y-5">
          <PixelDialogue
            speaker={guest.name}
            tone="guest"
            portrait={guestPortrait}
            meter={{ label: "PATIENCE", value: patience, max: PATIENCE_MAX }}
          >
            {chosen.customerResponse}
          </PixelDialogue>

          <div
            className={cn(
              "rounded-[3px] border-2 p-4 text-sm shadow-[3px_3px_0_0_rgba(20,20,26,0.12)]",
              chosen.outcome === "closes"
                ? "border-badge-green/40 bg-badge-green-soft"
                : "border-badge-coral/40 bg-badge-coral-soft",
            )}
          >
            <p
              className={cn(
                "font-mono text-[11px] uppercase tracking-[0.12em]",
                chosen.outcome === "closes"
                  ? "text-badge-green"
                  : "text-badge-coral",
              )}
            >
              {verdict}
            </p>
            <p className="mt-1.5 text-ink-secondary">{chosen.feedback}</p>
          </div>

          <Button variant="secondary" size="sm" onClick={onReset}>
            Try a different reply
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Elapsed time on the one scenario the lesson puts a clock on.
 *
 * It reports, it does not referee: nothing here disables a reply, changes a
 * score or expires the card. The airport case is the only one where the time
 * spent is itself the mistake, so the time spent is the only thing shown.
 *
 * It counts from mount rather than from a first interaction because no moment
 * in this drill maps to picking up the phone, and since nothing is scored on
 * it, starting early costs the joinee nothing.
 */
function HoldTimer() {
  const [seconds, setSeconds] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Read in an effect: `matchMedia` during render would make the server and
  // client markup disagree. Same reason the count starts at zero and is only
  // moved by the interval below - a clock read during render is a hydration
  // mismatch waiting for a slow network.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = (event: MediaQueryList | MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    apply(query);
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    // A figure changing once a second is motion in a corner of the eye, and
    // there is nothing to animate underneath it - so under the preference the
    // limit is stated instead of counted.
    if (reducedMotion) return;

    // Elapsed off a start timestamp rather than a tick tally: a backgrounded
    // tab throttles the interval, and a counter that under-reports the time
    // spent is worse than no counter on this particular card.
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Math.min(
        Math.round((Date.now() - startedAt) / 1000),
        HOLD_LIMIT_SECONDS,
      );
      setSeconds(elapsed);
      // Past the limit there is nothing left to say, so stop rather than sit
      // there re-rendering a frozen number.
      if (elapsed >= HOLD_LIMIT_SECONDS) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const spent = !reducedMotion && seconds >= HOLD_LIMIT_SECONDS;

  return (
    <p
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.12em]",
        spent ? "text-badge-coral" : "text-ink-dim",
      )}
    >
      {/* Announcing a new time every second would bury the scenario under the
          clock, so the figure is hidden and the rule it is measuring against
          is given once, as text. */}
      <span aria-hidden="true">
        on the line · {reducedMotion ? "60s limit" : formatClock(seconds)}
      </span>
      <span className="sr-only">
        This call has a sixty-second limit: the guest should be handed over
        before the minute is up.
      </span>
    </p>
  );
}

/** Seconds as `m:ss`, so 60 reads as the "1:00" the lesson talks about. */
function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
