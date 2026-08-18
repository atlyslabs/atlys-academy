"use client";

import { useState } from "react";
import {
  composeOdpacBody,
  isOdpacComplete,
  ODPAC_SHADOW_TARGET,
  ODPAC_STAGES,
  ODPAC_WHY,
  odpacExerciseKey,
  parseOdpacBody,
  type OdpacStage,
  type OdpacStageId,
} from "@/content/onboarding/odpac";
import type { DayId } from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProgress } from "@/lib/progress/provider";

/**
 * The daily ODPAC report: shadow two to three live chats, then write up what
 * you saw against the five stages.
 *
 * Required rather than optional, and not auto-graded - a mentor reads it, and it
 * lands in the admin desk and the daily Slack report alongside quiz scores. All
 * five sections are stored as one labelled body under `dayN.odpac`, which is why
 * those two surfaces need no changes to display it.
 *
 * Laid out as five numbered stages rather than a form, and each one carries a
 * worked example next to its box. Without the example, "write what you observed"
 * reliably produces one line per stage.
 */
export function OdpacReport({ dayId }: { dayId: DayId }) {
  const { state, saveExercise } = useProgress();
  const key = odpacExerciseKey(dayId);
  const stored = state.exercises[key];

  const [sections, setSections] = useState<
    Partial<Record<OdpacStageId, string>>
  >(() => (stored ? parseOdpacBody(stored.body) : {}));
  const [justSaved, setJustSaved] = useState(false);

  const complete = isOdpacComplete(sections);
  const filled = ODPAC_STAGES.filter(
    (stage) => (sections[stage.id] ?? "").trim() !== "",
  ).length;

  function update(id: OdpacStageId, value: string) {
    setSections((current) => ({ ...current, [id]: value }));
    setJustSaved(false);
  }

  function submit() {
    if (!complete) return;
    saveExercise(key, composeOdpacBody(sections));
    setJustSaved(true);
  }

  return (
    <div>
      {/* The brief. Deliberately loud: this is the one activity a joinee is
          most likely to mistake for optional paperwork. */}
      <div className="rounded-xl border border-hairline-lit bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-text">
              Required today
            </p>
            <h3 className="mt-1 text-[17px] font-medium text-ink">
              Shadow {ODPAC_SHADOW_TARGET}, then write up what you saw
            </h3>
          </div>
          {stored ? (
            <Badge tone="teal">Filed</Badge>
          ) : (
            <Badge tone="amber">Not filed</Badge>
          )}
        </div>
        <p className="mt-2.5 max-w-[68ch] text-[13.5px] leading-relaxed text-ink-dim">
          {ODPAC_WHY}
        </p>
        <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-ink-muted">
          Five stages, five boxes. Each one shows you what to look for and an
          example of a useful answer - match that level of detail and you have
          done it right.
        </p>
      </div>

      <ol className="mt-6 space-y-7">
        {ODPAC_STAGES.map((stage, index) => (
          <StageField
            key={stage.id}
            stage={stage}
            index={index}
            dayId={dayId}
            value={sections[stage.id] ?? ""}
            onChange={(value) => update(stage.id, value)}
          />
        ))}
      </ol>

      <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-5">
        <Button onClick={submit} disabled={!complete}>
          {stored ? "Save changes" : "File the report"}
        </Button>
        <p aria-live="polite" className="text-[13.5px] text-ink-muted">
          {justSaved
            ? "Filed. Your mentor reads this, and it goes into today's report."
            : complete
              ? "All five stages written."
              : `${filled} of ${ODPAC_STAGES.length} stages written - all five are needed before you can file.`}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function StageField({
  stage,
  index,
  dayId,
  value,
  onChange,
}: {
  stage: OdpacStage;
  index: number;
  dayId: DayId;
  value: string;
  onChange: (value: string) => void;
}) {
  const fieldId = `odpac-${dayId}-${stage.id}`;
  const written = value.trim() !== "";

  return (
    <li>
      <div className="flex items-center gap-3">
        {/* The letter as the step marker: it is the acronym and the ordinal at
            once, so the five stages read as a sequence rather than a checklist. */}
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[14px] font-semibold ${
            written
              ? "border-brand-text/50 bg-brand-text/10 text-brand-text"
              : "border-hairline-lit text-ink-muted"
          }`}
        >
          {stage.letter}
        </span>
        <div className="min-w-0">
          <label
            htmlFor={fieldId}
            className="block text-[15px] font-medium text-ink"
          >
            {index + 1}. {stage.label}
          </label>
          <p className="text-[13px] leading-snug text-ink-dim">
            {stage.whatItIs}
          </p>
        </div>
      </div>

      <div className="mt-3 pl-0 sm:pl-11">
        <p className="max-w-[70ch] text-[12.5px] leading-relaxed text-ink-muted">
          <span className="font-mono uppercase tracking-[0.1em]">
            Watch for
          </span>{" "}
          {stage.watchFor}
        </p>

        <p className="mt-2 max-w-[70ch] text-[13px] font-medium leading-relaxed text-ink-dim">
          {stage.prompt}
        </p>

        <textarea
          id={fieldId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="mt-2.5 w-full rounded-lg border border-hairline-lit bg-white/[0.04] p-3.5 text-sm leading-relaxed text-ink caret-brand-text placeholder:text-ink-dim/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-text"
          placeholder="What you actually saw and heard."
        />

        {/* Collapsed by default so the page stays scannable, but one click and
            the standard is right there next to the empty box. */}
        <details className="group mt-2">
          <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text marker:hidden">
            <span aria-hidden className="inline-block transition-transform group-open:rotate-90">
              ▸
            </span>{" "}
            Example of a good answer
          </summary>
          <p className="mt-2 max-w-[70ch] rounded-lg border-l-2 border-brand-text/40 bg-white/[0.02] px-3.5 py-2.5 text-[13px] italic leading-relaxed text-ink-dim">
            {stage.example}
          </p>
        </details>
      </div>
    </li>
  );
}
