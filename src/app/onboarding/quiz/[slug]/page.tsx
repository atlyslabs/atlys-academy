import { notFound } from "next/navigation";
import { getQuizBySlug, QUIZZES } from "@/content/onboarding/quiz";
import { QuizRunner } from "@/components/quiz/QuizRunner";

/** The five quizzes are known at build time, so prerender all of them. */
export function generateStaticParams() {
  return QUIZZES.map((quiz) => ({ slug: quiz.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const quiz = getQuizBySlug(slug);
  return { title: quiz ? `${quiz.title} · Quiz` : "Quiz not found" };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const quiz = getQuizBySlug(slug);
  if (!quiz) notFound();

  return <QuizRunner quiz={quiz} />;
}
