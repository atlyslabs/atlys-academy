"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { DAYS } from "@/content/onboarding/days";
import type { Day, DayId } from "@/content/onboarding/types";
import { gateDayKey } from "@/lib/dates";
import { calculatePoints } from "@/lib/progress/points";
import { useProgress } from "@/lib/progress/provider";
import { isDayUnlocked, resumeDay } from "@/lib/progress/selectors";
import { stampTotals } from "@/lib/progress/stamps";
import { DayDossier } from "./DayDossier";
import { SealedDay } from "./SealedDay";
import { stopsForDay, type TrailStop } from "./stops";
import { TrailWindow } from "./TrailWindow";

/** An open trail window: which day, which stop, and where it grew from. */
interface OpenStop {
  day: Day;
  stop: TrailStop;
  origin: DOMRect | null;
}

/**
 * `#day-3/drill-lane-runner` → that stop's window, opened without a morph
 * (there is no card rect to grow from on a cold load). Plain `#day-3`
 * hashes keep their native scroll behaviour.
 */
function stopFromHash(hash: string): OpenStop | null {
  const match = /^#day-(\d)\/(.+)$/.exec(hash);
  if (!match) return null;
  const day = DAYS.find((candidate) => candidate.id === Number(match[1]));
  if (!day) return null;
  const stop = stopsForDay(day).find((s) => s.key === match[2]);
  return stop ? { day, stop, origin: null } : null;
}

/**
 * The day desk: the journey page's single composition.
 *
 * One day is on the desk at a time. The joinee sees the current day's full
 * dossier; days already finished fold up above it; days not yet earned sit
 * below as sealed rows that say exactly what breaks their seal - every stamp
 * on the previous page, its quiz passed at the mark, and the clock reaching
 * 10:30 the next morning.
 *
 * Everything gate-shaped waits for two client facts: the progress store
 * (`ready`) and the wall clock (`now`). Until both exist the desk renders a
 * quiet skeleton - which is also exactly what the server renders, so
 * hydration never disagrees and the seals never flash open.
 */
export function JourneyDesk() {
  const { state, ready, setLastVisitedDay } = useProgress();
  const now = useHalfMinuteClock();
  // Deep links (`#day-N/stop`) open their window on load. Reading the hash in
  // the initializer is hydration-safe because the window itself only renders
  // once the client clock exists - the server and first client render agree
  // on "nothing open".
  const [openStop, setOpenStop] = useState<OpenStop | null>(() =>
    typeof window === "undefined" ? null : stopFromHash(window.location.hash),
  );

  const settled = ready && now !== null;
  const gateKey = now ? gateDayKey(now) : undefined;
  const currentDay: DayId = settled ? resumeDay(state, gateKey) : 1;

  // Remember where the joinee is, so the landing page resumes here.
  useEffect(() => {
    if (settled) setLastVisitedDay(currentDay);
  }, [settled, currentDay, setLastVisitedDay]);

  function openWindow(day: Day, stop: TrailStop, origin: DOMRect) {
    setOpenStop({ day, stop, origin });
    window.history.replaceState(null, "", `#day-${day.id}/${stop.key}`);
  }

  function closeWindow() {
    if (openStop) {
      window.history.replaceState(null, "", `#day-${openStop.day.id}`);
    }
    setOpenStop(null);
  }

  const points = calculatePoints(state);
  const stamps = stampTotals(state);

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-page text-ink">
      {/* The ground: mostly chart table, only a breath of the blue wash. */}
      <div className="night-wash opacity-40" />
      <div className="chart-table" />
      <div className="night-vignette" />
      <div className="grain" />

      <main className="relative z-10 mx-auto w-full max-w-[1120px] px-4 pb-24 pt-8 sm:px-8 sm:pt-10">
        {/* Masthead strip: the edition's name on the left, the running
            tallies and the other rooms on the right. */}
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
            aria-label="Journey rooms"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            <span className="flex items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.16em] tabular-nums">
              <span
                className={points.total > 0 ? "text-gold" : "text-ink-dim"}
              >
                {points.total} pts
              </span>
              <span
                className={
                  stamps.total > 0 && stamps.earned === stamps.total
                    ? "text-gold"
                    : "text-ink-dim"
                }
              >
                {stamps.earned}/{stamps.total} stamps
              </span>
            </span>
            <Link
              href="/onboarding/passport"
              className="text-[13px] text-ink-muted transition-colors hover:text-ink"
            >
              Passport
            </Link>
            <Link
              href="/onboarding/leaderboard"
              className="text-[13px] text-ink-muted transition-colors hover:text-ink"
            >
              Leaderboard
            </Link>
          </nav>
        </header>

        {/* The desk itself. */}
        <div className="mt-8 space-y-6 sm:mt-10">
          {!settled ? (
            <DeskSkeleton />
          ) : (
            DAYS.map((day) => {
              const unlocked = isDayUnlocked(state, day.id, gateKey);
              if (!unlocked) {
                return (
                  <SealedDay
                    key={day.id}
                    day={day}
                    state={state}
                    now={now!}
                    gateKey={gateKey}
                  />
                );
              }
              return (
                <DayDossier
                  key={day.id}
                  day={day}
                  isCurrent={day.id === currentDay}
                  onOpenStop={openWindow}
                />
              );
            })
          )}
        </div>
      </main>

      {openStop && now && (
        <TrailWindow
          key={`${openStop.day.id}/${openStop.stop.key}`}
          day={openStop.day}
          stop={openStop.stop}
          origin={openStop.origin}
          now={now}
          onClose={closeWindow}
        />
      )}
    </div>
  );
}

/**
 * The wall clock the calendar gate reads, bucketed to half-minute ticks - a
 * seal that breaks once a day at 10:30 does not need finer resolution. The
 * server snapshot is 0, so SSR and the hydration pass both render the
 * skeleton and the real time arrives in the first client re-render; a plain
 * `Date` in state would either mismatch or need a setState-in-effect.
 */
const CLOCK_TICK_MS = 30_000;

function subscribeToClock(onTick: () => void): () => void {
  const timer = window.setInterval(onTick, CLOCK_TICK_MS);
  return () => window.clearInterval(timer);
}

function useHalfMinuteClock(): Date | null {
  const bucket = useSyncExternalStore(
    subscribeToClock,
    () => Math.floor(Date.now() / CLOCK_TICK_MS),
    () => 0,
  );
  return bucket === 0 ? null : new Date(bucket * CLOCK_TICK_MS);
}

/** The pre-hydration desk: the current day's silhouette, nothing decided. */
function DeskSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5">
      <div className="desk-card animate-pulse px-7 py-10 sm:px-12 sm:py-14">
        <div className="h-3 w-40 rounded-full bg-white/[0.06]" />
        <div className="mt-6 h-12 w-2/3 rounded-lg bg-white/[0.07]" />
        <div className="mt-4 h-4 w-1/2 rounded-full bg-white/[0.05]" />
        <div className="mt-10 h-40 rounded-xl bg-white/[0.03]" />
      </div>
      {[2, 3, 4, 5].map((id) => (
        <div
          key={id}
          className="h-[76px] animate-pulse rounded-2xl border border-hairline/60 bg-white/[0.015]"
        />
      ))}
    </div>
  );
}

/** A small padlock, drawn inline so it inherits currentColor. */
export function LockGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.2" y="5.2" width="7.6" height="5.4" rx="1.2" />
      <path d="M4 5V3.8a2 2 0 0 1 4 0V5" />
    </svg>
  );
}
