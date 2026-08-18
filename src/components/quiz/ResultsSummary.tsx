"use client";

import { LAST_DAY_ID } from "@/content/onboarding/days";
import Link from "next/link";
import type { Quiz } from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

/**
 * Shape returned by `POST /quiz/:slug/submit`. Declared here rather than
 * inferred from the Hono client so the results UI has one obvious contract to
 * read; the server type in `grade.ts` is the source of truth.
 */
export interface GradedResult {
  quizSlug: string;
  score: number;
  maxScore: number;
  passed: boolean;
  breakdown: {
    questionId: string;
    selected: string | null;
    correct: boolean;
    correctOptionId: string;
    explanation: string;
  }[];
}

export function ResultsSummary({
  quiz,
  result,
  selections,
  onRetry,
}: {
  quiz: Quiz;
  result: GradedResult;
  selections: Record<string, string>;
  onRetry: () => void;
}) {
  const percent = Math.round((result.score / result.maxScore) * 100);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10 sm:py-14">
      <Card
        tone={result.passed ? "accent" : "plain"}
        className="animate-rise-in p-7 sm:p-9"
      >
        <Eyebrow
          className={cn(
            "text-xs",
            result.passed ? "text-white/70" : "text-brand-text",
          )}
        >
          {quiz.title}
        </Eyebrow>

        {/* Printed readout: mono field label over a condensed figure, split off
            by a perforation rule. The percent stays inside the h1 so the
            heading's accessible name is unchanged. */}
        <div
          className={cn(
            "mt-4 border-t border-dashed pt-4",
            result.passed ? "border-white/35" : "border-hairline-lit",
          )}
        >
          <Eyebrow className={cn(result.passed && "text-white/70")}>
            Score
          </Eyebrow>
          <h1 className="mt-1.5 font-condensed text-5xl leading-none tracking-[0.01em]">
            {result.score} / {result.maxScore}
            <span
              className={cn(
                "ml-3 font-mono text-lg font-normal tracking-[0.08em]",
                result.passed ? "text-white/70" : "text-ink-muted",
              )}
            >
              {percent}%
            </span>
          </h1>
        </div>

        <p className={cn("mt-4", result.passed ? "text-white/85" : "text-ink-secondary")}>
          {result.passed
            ? quiz.dayId === LAST_DAY_ID
              ? "Passed. That was the final gate - the journey is complete."
              : `Passed. Finish the rest of Day ${quiz.dayId}'s passport page, and Day ${quiz.dayId + 1} unseals tomorrow at 10:30.`
            : "Below 70%. Read the explanations, then take it again. Retries cost nothing."}
        </p>
      </Card>

      <section className="mt-8">
        <Eyebrow>Question by question</Eyebrow>
        <ol className="mt-3 space-y-4">
          {quiz.questions.map((question) => {
            const outcome = result.breakdown.find(
              (item) => item.questionId === question.id,
            );
            if (!outcome) return null;

            const chosen = question.options.find(
              (option) => option.id === selections[question.id],
            );
            const correct = question.options.find(
              (option) => option.id === outcome.correctOptionId,
            );

            return (
              <li
                key={question.id}
                className={cn(
                  "rounded-xl border p-5",
                  outcome.correct
                    ? "border-badge-green/30 bg-badge-green-soft/60"
                    : "border-badge-coral/30 bg-badge-coral-soft/60",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-medium">{question.prompt}</p>
                  <Badge tone={outcome.correct ? "green" : "coral"}>
                    {outcome.correct ? "Correct" : "Missed"}
                  </Badge>
                </div>

                {!outcome.correct && (
                  <p className="mt-3 text-sm text-ink-secondary">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      You chose:
                    </span>{" "}
                    {chosen?.label ?? "nothing"}
                  </p>
                )}

                <p className="mt-1.5 text-sm text-ink-secondary">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                    Answer:
                  </span>{" "}
                  {correct?.label}
                </p>

                <p className="mt-3 border-t border-dashed border-hairline-lit pt-3 text-sm text-ink-secondary">
                  {outcome.explanation}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        {/* Pill link. It cannot be <Button>, which renders a <button>, so it
            mirrors the primary variant's fill and press. */}
        <Link
          href="/onboarding"
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full border border-transparent bg-brand px-6",
            "font-sans text-[14px] font-medium tracking-[0.01em] text-white",
            "transition-[transform,background-color] duration-150 ease-out hover:bg-brand-hover",
            "motion-reduce:transition-none active:translate-y-[1px]",
          )}
        >
          Back to the journey →
        </Link>
        <Button variant="secondary" onClick={onRetry}>
          {result.passed ? "Take it again" : "Retry the quiz"}
        </Button>
      </div>
    </div>
  );
}
