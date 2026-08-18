import type { ReactNode } from "react";
import Link from "next/link";

/** Which room is open. The manager's desk shares the shell; the joinee rooms
 *  never advertise it, so `admin` only appears in its own nav. */
export type Room = "passport" | "leaderboard" | "admin";

const ROOM_LINKS: readonly { room: Room; href: string; label: string }[] = [
  { room: "passport", href: "/onboarding/passport", label: "Passport" },
  {
    room: "leaderboard",
    href: "/onboarding/leaderboard",
    label: "Leaderboard",
  },
  { room: "admin", href: "/admin", label: "Admin desk" },
];

/**
 * The night stage for the journey's side rooms (passport, leaderboard) and the
 * manager's desk: same wash/vignette/grain as the day desk, a slim masthead
 * with the edition lockup, and links to the other rooms. Server-safe - no
 * hooks - so the pages that use it stay server components.
 */
export function RoomShell({
  room,
  children,
}: {
  room: Room;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-page text-ink">
      <div className="night-wash opacity-40" />
      <div className="chart-table" />
      <div className="night-vignette" />
      <div className="grain" />

      {/* The manager's desk carries a wide data table, so it gets a wider
          measure than the joinee rooms, whose content is prose and stamps. */}
      <div
        className={`relative z-10 mx-auto w-full px-4 pb-24 pt-8 sm:px-8 sm:pt-10 ${
          room === "admin" ? "max-w-[1520px]" : "max-w-[1120px]"
        }`}
      >
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <Link
            href="/"
            className="text-[15px] font-semibold leading-none tracking-[-0.01em] text-ink transition-opacity hover:opacity-80"
          >
            The{" "}
            <em className="font-display text-[17px] font-normal italic">
              atlys
            </em>{" "}
            Academy
          </Link>

          <nav
            aria-label="Rooms"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]"
          >
            <Link
              href="/onboarding"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              The journey
            </Link>
            {ROOM_LINKS.filter(
              (link) => link.room !== "admin" || room === "admin",
            ).map((link) =>
              link.room === room ? (
                <span key={link.room} aria-current="page" className="text-ink">
                  {link.label}
                </span>
              ) : (
                <Link
                  key={link.room}
                  href={link.href}
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </header>

        <main className="mt-10">{children}</main>
      </div>
    </div>
  );
}
