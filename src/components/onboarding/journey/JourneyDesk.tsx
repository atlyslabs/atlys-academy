"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { DAYS } from "@/content/onboarding/days";
import type { Day, DayId } from "@/content/onboarding/types";
import { gateDayKey } from "@/lib/dates";
import { calculatePoints } from "@/lib/progress/points";
import { useProgress } from "@/lib/progress/provider";
import { isDayUnlocked, resumeDay } from "@/lib/progress/selectors";
import { dayStampsComplete, stampTotals } from "@/lib/progress/stamps";
import { romanNumeral } from "@/lib/roman";
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
 * (there is no card rect to grow from on a cold load). Plain `#day-3` now
 * selects that day's tab rather than scrolling - the desk shows one day.
 */
function stopFromHash(hash: string): OpenStop | null {
  const match = /^#day-(\d)\/(.+)$/.exec(hash);
  if (!match) return null;
  const day = DAYS.find((candidate) => candidate.id === Number(match[1]));
  if (!day) return null;
  const stop = stopsForDay(day).find((s) => s.key === match[2]);
  return stop ? { day, stop, origin: null } : null;
}

/** `#day-3` or `#day-3/anything` → 3. The tab a deep link means. */
function dayFromHash(hash: string): DayId | null {
  const match = /^#day-(\d)/.exec(hash);
  if (!match) return null;
  const day = DAYS.find((candidate) => candidate.id === Number(match[1]));
  return day ? day.id : null;
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
export function JourneyDesk({
  openAllDays = false,
}: {
  /**
   * Every day open, gate ignored. Decided on the server from the signed-in
   * email (`hasFullDayAccess`) and handed down as a bare boolean, so the
   * allow-list itself never reaches the browser.
   *
   * Defaults false: every other joinee takes exactly the path they did before
   * this prop existed.
   */
  openAllDays?: boolean;
} = {}) {
  const { state, ready, setLastVisitedDay } = useProgress();
  const now = useHalfMinuteClock();
  // Deep links (`#day-N/stop`) open their window on load. Reading the hash in
  // the initializer is hydration-safe because the window itself only renders
  // once the client clock exists - the server and first client render agree
  // on "nothing open".
  const [openStop, setOpenStop] = useState<OpenStop | null>(() =>
    typeof window === "undefined" ? null : stopFromHash(window.location.hash),
  );
  // The tab the joinee picked. null = follow the resume rule; a deep link
  // counts as picking. One day is on the desk at a time - that is what keeps
  // the page a single screen rather than five dossiers of scroll.
  const [pickedDay, setPickedDay] = useState<DayId | null>(() =>
    typeof window === "undefined" ? null : dayFromHash(window.location.hash),
  );

  const settled = ready && now !== null;
  const gateKey = now ? gateDayKey(now) : undefined;
  const currentDay: DayId = settled
    ? resumeDay(state, gateKey, openAllDays)
    : 1;
  const shownDay: DayId = pickedDay ?? currentDay;

  // Remember where the joinee is, so the landing page resumes here.
  useEffect(() => {
    if (settled) setLastVisitedDay(currentDay);
  }, [settled, currentDay, setLastVisitedDay]);

  function pickDay(dayId: DayId) {
    setPickedDay(dayId);
    window.history.replaceState(null, "", `#day-${dayId}`);
  }

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
  const shown = DAYS.find((day) => day.id === shownDay) ?? DAYS[0];
  const shownUnlocked =
    settled && isDayUnlocked(state, shown.id, gateKey, openAllDays);

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-page text-ink">
      {/* The ground: mostly chart table, only a breath of the blue wash. */}
      <div className="night-wash opacity-40" />
      <div className="chart-table" />
      <div className="night-vignette" />
      <div className="grain" />

      <main className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
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

        {/* The desk itself: the day rail, then ONE day on the board. */}
        <div className="mt-6 sm:mt-8">
          {!settled ? (
            <DeskSkeleton />
          ) : (
            <>
              <DayRail
                state={state}
                gateKey={gateKey}
                currentDay={currentDay}
                shownDay={shown.id}
                onPick={pickDay}
                openAllDays={openAllDays}
              />
              <div
                role="tabpanel"
                id={`day-panel-${shown.id}`}
                aria-labelledby={`day-tab-${shown.id}`}
                className="mt-3"
              >
                {shownUnlocked ? (
                  <DayDossier
                    key={shown.id}
                    day={shown}
                    isCurrent={shown.id === currentDay}
                    onOpenStop={openWindow}
                  />
                ) : (
                  <SealedDay
                    key={shown.id}
                    day={shown}
                    state={state}
                    now={now!}
                    gateKey={gateKey}
                    openAllDays={openAllDays}
                  />
                )}
              </div>
            </>
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

/**
 * The day rail: one index tab per chapter. The shown tab is cut from the same
 * paper as the board below it; sealed days carry their lock; cleared days
 * carry the counter's green check. Arrow keys walk the rail.
 */
function DayRail({
  state,
  gateKey,
  currentDay,
  shownDay,
  onPick,
  openAllDays = false,
}: {
  state: ReturnType<typeof useProgress>["state"];
  gateKey?: string;
  currentDay: DayId;
  shownDay: DayId;
  onPick: (dayId: DayId) => void;
  /** Every tab unlocked - see the prop of the same name on `JourneyDesk`. */
  openAllDays?: boolean;
}) {
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const ids = DAYS.map((day) => day.id);
    const at = ids.indexOf(shownDay);
    const next =
      ids[(at + (event.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length];
    onPick(next);
    document.getElementById(`day-tab-${next}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Days"
      onKeyDown={onKeyDown}
      className="flex flex-wrap items-end gap-1.5"
    >
      {DAYS.map((day) => {
        const shownTab = day.id === shownDay;
        const unlocked = isDayUnlocked(state, day.id, gateKey, openAllDays);
        const cleared = dayStampsComplete(state, day.id);
        return (
          <button
            key={day.id}
            id={`day-tab-${day.id}`}
            role="tab"
            type="button"
            aria-selected={shownTab}
            aria-controls={`day-panel-${day.id}`}
            tabIndex={shownTab ? 0 : -1}
            onClick={() => onPick(day.id)}
            className={`flex min-w-0 items-center gap-2.5 rounded-t-xl border border-b-0 px-4 pb-2.5 pt-2 text-left transition-colors sm:px-5 ${
              shownTab
                ? "border-[rgb(23_23_28/0.1)] bg-[#f6f0dc] text-[#17171c]"
                : "border-hairline bg-white/[0.02] text-ink-dim hover:bg-white/[0.05] hover:text-ink-muted"
            }`}
          >
            <span
              className={`font-display text-[17px] italic leading-none ${
                shownTab ? "text-[#3a40c2]" : ""
              }`}
              aria-hidden="true"
            >
              {romanNumeral(day.id)}
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[9px] uppercase leading-none tracking-[0.18em] opacity-80">
                Day {day.id}
              </span>
              <span className="mt-1 hidden max-w-[18ch] truncate text-[12.5px] font-medium leading-none md:block">
                {day.title}
              </span>
            </span>
            {!unlocked ? (
              <LockGlyph className="ml-0.5 size-3 shrink-0 opacity-80" />
            ) : cleared ? (
              <span
                aria-hidden="true"
                className={`ml-0.5 shrink-0 text-[11px] leading-none ${
                  shownTab ? "text-[#146b47]" : "text-complete"
                }`}
              >
                ✓
              </span>
            ) : day.id === currentDay ? (
              <span
                aria-hidden="true"
                className={`ml-0.5 size-1.5 shrink-0 rounded-full ${
                  shownTab ? "bg-[#3a40c2]" : "bg-brand-text/80"
                }`}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** The pre-hydration desk: the paper board's silhouette, nothing decided. */
function DeskSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex gap-1.5">
        {DAYS.map((day) => (
          <div
            key={day.id}
            className="h-11 w-36 animate-pulse rounded-t-xl border border-b-0 border-hairline bg-white/[0.03]"
          />
        ))}
      </div>
      <div className="paper-board animate-pulse rounded-2xl rounded-tl-none px-7 py-8 sm:px-10">
        <div className="h-3 w-44 rounded-full bg-black/[0.07]" />
        <div className="mt-5 h-9 w-1/2 rounded-lg bg-black/[0.08]" />
        <div className="mt-3 h-4 w-2/3 rounded-full bg-black/[0.06]" />
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-black/[0.05]" />
          ))}
        </div>
      </div>
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
