"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ANXIETY_OPENERS } from "@/content/onboarding/coaching";
import { Badge } from "@/components/ui/Badge";
import { HoldToReveal } from "@/components/ui/HoldToReveal";
import { useProgress } from "@/lib/progress/provider";
import { ChatBubble } from "./ChatBubble";
import { DrillSection } from "./DrillSection";

const MAX_SCORE = ANXIETY_OPENERS.length;

/**
 * The anxiety wall - six real openers, none of them the question they look like.
 *
 * The whole drill is the pause before the answer: each card shows only what the
 * customer typed, and the fear underneath it sits behind a press-and-hold, so a
 * joinee has to commit to a guess before reading ours. Same reason the objection
 * library gates its scripts.
 */
export function AnxietyWall() {
  const { state, setDrillResult } = useProgress();
  /** Opener ids, in the order they were revealed. */
  const [revealed, setRevealed] = useState<string[]>([]);
  const storedResult = state.drills["anxiety-wall"];

  // Stable, so `RevealReport`'s effect fires once per gate opening rather than
  // on every parent render. Idempotent for the same reason.
  const reveal = useCallback((id: string) => {
    setRevealed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const complete = revealed.length === MAX_SCORE;
  // `setDrillResult` gets a new identity on every progress write, so an
  // unguarded effect would re-fire on its own result forever.
  const stored = useRef(false);
  useEffect(() => {
    if (!complete || stored.current) return;
    stored.current = true;
    setDrillResult("anxiety-wall", {
      status: "complete",
      score: MAX_SCORE,
      maxScore: MAX_SCORE,
    });
  }, [complete, setDrillResult]);

  const lastId = revealed[revealed.length - 1];
  const last = ANXIETY_OPENERS.find((opener) => opener.id === lastId);
  const announcement = complete
    ? `All ${MAX_SCORE} fears read. Wall complete.`
    : last
      ? `Fear revealed for “${last.message}”. ${revealed.length} of ${MAX_SCORE} read.`
      : "";

  return (
    <DrillSection
      eyebrow="Drill · fear"
      title="What are they actually afraid of?"
      description="Six openers you will get this week. Each one is a question about process and a fear about loss. Name the fear yourself before you read ours."
      status={
        storedResult?.score !== undefined ? (
          <Badge
            tone={
              storedResult.score === storedResult.maxScore ? "green" : "amber"
            }
          >
            Read {storedResult.score}/{storedResult.maxScore}
          </Badge>
        ) : null
      }
    >
      {/* Mounted for the whole drill so the count is announced on every hold. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted tabular-nums">
        {revealed.length} of {MAX_SCORE} read
      </p>

      <ul className="mt-3 grid gap-4 lg:grid-cols-2">
        {ANXIETY_OPENERS.map((opener, index) => (
          <li
            key={opener.id}
            className="rounded-[3px] border-2 border-ink/25 bg-surface-soft p-4 shadow-[3px_3px_0_0_rgba(20,20,26,0.25)]"
          >
            <ChatBubble from="customer">
              &ldquo;{opener.message}&rdquo;
            </ChatBubble>

            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
              What are they actually afraid of?
            </p>

            <div className="mt-2">
              {/* The label carries the card number because six identical
                  buttons are indistinguishable in a screen reader's button
                  list, and `HoldToReveal` takes a plain string. */}
              <HoldToReveal label={`Hold to reveal · fear ${index + 1}`}>
                <RevealReport id={opener.id} onReveal={reveal} />
                <span className="block font-display text-lg font-semibold leading-snug text-ink">
                  {opener.fear}
                </span>
                <span className="mt-3 block font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                  First move
                </span>
                <span className="mt-1 block text-sm text-ink-secondary">
                  {opener.move}
                </span>
              </HoldToReveal>
            </div>
          </li>
        ))}
      </ul>

      {complete && (
        <p className="animate-rise-in mt-5">
          <Badge tone="green">All six read, and none of them was the question</Badge>
        </p>
      )}
    </DrillSection>
  );
}

/**
 * Reports that a gate has opened.
 *
 * `HoldToReveal` owns the hold and exposes no callback, but it renders its
 * children only once the hold completes - so a child mounting *is* the reveal.
 * Rendering nothing keeps it out of the revealed copy.
 */
function RevealReport({
  id,
  onReveal,
}: {
  id: string;
  onReveal: (id: string) => void;
}) {
  useEffect(() => {
    onReveal(id);
  }, [id, onReveal]);
  return null;
}
