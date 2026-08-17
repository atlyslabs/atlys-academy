"use client";

import { useId, useState } from "react";
import { REFRAMES, type Reframe } from "@/content/onboarding/coaching";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProgress } from "@/lib/progress/provider";
import { DrillSection } from "./DrillSection";

const MAX_SCORE = REFRAMES.length;

/**
 * The five reframes, as two-sided cards.
 *
 * Deliberately not a 3D flip: a rotated back face is either present in the
 * accessibility tree while invisible, or hidden from it while on screen, and
 * both are wrong. The card expands in place instead - the button stays the
 * control, keeps `aria-expanded`, and the panel it owns is the only thing that
 * appears.
 */
export function ReframeDeck() {
  const { state, setDrillResult } = useProgress();
  /** Reframe ids opened at least once. Closing one again does not un-count it. */
  const [opened, setOpened] = useState<string[]>([]);
  const storedResult = state.drills["reframe-deck"];

  function markOpened(id: string) {
    if (opened.includes(id)) return;
    const next = [...opened, id];
    setOpened(next);
    if (next.length === MAX_SCORE) {
      setDrillResult("reframe-deck", {
        status: "complete",
        score: MAX_SCORE,
        maxScore: MAX_SCORE,
      });
    }
  }

  const complete = opened.length === MAX_SCORE;

  return (
    <DrillSection
      eyebrow="Drill · teaching"
      title="Five reframes"
      description="Do not answer the question better than the last agent. Change what the customer thinks the problem is. Read what they believe, decide what you would teach, then turn the card."
      status={
        storedResult?.score !== undefined ? (
          <Badge
            tone={
              storedResult.score === storedResult.maxScore ? "green" : "amber"
            }
          >
            Turned {storedResult.score}/{storedResult.maxScore}
          </Badge>
        ) : null
      }
    >
      {/* Mounted for the whole drill, so each turn updates the same region. */}
      <p aria-live="polite" className="sr-only">
        {complete
          ? `All ${MAX_SCORE} reframes turned.`
          : opened.length > 0
            ? `${opened.length} of ${MAX_SCORE} reframes turned.`
            : ""}
      </p>

      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted tabular-nums">
        {opened.length} of {MAX_SCORE} turned
      </p>

      <ul className="mt-3 grid gap-4 lg:grid-cols-2">
        {REFRAMES.map((reframe, index) => (
          <ReframeCard
            key={reframe.id}
            reframe={reframe}
            index={index}
            onOpen={markOpened}
          />
        ))}
      </ul>

      {complete && (
        <p className="animate-rise-in mt-5">
          <Badge tone="green">
            All five turned. Price stops being the conversation
          </Badge>
        </p>
      )}
    </DrillSection>
  );
}

function ReframeCard({
  reframe,
  index,
  onOpen,
}: {
  reframe: Reframe;
  index: number;
  onOpen: (id: string) => void;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  function toggle() {
    if (!open) onOpen(reframe.id);
    setOpen(!open);
  }

  return (
    <li className="flex flex-col rounded-[3px] border-2 border-ink/25 bg-surface-soft p-4 shadow-[3px_3px_0_0_rgba(20,20,26,0.25)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted tabular-nums">
        Reframe {String(index + 1).padStart(2, "0")}
      </p>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
        What they believe
      </p>
      {/* Struck through because the belief is the thing being replaced - the
          card's whole argument is legible before the panel opens. */}
      <p className="mt-1 text-lg leading-snug text-ink-muted line-through decoration-2">
        &ldquo;{reframe.believe}&rdquo;
      </p>

      <p className="mt-4">
        <Button
          size="sm"
          variant={open ? "secondary" : "primary"}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          {open ? "Hide the reframe" : "What do you teach them?"}
        </Button>
      </p>

      {/* Always in the DOM so `aria-controls` resolves; Tailwind's preflight
          hides the [hidden] attribute, which is what collapses it. */}
      <div id={panelId} hidden={!open} className="mt-4">
        <div className="animate-rise-in border-t-2 border-dashed border-ink/25 pt-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
            What you teach
          </p>
          <p className="mt-1 font-display text-xl font-semibold leading-snug text-ink">
            &ldquo;{reframe.teach}&rdquo;
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            Why
          </p>
          <p className="mt-1 text-sm text-ink-secondary">{reframe.why}</p>
        </div>
      </div>
    </li>
  );
}
