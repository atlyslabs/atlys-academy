import { notFound } from "next/navigation";
import { RoomShell } from "@/components/onboarding/journey/RoomShell";
import { LeaderboardPanel } from "@/components/onboarding/LeaderboardPanel";
import { LEADERBOARD_ENABLED } from "@/lib/dev-flags";

export const metadata = {
  title: "Leaderboard · Atlys Academy",
};

/**
 * The standings, switched off.
 *
 * `LEADERBOARD_ENABLED` is false, so this behaves as though the route does not
 * exist rather than rendering an empty or apologetic page - the same treatment
 * `/admin` gets from `ADMIN_ENABLED`. The panel below is left mounted behind the
 * gate so flipping the flag restores the page whole.
 */
export default function LeaderboardPage() {
  if (!LEADERBOARD_ENABLED) notFound();

  return (
    <RoomShell room="leaderboard">
      <LeaderboardPanel />
    </RoomShell>
  );
}
