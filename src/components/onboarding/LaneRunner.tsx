"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  OWNERSHIP_COLUMNS,
  OWNERSHIP_STATEMENTS,
  type Owner,
  type OwnershipStatement,
} from "@/content/onboarding/puzzles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { JoineeAvatar } from "@/components/ui/JoineeAvatar";
import { useProgress } from "@/lib/progress/provider";
import { seededShuffle } from "@/lib/shuffle";
import { playClick } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { DrillSection } from "./DrillSection";

/** Lanes are fixed left to right; only the statement order shuffles. */
const LANES: readonly Owner[] = ["atlys", "officer", "guest"];

/** Short lane names for headers and buttons; recaps use OWNERSHIP_COLUMNS. */
const LANE_LABELS: Record<Owner, string> = {
  atlys: "Atlys",
  officer: "The officer",
  guest: "The guest",
};

/**
 * Lane accent, keyed by owner. Green and coral are the verdict colours
 * everywhere in this app, so no lane may borrow either - a lane that is
 * permanently green reads as a lane that is permanently right.
 */
const LANE_ACCENTS: Record<Owner, string> = {
  atlys: "var(--color-tile-blue)",
  officer: "var(--color-tile-purple)",
  guest: "var(--color-tile-yellow)",
};

/** Fast-track gate letter stencilled on each lane sign. Staging, not content. */
const LANE_GATES: Record<Owner, string> = {
  atlys: "A",
  officer: "B",
  guest: "C",
};

/**
 * Gate letter → lane, so pressing A jumps to the lane whose sign reads A.
 *
 * Derived from the signs rather than declared, because a shortcut that does not
 * match what is printed on screen is worse than no shortcut: the first version of
 * this took 1-3 for the lanes and W/A/S/D for steering, which meant "A" moved
 * left while the sign beside it said gate A.
 */
const LANE_BY_GATE = new Map(
  (Object.entries(LANE_GATES) as [Owner, string][]).map(([owner, gate]) => [
    gate,
    owner,
  ]),
);

/**
 * Somewhere a keystroke means a character, so the game may not have it. Note
 * what is *not* here: checkboxes, radios and buttons, which use Space and Enter
 * and nothing else, and so keep only those.
 */
const TEXT_ENTRY =
  "textarea, select, [contenteditable], " +
  "input:not([type=checkbox]):not([type=radio])";

const INITIAL_LANE: Owner = "officer";
const FLIGHT_MS = 5000;
/**
 * The verdict beat between statements. Short on purpose: the recap under the
 * board and the lane flash both survive it, and every millisecond here is a
 * millisecond the joinee is holding a key that is not moving them.
 */
const PAUSE_MS = 650;

const MAX_SCORE = OWNERSHIP_STATEMENTS.length;

type Phase = "idle" | "running" | "feedback" | "done";

/** Which control lit up, so the keycaps glow under a real key press. */
type Control = "left" | "right" | "lock";

interface RoundResult {
  statement: OwnershipStatement;
  chose: Owner;
  correct: boolean;
}

/**
 * Day 3 speed round - the ownership sort again, but as a fast-track lane at the
 * gate. One statement at a time comes down a three-lane channel; the joinee
 * steers themselves into the lane of whoever owns the call before the card
 * reaches the desk.
 *
 * **Arrow keys are the interaction**, not a shortcut layered on buttons. They are
 * bound on `window` for the whole run rather than on a focusable playfield: a
 * field that only answers once it has been clicked or tabbed to is a field that
 * reads as broken, and the joinee has no reason to suspect a hidden focus ring
 * is what stands between them and the game. The on-screen keycaps are the same
 * three controls as real buttons, which is what makes the run playable by touch
 * and by switch.
 *
 * The flight is rAF driven with progress computed from elapsed time, so a
 * throttled tab cannot desync the card from the clock. Callbacks that fire from
 * rAF ticks and timeouts read game state through refs (lane, results, mode) -
 * closure state would be a render behind.
 *
 * The untimed mode is not a footnote: it is the static alternative required for
 * prefers-reduced-motion (defaulted on via matchMedia in an effect, never during
 * render) and the primary path for screen reader users.
 */
export function LaneRunner() {
  const { state, setDrillResult } = useProgress();
  // Bumping the attempt reshuffles. Seeded so server and client agree - see
  // `seededShuffle`.
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lane, setLane] = useState<Owner>(INITIAL_LANE);
  const [untimed, setUntimed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  /** 0..1 position of the falling card within the current flight. */
  const [progress, setProgress] = useState(0);
  /** Round starts, steering and completion, for the sr-only live region. */
  const [infoText, setInfoText] = useState("");
  const [held, setHeld] = useState<Control | null>(null);

  const rafRef = useRef<number | null>(null);
  const pauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors of state that rAF ticks and timeouts must read fresh.
  const laneRef = useRef<Owner>(INITIAL_LANE);
  const untimedRef = useRef(false);
  const resultsRef = useRef<RoundResult[]>([]);
  /**
   * One verdict per round, guaranteed. A lock-in pressed in the same frame the
   * clock expires would otherwise be graded twice - `phase` is still "running"
   * inside that tick, because `setPhase` lands on the next render.
   */
  const settledRef = useRef(false);

  const queue = useMemo(
    () => seededShuffle(OWNERSHIP_STATEMENTS, attempt),
    [attempt],
  );
  const current = queue[index] as OwnershipStatement | undefined;
  const score = results.filter((round) => round.correct).length;
  const lastResult = results[results.length - 1];
  const storedResult = state.drills["ownership-run"];

  /** Correct answers at the end of the run so far - the combo the HUD shows. */
  const streak = useMemo(() => {
    let count = 0;
    for (let i = results.length - 1; i >= 0; i -= 1) {
      if (!results[i].correct) break;
      count += 1;
    }
    return count;
  }, [results]);

  // Reduced motion defaults the drill into untimed mode; a change mid-flight
  // also stops the current card. The joinee can still toggle timed back on.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = (matches: boolean) => {
      setReducedMotion(matches);
      if (!matches) return;
      untimedRef.current = true;
      setUntimed(true);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setProgress(0);
    };
    apply(query.matches);
    const handleChange = (event: MediaQueryListEvent) => apply(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (pauseRef.current !== null) clearTimeout(pauseRef.current);
    };
  }, []);

  function cancelFlight() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function startFlight(statement: OwnershipStatement) {
    cancelFlight();
    // The start stamp comes from the first rAF tick - the same clock as every
    // later frame, so throttling cannot desync progress from elapsed time.
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      // rAF timestamps are monotonic, but a misbehaving clock (tab switch,
      // suspend) must never produce negative progress - clamp the delta.
      const elapsed = Math.max(0, now - start);
      const flightProgress = Math.min(elapsed / FLIGHT_MS, 1);
      setProgress(flightProgress);
      if (flightProgress >= 1) {
        rafRef.current = null;
        settle(statement, laneRef.current);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function beginRound(roundIndex: number) {
    const statement = queue[roundIndex];
    settledRef.current = false;
    setIndex(roundIndex);
    setPhase("running");
    setProgress(0);
    setInfoText(
      `Statement ${roundIndex + 1} of ${queue.length}: ${statement.text}`,
    );
    if (!untimedRef.current) startFlight(statement);
  }

  function settle(statement: OwnershipStatement, chose: Owner) {
    if (settledRef.current) return;
    settledRef.current = true;
    cancelFlight();
    const next = [
      ...resultsRef.current,
      { statement, chose, correct: chose === statement.owner },
    ];
    resultsRef.current = next;
    setResults(next);
    setPhase("feedback");
    setHeld(null);
    pauseRef.current = setTimeout(() => {
      pauseRef.current = null;
      if (next.length >= queue.length) {
        finishRun(next);
      } else {
        beginRound(next.length);
      }
    }, PAUSE_MS);
  }

  function finishRun(finalResults: RoundResult[]) {
    const finalScore = finalResults.filter((round) => round.correct).length;
    setPhase("done");
    setDrillResult("ownership-run", {
      status: "complete",
      score: finalScore,
      maxScore: MAX_SCORE,
    });
    setInfoText(`Run complete. ${finalScore} of ${MAX_SCORE}.`);
  }

  function startRun() {
    resultsRef.current = [];
    setResults([]);
    laneRef.current = INITIAL_LANE;
    setLane(INITIAL_LANE);
    beginRound(0);
  }

  function runAgain() {
    cancelFlight();
    if (pauseRef.current !== null) {
      clearTimeout(pauseRef.current);
      pauseRef.current = null;
    }
    resultsRef.current = [];
    setResults([]);
    setAttempt(attempt + 1);
    setIndex(0);
    setProgress(0);
    laneRef.current = INITIAL_LANE;
    setLane(INITIAL_LANE);
    setPhase("idle");
    setInfoText("Statements reshuffled. Ready for another run.");
  }

  /**
   * Steering is live in every phase except `done`, deliberately.
   *
   * The 900ms verdict pause between statements is a third of the run, and a
   * control that goes dead for it reads as a control that sticks - the joinee
   * presses, nothing moves, and by the time the next card is falling they have
   * stopped trusting the key. Moving during the pause also lets them line up for
   * the next statement instead of starting every round in whatever lane the last
   * one ended in.
   */
  function steerTo(next: Owner) {
    if (phase === "done" || untimed) return;
    if (next === laneRef.current) return;
    laneRef.current = next;
    setLane(next);
    playClick("tap");
    setInfoText(`In the ${LANE_LABELS[next]} lane.`);
  }

  function steerBy(delta: number) {
    const at = LANES.indexOf(laneRef.current);
    const next = LANES[Math.min(LANES.length - 1, Math.max(0, at + delta))];
    steerTo(next);
  }

  function lockIn() {
    if (phase !== "running" || untimed || !current) return;
    playClick("stamp");
    settle(current, laneRef.current);
  }

  /** Untimed rounds skip the channel - each lane button answers directly. */
  function answer(owner: Owner) {
    if (phase !== "running" || !current) return;
    settle(current, owner);
  }

  function setModeUntimed(next: boolean) {
    untimedRef.current = next;
    setUntimed(next);
    if (phase !== "running" || !current) return;
    if (next) {
      // Mid-flight switch: stop the clock, the round finishes on buttons.
      cancelFlight();
      setProgress(0);
    } else {
      // Back to timed: the current statement gets a fresh five seconds.
      startFlight(current);
    }
  }

  /**
   * The keyboard, bound for as long as the lane is open - idle and the verdict
   * pause included, so there is never a moment where a press does nothing.
   *
   * Three exclusions matter. Anything typed into a form control belongs to that
   * control - the mode checkbox included, so Space toggles it instead of locking
   * a lane in. Enter or Space on a focused button already fires that button's
   * click, so those two keys are left alone there rather than counted twice. And
   * auto-repeat is honoured for steering (holding an arrow walks to the end lane
   * and stops there) but never for stamping, or one held Enter would grade the
   * whole queue.
   *
   * Arrows are taken everywhere, since no control in the drill uses them. So are
   * the three gate letters, which jump straight to the lane whose sign carries
   * them.
   */
  useEffect(() => {
    if (untimed || phase === "done") return;

    const isFrom = (target: EventTarget | null, selector: string) =>
      target instanceof Element && target.closest(selector) !== null;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Only somewhere text can be typed takes every key. The earlier version
      // bailed on any form control, which meant that after clicking the "No time
      // pressure" checkbox - a click focuses it - the arrows were dead until the
      // joinee happened to click elsewhere. A checkbox uses Space and nothing
      // else, so Space is all it gets.
      if (isFrom(event.target, TEXT_ENTRY)) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          setHeld("left");
          steerBy(-1);
          return;
        case "ArrowRight":
          event.preventDefault();
          setHeld("right");
          steerBy(1);
          return;
        case "Enter":
        case " ":
          if (event.repeat) return;
          // A focused control already answers these two keys itself; taking them
          // here as well would count the press twice.
          if (isFrom(event.target, "button, a[href], input")) return;
          // Space is left to the window before the run starts: the drill can be
          // taller than the pop-up it sits in, and paging the window with Space
          // is how that gets read. Once the lane is open the game has it.
          if (phase === "idle" && event.key === " ") return;
          event.preventDefault();
          setHeld("lock");
          // Enter opens the lane before the run and stamps once it is open, so
          // the same key carries the joinee from the briefing into the game.
          if (phase === "idle") startRun();
          else lockIn();
          return;
        default: {
          // Gate letters jump straight to a lane, as printed on the signs.
          const owner = LANE_BY_GATE.get(event.key.toUpperCase());
          if (!owner) return;
          event.preventDefault();
          steerTo(owner);
        }
      }
    };

    // A key released after focus has moved (or the tab has gone) never reports
    // its keyup, and a keycap stuck lit reads as a control still held down.
    const release = () => setHeld(null);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", release);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", release);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
    // Rebound per round so the handler closes over the live statement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, untimed, index]);

  function flashFor(owner: Owner): "correct" | "wrong" | null {
    if (phase !== "feedback" || !lastResult) return null;
    if (lastResult.correct) {
      return lastResult.chose === owner ? "correct" : null;
    }
    // Wrong answers flash the lane the card actually belonged to.
    return lastResult.statement.owner === owner ? "wrong" : null;
  }

  const secondsLeft = Math.max(
    0,
    Math.ceil(((1 - progress) * FLIGHT_MS) / 1000),
  );
  /** Last second of the flight - the timer bar and the card go to coral. */
  const closing = phase === "running" && secondsLeft <= 1;

  return (
    <DrillSection
      eyebrow="Drill · speed round"
      title="Whose call is it? The fast track"
      description="Statements come down the fast-track channel one at a time. Use ← and → to move into the lane of whoever owns the call (Atlys, the officer, or the guest), then press Enter to stamp it, or let the card reach the desk on its own."
      status={
        storedResult?.score !== undefined ? (
          <Badge
            tone={
              storedResult.score === storedResult.maxScore ? "green" : "amber"
            }
          >
            Best {storedResult.score}/{storedResult.maxScore}
          </Badge>
        ) : null
      }
    >
      {/* Round starts, steering and completion for screen readers. */}
      <p aria-live="polite" className="sr-only">
        {infoText}
      </p>

      {/* Scoreboard strip. Sits on the board colour so it reads as part of the
          machine rather than as another paragraph on the paper. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-[3px] border-2 border-b-0 border-board-line bg-board px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Readout
            label="Statement"
            value={
              phase === "done"
                ? `${MAX_SCORE}/${MAX_SCORE}`
                : `${Math.min(index + 1, MAX_SCORE)}/${MAX_SCORE}`
            }
          />
          <Readout label="Stamped" value={`${score}`} />
          <Readout
            label="Streak"
            value={streak > 1 ? `×${streak}` : "-"}
            lit={streak > 1}
          />
          {!untimed && phase !== "done" && (
            <Readout
              label="Clock"
              value={`${secondsLeft}s`}
              lit={closing}
            />
          )}
          <ProgressPips results={results} index={index} total={MAX_SCORE} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-board-muted">
          <input
            type="checkbox"
            checked={untimed}
            onChange={(event) => setModeUntimed(event.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          No time pressure
        </label>
      </div>

      {!untimed && phase !== "done" && (
        <>
          {/* Boarding clock, drained left to right. Carries no text of its own -
              the seconds sit in the readout above, where they cannot end up
              printed on top of a moving fill. */}
          <div
            aria-hidden="true"
            className="relative h-2.5 overflow-hidden border-x-2 border-board-line bg-board-soft"
          >
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${(1 - progress) * 100}%`,
                background: closing
                  ? "var(--color-tile-coral)"
                  : "var(--color-tile-green)",
                transition: reducedMotion ? undefined : "background-color 200ms",
              }}
            />
          </div>

          <div
            className={cn(
              "relative h-[24rem] select-none overflow-hidden border-2 border-board-line bg-board sm:h-[27rem]",
              // Travel is the distance from the card's resting top to the desk
              // rail, as a length rather than a hard-coded pixel count, so the
              // taller `sm` channel lands the card in the same place.
              "[--lane-travel:9.5rem] sm:[--lane-travel:11.5rem]",
            )}
          >
            {/* Terminal floor: fine tiling under everything. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, var(--color-board-line) 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, var(--color-board-line) 0 1px, transparent 1px 10px)",
              }}
            />

            <div className="absolute inset-0 grid grid-cols-3">
              {LANES.map((owner, laneIndex) => {
                const flash = flashFor(owner);
                const active = lane === owner;
                const accent = LANE_ACCENTS[owner];
                return (
                  <div
                    key={owner}
                    onClick={() => steerTo(owner)}
                    className={cn(
                      "relative transition-colors",
                      laneIndex > 0 && "border-l-2 border-board-line",
                      phase === "running" && "cursor-pointer",
                      flash === "correct" && "bg-tile-green/20",
                      flash === "wrong" && "bg-tile-coral/25",
                    )}
                  >
                    {/* Lit floor under the lane the joinee is standing in - the
                        cue that survives being looked at out of the corner of
                        an eye, unlike a 1px border. */}
                    {active && !flash && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background: `linear-gradient(to bottom, transparent, color-mix(in srgb, ${accent} 16%, transparent))`,
                        }}
                      />
                    )}

                    {/* Overhead gate sign. Flips to the lane colour when the
                        joinee is under it - with no transition, deliberately.
                        The plate's fill is an inline colour and snaps, so a
                        transitioned label would spend its ramp as an unreadable
                        mid-tone on the new background every time a lane changed:
                        exactly the muddy half-second the steering must not have. */}
                    <div className="relative px-1.5 pt-2">
                      <div
                        className={cn(
                          "flex items-center justify-center gap-1.5 border-2 px-1 py-1",
                          active
                            ? "border-board text-board"
                            : "border-board-line bg-board-soft text-board-ink/70",
                        )}
                        style={active ? { backgroundColor: accent } : undefined}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "shrink-0 border-2 px-1 font-mono text-[9px] leading-tight",
                            active
                              ? "border-board/40 text-board"
                              : "border-board-line text-board-ink/50",
                          )}
                        >
                          {LANE_GATES[owner]}
                        </span>
                        <span className="truncate font-condensed text-[13px] uppercase leading-none tracking-[0.06em] sm:text-base">
                          {LANE_LABELS[owner]}
                        </span>
                      </div>
                    </div>

                    {/* Painted floor chevrons pointing at the desk. */}
                    <span aria-hidden="true">
                      {[0, 1, 2].map((step) => (
                        <svg
                          key={step}
                          viewBox="0 0 24 12"
                          className="absolute left-1/2 w-6 -translate-x-1/2"
                          style={{ top: `${34 + step * 12}%` }}
                          fill="none"
                          stroke={active ? accent : "var(--color-board-line)"}
                          strokeWidth={3}
                          strokeLinecap="square"
                        >
                          <path d="M3 2 12 10 21 2" />
                        </svg>
                      ))}
                    </span>

                    {flash && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "animate-tile-pop absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-board px-2.5 py-1 font-condensed text-lg text-board",
                          flash === "correct" ? "bg-tile-green" : "bg-tile-coral",
                        )}
                      >
                        {flash === "correct" ? "+1" : "Here"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* The desk the cards are heading for: a hatched rail across all
                three lanes, with the joinee standing behind it. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] h-3 border-y-2 border-board-line"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, var(--color-board-line) 0 6px, transparent 6px 12px)",
              }}
            />
            {/* Left-aligned, above the rail: dead centre is where the card lands
                and where the runner stands, and the label must not be under
                either. */}
            <p
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[5.7rem] left-3 bg-board px-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-board-muted"
            >
              Stamp desk
            </p>

            {/* The runner. One per board, moved between lanes by the grid
                column it is placed in, so the travel is a transform. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-2 grid grid-cols-3"
            >
              {LANES.map((owner) => (
                <div key={owner} className="flex justify-center">
                  {lane === owner && (
                    <span
                      className="grid size-14 place-items-center rounded-full border-[3px] border-board bg-board-soft shadow-[4px_4px_0_0_var(--color-board-line)]"
                      style={{ borderColor: LANE_ACCENTS[owner] }}
                    >
                      <JoineeAvatar config={state.avatar} size={40} />
                    </span>
                  )}
                </div>
              ))}
            </div>

            {phase === "running" && current && (
              <div
                // No `-translate-x-1/2` class here: Tailwind v4 compiles it to
                // the standalone `translate` property, which composes with the
                // inline `transform` below instead of being overridden by it -
                // the card would be centred twice and sit a half-width left.
                className="pointer-events-none absolute left-1/2 top-[4.75rem] w-[min(88%,26rem)]"
                style={{
                  // No movement under reduced motion - the clock bar carries the
                  // time pressure instead.
                  transform: reducedMotion
                    ? "translateX(-50%)"
                    : `translate(-50%, calc(var(--lane-travel) * ${progress}))`,
                }}
              >
                {/* Falling card sits on the dark board, so its offset shadow is
                    drawn in the board rule colour, not ink. */}
                <div
                  className={cn(
                    "border-2 bg-paper px-4 py-3 text-center shadow-[4px_4px_0_0_var(--color-board-line)] transition-colors",
                    closing ? "border-tile-coral" : "border-ink",
                  )}
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
                    Statement {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium text-paper-ink sm:text-base">
                    {current.text}
                  </p>
                </div>
              </div>
            )}

            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-board/85 px-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-board-muted">
                  Fast track · nine statements · five seconds each
                </p>
                <div className="flex items-center gap-2">
                  <Keycap glyph="←" />
                  <Keycap glyph="→" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-board-ink">
                    pick a lane
                  </span>
                  <Keycap glyph="⏎" wide />
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-board-ink">
                    start, then stamp
                  </span>
                </div>
                <Button onClick={startRun}>Open the lane</Button>
              </div>
            )}
          </div>

          {/* The controls, as the keys themselves. Real buttons, so touch and
              switch users get the same three moves the keyboard has. */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-[3px] border-2 border-t-0 border-board-line bg-board px-3 py-3">
            <div className="flex items-center gap-2">
              {/* Never disabled: this row only exists while the lane is open,
                  and a control that greys out through every verdict pause is a
                  control nobody trusts. */}
              <ControlKey
                glyph="←"
                label="Steer one lane left"
                held={held === "left"}
                onPress={() => steerBy(-1)}
              />
              <ControlKey
                glyph="→"
                label="Steer one lane right"
                held={held === "right"}
                onPress={() => steerBy(1)}
              />
              <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.12em] text-board-muted">
                Steer
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-board-muted">
                Or tap a lane
              </span>
              <ControlKey
                glyph="⏎ Stamp it"
                label="Lock the current lane in"
                held={held === "lock"}
                disabled={phase === "idle"}
                onPress={lockIn}
                wide
              />
            </div>
          </div>
        </>
      )}

      {untimed && phase !== "done" && (
        <div className="rounded-b-[3px] border-2 border-board-line bg-board p-5">
          {phase === "idle" ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-board-muted">
                Same nine calls, no clock. Read each statement and pick the
                owner.
              </p>
              <Button onClick={startRun}>Start the run</Button>
            </div>
          ) : (
            current && (
              <div key={current.id} className="animate-rise-in">
                <div className="border-2 border-ink bg-paper px-4 py-3 shadow-[3px_3px_0_0_var(--color-board-line)]">
                  <p className="text-sm font-medium text-paper-ink">
                    {current.text}
                  </p>
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-board-muted">
                  Whose call is it?
                </p>
                {/* Never disabled. `answer` already ignores a press outside a
                    running round, and disabling the button that was just
                    activated - which is what the 650ms verdict beat used to do -
                    makes the browser blur it and drop focus on the floor, once
                    per statement, on the path screen readers take. */}
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {LANES.map((owner) => (
                    <button
                      key={owner}
                      type="button"
                      onClick={() => answer(owner)}
                      className="border-2 border-dashed border-board-line px-3 py-2.5 text-center font-condensed text-sm uppercase tracking-[0.08em] text-board-ink transition-colors hover:border-board-ink"
                    >
                      {LANE_LABELS[owner]}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="animate-rise-in rounded-b-[3px] border-2 border-board-line bg-board p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-condensed text-3xl uppercase leading-none tracking-[0.04em] text-board-ink">
              {score} / {MAX_SCORE}
            </p>
            <p className="text-sm text-board-muted">owned at speed.</p>
            {score === MAX_SCORE && <Badge tone="green">Perfect run</Badge>}
            <Button variant="secondary" size="sm" onClick={runAgain}>
              Run it again
            </Button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <ul className="animate-rise-in mt-4 grid gap-2">
          {results.map(({ statement, chose, correct }) => (
            <li
              key={statement.id}
              className={cn(
                // Verdict borders run at /40: at /30 the 2px rule washes out
                // against its own soft fill.
                "rounded-[3px] border-2 p-3 text-sm",
                correct
                  ? "border-badge-green/40 bg-badge-green-soft"
                  : "border-badge-coral/40 bg-badge-coral-soft",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium">{statement.text}</p>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                  {correct ? "Correct" : "Missed"}
                </span>
              </div>
              <p className="mt-1 text-ink-secondary">
                {correct
                  ? OWNERSHIP_COLUMNS[statement.owner]
                  : `You steered to ${OWNERSHIP_COLUMNS[chose]}. This one belongs to ${OWNERSHIP_COLUMNS[statement.owner]}.`}
              </p>
              {!correct && (
                <p className="mt-1 text-ink-secondary">{statement.because}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Persistent live region so each verdict is announced as it lands. */}
      <div role="status" aria-live="polite" className="mt-4">
        {lastResult && phase !== "done" && (
          <div
            key={lastResult.statement.id}
            className={cn(
              "rounded-[3px] border-2 p-3 text-sm",
              lastResult.correct
                ? "border-badge-green/40 bg-badge-green-soft"
                : "border-badge-coral/40 bg-badge-coral-soft",
            )}
          >
            <p className="font-medium">
              {lastResult.correct
                ? `Correct. That one is ${OWNERSHIP_COLUMNS[lastResult.statement.owner]}'s.`
                : `Missed. That one belongs to ${OWNERSHIP_COLUMNS[lastResult.statement.owner]}.`}
            </p>
            <p className="mt-1 text-ink-secondary">
              {lastResult.statement.because}
            </p>
          </div>
        )}
      </div>
    </DrillSection>
  );
}

/** One label-over-value readout on the scoreboard strip. */
function Readout({
  label,
  value,
  lit,
}: {
  label: string;
  value: string;
  lit?: boolean;
}) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-board-muted">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-[12px] font-semibold tabular-nums",
          lit ? "text-tile-yellow" : "text-board-ink",
        )}
      >
        {value}
      </span>
    </p>
  );
}

/**
 * Nine pips, one per statement: filled in the verdict colour once graded, hollow
 * ahead of the runner. Decorative - the "Statement 3/9" readout beside it
 * carries the same information as text.
 */
function ProgressPips({
  results,
  index,
  total,
}: {
  results: RoundResult[];
  index: number;
  total: number;
}) {
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "block h-2.5 w-1.5",
            i < results.length
              ? results[i].correct
                ? "bg-tile-green"
                : "bg-tile-coral"
              : i === index
                ? "bg-board-ink"
                : "bg-board-line",
          )}
        />
      ))}
    </span>
  );
}

/** Printed keycap, for the legend on the idle board. Never interactive. */
function Keycap({ glyph, wide }: { glyph: string; wide?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-7 place-items-center border-2 border-board-muted bg-board-soft font-mono text-[12px] text-board-ink shadow-[2px_2px_0_0_var(--color-board-line)]",
        wide ? "px-2" : "w-7",
      )}
    >
      {glyph}
    </span>
  );
}

/**
 * A keycap that is also the button. The same control the arrow key drives, so
 * touch and switch users are not handed a different game - and so the key press
 * has somewhere on screen to land, which is what teaches the keys exist.
 */
function ControlKey({
  glyph,
  label,
  held,
  disabled = false,
  onPress,
  wide,
}: {
  glyph: string;
  label: string;
  held: boolean;
  disabled?: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      // A click must not park focus on the keycap. It would, otherwise, and then
      // Enter would re-fire the arrow the joinee just tapped instead of stamping
      // the card - the one thing the legend beside it promises Enter does.
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        "grid h-9 place-items-center border-2 font-mono text-[13px] uppercase tracking-[0.08em] transition-[transform,box-shadow,background-color] duration-75",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright",
        wide ? "px-3" : "w-10",
        disabled
          ? "border-board-line bg-board text-board-line"
          : held
            ? "translate-x-[2px] translate-y-[2px] border-board bg-tile-yellow text-board shadow-none"
            : "border-board-ink bg-board-soft text-board-ink shadow-[3px_3px_0_0_var(--color-board-line)] hover:bg-board-ink hover:text-board active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      )}
    >
      {glyph}
    </button>
  );
}
