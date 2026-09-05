import { auth } from "@/auth";
import { UserBar } from "@/components/auth/UserBar";
import { JourneyDesk } from "@/components/onboarding/journey/JourneyDesk";
import { hasFullDayAccess, isAuthConfigured } from "@/lib/auth/config";

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
export default async function OnboardingPage() {
  // The one place the reviewer allow-list is consulted. It stays on the server:
  // the desk is handed a boolean, so no list of emails is serialised into the
  // page. With `FULL_ACCESS_EMAILS` unset this is false for everyone and the
  // desk behaves exactly as it always has.
  const session = isAuthConfigured ? await auth() : null;
  const openAllDays = hasFullDayAccess(session?.user?.email);

  return (
    <>
      <UserBar />
      <JourneyDesk openAllDays={openAllDays} />
    </>
  );
}
