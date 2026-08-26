"use client";

import { useEffect, useId, useRef, useState } from "react";
import { REWRITE_EXERCISE } from "@/content/onboarding/drills";
// Aliased because the content type and this component share a name: imported
// unaliased it would shadow the very function it types the props of.
import type {
  DrillId,
  RewriteExercise as RewriteExerciseContent,
} from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProgress } from "@/lib/progress/provider";
import { ChatBubble } from "./ChatBubble";
import { DrillSection } from "./DrillSection";

/**
 * Everything the two instances differ on, each defaulting to the Day 2 string.
 * The registry stores zero-prop components, so `rewrite-chat` still points
 * straight at `RewriteExercise` and gets exactly what it got before.
 */
interface RewriteExerciseProps {
  exercise?: RewriteExerciseContent;
  /** Where the completion is recorded, and the id the registry mounts this under. */
  drillId?: DrillId;
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Printed above the textarea, and the accessible name of the field. */
  inputLabel?: string;
  placeholder?: string;
  /** Heading over the joinee's own text in the reveal. */
  yoursHeading?: string;
  problemsHeading?: string;
  annotationsHeading?: string;
}

/**
 * Rewrite-a-bad-chat (PRD §7.4).
 *
 * Not auto-graded - there is no single right rewrite. Submitting reveals a
 * model answer and stores the joinee's text for the mentor to read.
 *
 * Runs twice: Day 2's fee reply and Day 3's two-minute follow-up. The
 * interaction is identical, so the second drill is a wrapper that passes
 * content and framing (`FollowupRewrite`) rather than a second copy of this.
 */
export function RewriteExercise({
  exercise = REWRITE_EXERCISE,
  drillId = "rewrite-chat",
  eyebrow = "Drill · writing",
  title = "Rewrite a bad reply",
  description = "Here is a real-shaped reply that does five things wrong at once. Fix it.",
  inputLabel = "Your rewrite",
  placeholder = "Answer the question they actually asked. Shorter than you think.",
  yoursHeading = "Yours",
  problemsHeading = "What was wrong with the original",
  annotationsHeading = "What changed and why",
}: RewriteExerciseProps) {
  const { state, ready, saveExercise, setDrillResult } = useProgress();
  const stored = state.exercises[exercise.exerciseKey];
  const [draft, setDraft] = useState(stored?.body ?? "");
  const [revealed, setRevealed] = useState(Boolean(stored));
  // Generated rather than the hardcoded "rewrite-draft" this used to carry: two
  // drills render this now, and two identical ids in one document would point
  // the second label at the first textarea.
  const draftId = useId();

  /**
   * Put a previously submitted rewrite back in the box.
   *
   * The store loads asynchronously, so the first render always sees empty
   * progress and both `useState` initialisers above capture that. A returning
   * joinee was landing on the "Submitted" badge (which reads `stored` during
   * render, so it did update) above an empty textarea and a button reading
   * "Submit and compare" - and retyping into it overwrote the rewrite their
   * mentor was meant to read.
   *
   * Gated on a ref rather than on `draft === ""`, so it can never stomp text
   * typed while the store was still loading.
   */
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current || !stored) return;
    restored.current = true;
    setDraft(stored.body);
    setRevealed(true);
  }, [ready, stored]);

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    saveExercise(exercise.exerciseKey, trimmed);
    setRevealed(true);
    // Also record a drill result, because the passport counts drills rather
    // than exercises: `stampsForDay` walks `day.drills` and reads
    // `state.drills[drillId]`, so a writing drill that only ever called
    // `saveExercise` had a stamp face nobody could earn - and a day whose
    // stamp sheet cannot complete is a day that never unseals the next one.
    //
    // Status only, no score: `points.ts` pays `drillPerfect` on
    // `score === maxScore`, and there is no right answer here to be perfect
    // against. `PauseDrill` records its ungraded pass the same way.
    setDrillResult(drillId, { status: "complete" });
  }

  return (
    <DrillSection
      eyebrow={eyebrow}
      title={title}
      description={description}
      status={stored ? <Badge tone="teal">Submitted</Badge> : null}
    >
      {/* Mounted for the whole drill, so submitting updates the same region.
          The reveal is a large silent insertion below the button otherwise. */}
      <p aria-live="polite" className="sr-only">
        {revealed ? "Saved. The model answer and notes are below." : ""}
      </p>

      <div className="space-y-3">
        <ChatBubble from="customer">{exercise.customerMessage}</ChatBubble>
        <ChatBubble from="agent">{exercise.badReply}</ChatBubble>
      </div>

      <div className="mt-5">
        <label
          htmlFor={draftId}
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted"
        >
          {inputLabel}
        </label>
        <textarea
          id={draftId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={5}
          placeholder={placeholder}
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
                {yoursHeading}
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
                {exercise.modelAnswer}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AnnotationList
              heading={problemsHeading}
              items={exercise.problems}
            />
            <AnnotationList
              heading={annotationsHeading}
              items={exercise.annotations}
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
