import { ANSWERS } from "@/content/onboarding/answers";
import { getQuizBySlug, PASS_THRESHOLD } from "@/content/onboarding/quiz";
import type { QuestionId, QuizSlug } from "@/content/onboarding/types";

export interface QuizResponse {
  questionId: QuestionId;
  /** Option id the joinee picked, or `null` if they skipped it. */
  selected: string | null;
}

export interface QuestionResult {
  questionId: QuestionId;
  selected: string | null;
  correct: boolean;
  /** Revealed only here, after submission. */
  correctOptionId: string;
  explanation: string;
}

export interface GradeResult {
  quizSlug: QuizSlug;
  score: number;
  maxScore: number;
  passed: boolean;
  breakdown: QuestionResult[];
}

export class UnknownQuizError extends Error {
  constructor(slug: string) {
    super(`Unknown quiz: ${slug}`);
    this.name = "UnknownQuizError";
  }
}

/**
 * Grades a submission on the server, where the answer key lives.
 *
 * Iterates the quiz's own question list rather than the submitted responses, so
 * a client that omits, duplicates or invents questions cannot change the
 * denominator. Unanswered questions simply score zero.
 */
export function gradeQuiz(
  quizSlug: QuizSlug,
  responses: readonly QuizResponse[],
): GradeResult {
  const quiz = getQuizBySlug(quizSlug);
  if (!quiz) throw new UnknownQuizError(quizSlug);

  const answerKey = ANSWERS[quizSlug] ?? {};
  const selectedByQuestion = new Map(
    responses.map((response) => [response.questionId, response.selected]),
  );

  const breakdown = quiz.questions.map<QuestionResult>((question) => {
    const key = answerKey[question.id];
    if (!key) {
      // A question with no answer key is a content bug. Fail loudly in dev
      // rather than silently marking the joinee wrong.
      throw new Error(
        `Missing answer key for ${quizSlug}/${question.id}, see src/content/onboarding/answers.ts`,
      );
    }
    const selected = selectedByQuestion.get(question.id) ?? null;
    return {
      questionId: question.id,
      selected,
      correct: selected === key.correct,
      correctOptionId: key.correct,
      explanation: key.explanation,
    };
  });

  const score = breakdown.filter((result) => result.correct).length;
  const maxScore = breakdown.length;

  return {
    quizSlug,
    score,
    maxScore,
    passed: maxScore > 0 && score / maxScore >= PASS_THRESHOLD,
    breakdown,
  };
}
