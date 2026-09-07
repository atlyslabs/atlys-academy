import { UserBar } from "@/components/auth/UserBar";
import { JourneyDesk } from "@/components/onboarding/journey/JourneyDesk";

export const metadata = {
  title: "The journey · Atlys Academy",
};

/**
 * The journey: one day on the desk at a time.
 *
 * All composition lives in `JourneyDesk` (a client component - the desk is
 * derived from progress state and the wall clock, both browser concerns).
 * The gate rules themselves live in `src/lib/progress/selectors.ts`: a day
 * unseals at 10:30 the morning after the previous day's passport page is
 * complete - every stamp collected and its quiz passed at the mark.
 *
 * The drills are mounted inside each day's dossier via
 * `src/lib/drill-registry.ts`; `#day-N` anchors are kept for the landing
 * page's chapter links.
 */
export default function OnboardingPage() {
  return (
    <>
      <UserBar />
      <JourneyDesk />
    </>
  );
}
