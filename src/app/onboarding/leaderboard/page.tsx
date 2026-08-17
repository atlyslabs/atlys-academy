import { RoomShell } from "@/components/onboarding/journey/RoomShell";
import { LeaderboardPanel } from "@/components/onboarding/LeaderboardPanel";

export const metadata = {
  title: "Leaderboard · Atlys Academy",
};

/**
 * The cohort standings. `LeaderboardPanel` fetches the real board from the
 * onboarding API and brings its own heading, so this page only sets the
 * stage.
 */
export default function LeaderboardPage() {
  return (
    <RoomShell room="leaderboard">
      <LeaderboardPanel />
    </RoomShell>
  );
}
