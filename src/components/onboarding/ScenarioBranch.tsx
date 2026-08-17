"use client";

import { useState } from "react";
import { MOCK_SCENARIOS } from "@/content/onboarding/drills";
import type { MockScenario, ScenarioReply } from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { JoineeAvatar } from "@/components/ui/JoineeAvatar";
import { PixelDialogue } from "@/components/ui/PixelDialogue";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { useProgress } from "@/lib/progress/provider";
import type { AvatarConfig } from "@/lib/progress/types";
import { cn } from "@/lib/utils";
import { DrillSection } from "./DrillSection";

/** Which reply the joinee picked in each scenario, keyed by scenario id. */
type Choices = Record<string, string>;

/**
 * A face and a name for each guest, keyed by scenario id.
 *
 * The content module carries no guest identity - the names here are read off
 * each scenario's label, so this stays presentation and the source of truth for
 * the drill itself never moves. An unmapped scenario falls back to the default
 * face and "Guest".
 */
const GUESTS: Record<string, { name: string; avatar: AvatarConfig }> = {
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

/** Pips on the guest's patience meter. */
const PATIENCE_MAX = 5;

/**
 * Day 5 mock scenarios (PRD §7.5).
 *
 * Every scenario has one reply that closes the objection and one or two that
 * deepen it. Picking a wrong one is the point - the customer's answer shows you
 * why it was wrong more convincingly than a rule would.
 */
export function ScenarioBranch() {
  const { state, setDrillResult } = useProgress();
  const [choices, setChoices] = useState<Choices>({});

  const stored = state.drills["mock-scenarios"];
  const closed = MOCK_SCENARIOS.filter((scenario) =>
    scenario.replies.some(
      (reply) => reply.id === choices[scenario.id] && reply.outcome === "closes",
    ),
  ).length;

  function choose(scenario: MockScenario, reply: ScenarioReply) {
    const next = { ...choices, [scenario.id]: reply.id };
    setChoices(next);

    const attempted = Object.keys(next).length;
    const closedCount = MOCK_SCENARIOS.filter((item) =>
      item.replies.some(
        (candidate) =>
          candidate.id === next[item.id] && candidate.outcome === "closes",
      ),
    ).length;

    setDrillResult("mock-scenarios", {
      status:
        attempted === MOCK_SCENARIOS.length ? "complete" : "in-progress",
      score: closedCount,
      maxScore: MOCK_SCENARIOS.length,
    });
  }

  function reset(scenarioId: string) {
    const next = { ...choices };
    delete next[scenarioId];
    setChoices(next);
  }

  return (
    <DrillSection
      eyebrow="Drill · role-play"
      title="Four conversations you will have"
      description="Pick the reply you would actually send. You will hear what the guest says back."
      status={
        stored?.score !== undefined ? (
          <Badge tone={stored.score === MOCK_SCENARIOS.length ? "green" : "amber"}>
            {stored.score}/{stored.maxScore} closed
          </Badge>
        ) : null
      }
    >
      <p className="mb-5 text-sm text-ink-muted">
        {closed} of {MOCK_SCENARIOS.length} objections closed so far.
      </p>

      <ol className="space-y-6">
        {MOCK_SCENARIOS.map((scenario) => (
          <li key={scenario.id}>
            <Scenario
              scenario={scenario}
              chosenReplyId={choices[scenario.id]}
              joineeAvatar={state.avatar}
              onChoose={(reply) => choose(scenario, reply)}
              onReset={() => reset(scenario.id)}
            />
          </li>
        ))}
      </ol>
    </DrillSection>
  );
}

function Scenario({
  scenario,
  chosenReplyId,
  joineeAvatar,
  onChoose,
  onReset,
}: {
  scenario: MockScenario;
  chosenReplyId?: string;
  joineeAvatar?: AvatarConfig;
  onChoose: (reply: ScenarioReply) => void;
  onReset: () => void;
}) {
  const chosen = scenario.replies.find((reply) => reply.id === chosenReplyId);
  const guest = GUESTS[scenario.id];
  const guestName = guest?.name ?? "Guest";
  const verdict = !chosen
    ? ""
    : chosen.outcome === "closes"
      ? "This closes the objection"
      : "This deepens the concern";

  // Neutral until they answer; the meter is the guest reacting, so it climbs on
  // a reply that closes and drops to almost nothing on one that deepens.
  const patience = !chosen ? 3 : chosen.outcome === "closes" ? 4 : 1;

  const guestPortrait = (
    <JoineeAvatar config={guest?.avatar ?? null} size={30} />
  );

  return (
    <div className="rounded-[3px] border-2 border-ink/20 bg-surface-soft p-5 shadow-[3px_3px_0_0_rgba(20,20,26,0.12)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
        {scenario.label}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{scenario.context}</p>

      {/* How the guest took the chosen reply, for readers who never see the
          box appear below the options. */}
      <p aria-live="polite" className="sr-only">
        {chosen
          ? `${guestName} replies: ${chosen.customerResponse}. ${verdict}.`
          : ""}
      </p>

      <div className="mt-8 space-y-6">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <PixelDialogue
              speaker={guestName}
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
            speaker={guestName}
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
