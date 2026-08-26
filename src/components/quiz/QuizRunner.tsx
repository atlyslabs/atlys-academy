"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Quiz, QuizQuestion } from "@/content/onboarding/types";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { api } from "@/lib/api-client";
import {
  MAX_QUIZ_ATTEMPTS,
  quizAttemptsLeft,
  quizAttemptsUsed,
  quizPassed,
} from "@/lib/progress/attempts";
import { useProgress } from "@/lib/progress/provider";
import { seededShuffle } from "@/lib/shuffle";
import { cn } from "@/lib/utils";
import { ResultsSummary, type GradedResult } from "./ResultsSummary";

/** Selected option id per question id. */
type Selections = Record<string, string>;

type Status = "answering" | "submitting" | "graded" | "error";

export function QuizRunner({ quiz }: { quiz: Quiz }) {
  const { state, ready, recordAttempt } = useProgress();
  const [attemptNumber, setAttemptNumber] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  const [status, setStatus] = useState<Status>("answering");
  const [result, setResult] = useState<GradedResult | null>(null);

  const questions = useMemo(
    () => shuffleQuiz(quiz, attemptNumber),
    [quiz, attemptNumber],
  );

  const answeredCount = Object.keys(selections).length;
  const allAnswered = answeredCount === quiz.questions.length;

  // Attempts come from stored progress, not from `attemptNumber` - that is a
  // per-mount counter used only to reseed the shuffle, and it resets to 0 on
  // every page load. The authoritative count is the list of submitted records.
  const used = quizAttemptsUsed(state, quiz.slug);
  const left = quizAttemptsLeft(state, quiz.slug);
  const passed = quizPassed(state, quiz.slug);
  // `ready` is load-bearing: the store is read asynchronously, so before it
  // resolves every joinee looks like they have used zero attempts. Submitting
  // in that window would let someone past the cap by being quick, and blocking
  // on it would flash a false "no attempts left" at everyone. Wait instead.
  const capReached = ready && left <= 0;

  async function submit() {
    // Belt and braces: the button is disabled, but a double-click can land two
    // calls before React re-renders and the second must not spend a fourth go.
    if (!ready || left <= 0) return;
    setStatus("submitting");
    try {
      const response = await api.api.onboarding.quiz[":slug"].submit.$post({
        param: { slug: quiz.slug },
        json: {
          responses: quiz.questions.map((question) => ({
            questionId: question.id,
            selected: selections[question.id] ?? null,
          })),
        },
      });

      if (!response.ok) throw new Error(`Grading failed (${response.status})`);

      const graded = (await response.json()) as GradedResult;
      setResult(graded);
      setStatus("graded");
      recordAttempt({
        quizSlug: quiz.slug,
        score: graded.score,
        maxScore: graded.maxScore,
        passed: graded.passed,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setStatus("error");
    }
  }

  function retry() {
    if (left <= 0) return;
    setAttemptNumber(attemptNumber + 1);
    setSelections({});
    setResult(null);
    setStatus("answering");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (status === "graded" && result) {
    return (
      <ResultsSummary
        quiz={quiz}
        result={result}
        selections={selections}
        onRetry={retry}
        attemptsUsed={used}
        attemptsLeft={left}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10 sm:py-14">
      <Link
        href="/onboarding"
        className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted underline underline-offset-4 hover:text-ink"
      >
        ← Back to the journey
      </Link>

      {/* Perforation rather than a container edge: the header is the top of one
          printed document, not a card stacked above the questions. */}
      <header className="mt-6 border-b border-dashed border-hairline-lit pb-5">
        <Eyebrow className="text-brand-text">The gate</Eyebrow>
        <h1 className="mt-2 font-display text-[34px] italic leading-tight tracking-[-0.01em]">
          {quiz.title}
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim">
          {quiz.questions.length} questions · 70% to pass · no time limit ·{" "}
          {MAX_QUIZ_ATTEMPTS} attempts
        </p>
        {ready && used > 0 && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text tabular-nums">
            Attempt {Math.min(used + 1, MAX_QUIZ_ATTEMPTS)} of{" "}
            {MAX_QUIZ_ATTEMPTS} · {left} {left === 1 ? "try" : "tries"} left
          </p>
        )}
      </header>

      <ol className="mt-8 space-y-6" data-scroll-scene="The questions">
        {questions.map((question, index) => (
          <li key={question.id}>
            <QuestionCard
              question={question}
              index={index}
              selected={selections[question.id]}
              onSelect={(optionId) =>
                setSelections((current) => ({
                  ...current,
                  [question.id]: optionId,
                }))
              }
            />
          </li>
        ))}
      </ol>

      {/* The gate: the one brand-washed panel on the page, so the last action
          reads as a boarding desk rather than one more paper section. */}
      <div
        className="mt-8 rounded-2xl border border-brand/25 bg-ticket-soft/50 p-4 sm:p-5"
        data-scroll-scene="Submit your answers"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button
            onClick={submit}
            disabled={!allAnswered || status === "submitting" || capReached}
          >
            {status === "submitting" ? "Grading…" : "Submit answers"}
          </Button>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text tabular-nums">
            {answeredCount} of {quiz.questions.length} answered
          </p>
        </div>

        {capReached && (
          <p className="mt-4 border-t border-dashed border-brand/25 pt-3.5 text-sm leading-relaxed text-ink-secondary">
            {passed
              ? `You have used all ${MAX_QUIZ_ATTEMPTS} attempts. You passed this one, so nothing is outstanding - your best score stands.`
              : `You have used all ${MAX_QUIZ_ATTEMPTS} attempts. Your best score stands and the journey carries on from here - the next day is not held up by this. Talk it through with your team leader.`}
          </p>
        )}
      </div>

      {status === "error" && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-badge-coral/30 bg-badge-coral-soft/60 p-3.5 text-sm text-badge-coral"
        >
          Could not reach the grader. Check your connection and try submitting
          again. Your answers are still selected.
        </p>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  selected,
  onSelect,
}: {
  question: QuizQuestion;
  index: number;
  selected?: string;
  onSelect: (optionId: string) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-hairline bg-white/[0.02] p-5 sm:p-6">
      <legend className="px-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim">
        Question {index + 1}
      </legend>

      {/* The prompt is a question someone has to hold in mind while reading four
          long options, so it is set a step above them rather than level with. */}
      <p className="text-[17px] font-medium leading-snug">{question.prompt}</p>

      <div className="mt-4 space-y-2">
        {question.options.map((option) => {
          const checked = selected === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                // Options are full sentences, several clauses long. 14px with
                // default leading ran them together; this is the reading size.
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-[15px] leading-[1.6]",
                "transition-[background-color,border-color] duration-100 ease-out",
                "motion-reduce:transition-none",
                // Focus still lands on the real radio; the ring is mirrored onto
                // the whole row so the keyboard target matches the click target.
                "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand-text",
                // Both states carry the same 1px rule, so selecting never
                // reflows the row.
                checked
                  ? "border-brand-text/60 bg-brand/15 text-ink"
                  : "border-hairline bg-white/[0.015] text-ink-muted hover:bg-white/[0.04] hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={question.id}
                value={option.id}
                checked={checked}
                onChange={() => onSelect(option.id)}
                className="mt-0.5 size-4 shrink-0 accent-brand"
              />
              <span className="min-w-0 flex-1">{option.label}</span>
              {/* Printed stamp instead of a soft highlight. aria-hidden keeps the
                  radio's accessible name equal to the option label alone. */}
              {checked && (
                <span
                  aria-hidden
                  className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-brand-text"
                >
                  Selected
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Shuffles the questions and, independently, each question's options. Options
 * get an offset seed so a question does not land in the same slot as its own
 * position in the question list.
 */
function shuffleQuiz(quiz: Quiz, seed: number): QuizQuestion[] {
  return seededShuffle(quiz.questions, seed).map((question, index) => ({
    ...question,
    options: seededShuffle(question.options, seed * 31 + index + 1),
  }));
}
