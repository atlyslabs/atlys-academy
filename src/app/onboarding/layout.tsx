import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/config";
import { ProgressProvider } from "@/lib/progress/provider";
import { isSupabaseConfigured } from "@/server/onboarding/db";

/**
 * Everything under `/onboarding` shares two things and only two: the sign-in
 * check, and the progress store.
 *
 * The travel chrome that used to sit here - user bar, sound toggle, points HUD,
 * boot sequence, scroll cue - moved down into the `(paper)` group. Two visual
 * systems now live under this path: the paper surfaces (the journey, quizzes,
 * leaderboard, passport) and the canvas surfaces (the five day pages), and the
 * chrome belongs to the first. Keeping auth and the provider up here is what
 * lets the day pages read real progress without inheriting a pale UI bar over a
 * near-black hero.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = isAuthConfigured ? await auth() : null;
  if (isAuthConfigured && !session) redirect("/signin");
  const mode = isSupabaseConfigured && session ? "remote" : "local";

  return <ProgressProvider mode={mode}>{children}</ProgressProvider>;
}
