"use client";

import { useState } from "react";
import { REWRITE_EXERCISE } from "@/content/onboarding/drills";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProgress } from "@/lib/progress/provider";
import { ChatBubble } from "./ChatBubble";
import { DrillSection } from "./DrillSection";

/**
 * Rewrite-a-bad-chat (PRD §7.4).
 *
 * Not auto-graded - there is no single right rewrite. Submitting reveals a
 * model answer and stores the joinee's text for the mentor to read.
 */
export function RewriteExercise() {
  const { state, saveExercise } = useProgress();
  const stored = state.exercises[REWRITE_EXERCISE.exerciseKey];
  const [draft, setDraft] = useState(stored?.body ?? "");
  const [revealed, setRevealed] = useState(Boolean(stored));

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    saveExercise(REWRITE_EXERCISE.exerciseKey, trimmed);
    setRevealed(true);
  }

  return (
    <DrillSection
      eyebrow="Drill · writing"
      title="Rewrite a bad reply"
      description="Here is a real-shaped reply that does five things wrong at once. Fix it."
      status={stored ? <Badge tone="teal">Submitted</Badge> : null}
    >
      <div className="space-y-3">
        <ChatBubble from="customer">
          {REWRITE_EXERCISE.customerMessage}
        </ChatBubble>
        <ChatBubble from="agent">{REWRITE_EXERCISE.badReply}</ChatBubble>
      </div>

      <div className="mt-5">
        <label
          htmlFor="rewrite-draft"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted"
        >
          Your rewrite
        </label>
        <textarea
          id="rewrite-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={5}
          placeholder="Answer the question they actually asked. Shorter than you think."
          className="w-full rounded-lg border border-hairline-lit bg-white/[0.04] p-3.5 text-sm leading-relaxed text-ink caret-brand-text placeholder:text-ink-dim/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-text"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={!draft.trim()}>
            {revealed ? "Save changes" : "Submit and compare"}
          </Button>
          <p className="text-sm text-ink-muted">
            Not graded. Your mentor reads this one.
          </p>
        </div>
      </div>

      {revealed && (
        <div className="animate-rise-in mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-hairline bg-white/[0.02] p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                Yours
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap text-ink-secondary">
                {stored?.body ?? draft}
              </p>
            </div>
            <div className="rounded-xl border border-brand-text/40 bg-accent-soft p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text">
                Model answer
              </p>
              <p className="mt-2 text-sm text-ink-secondary">
                {REWRITE_EXERCISE.modelAnswer}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AnnotationList
              heading="What was wrong with the original"
              items={REWRITE_EXERCISE.problems}
            />
            <AnnotationList
              heading="What changed and why"
              items={REWRITE_EXERCISE.annotations}
            />
          </div>
        </div>
      )}
    </DrillSection>
  );
}

function AnnotationList({
  heading,
  items,
}: {
  heading: string;
  items: readonly string[];
}) {
  return (
    <div>
      <h4 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
        {heading}
      </h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-ink-secondary">
            {/* Printed square bullet rather than a dash glyph: it sits on the
                cap height at any size and matches the stationery elsewhere. */}
            <span
              aria-hidden
              className="mt-[0.5em] size-1.5 shrink-0 bg-retro-blue"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
