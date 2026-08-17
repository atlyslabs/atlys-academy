"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { FLAG_LINES, type FlagLine } from "@/content/onboarding/flags";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProgress } from "@/lib/progress/provider";
import { seededShuffle } from "@/lib/shuffle";
import { cn } from "@/lib/utils";
import { DrillSection } from "./DrillSection";

/** Which way a card was thrown. Right is "safe to say", left is "never say". */
type Side = "safe" | "never";

interface CalledCard {
  line: FlagLine;
  called: Side;
  correct: boolean;
}

/** Horizontal drag distance (px) past which a release commits the call. */
const SWIPE_THRESHOLD = 90;

/** Must match the swipe-out keyframe duration in globals.css. */
const EXIT_MS = 280;

/** Cards visible behind the top of the deck. */
const PEEK_COUNT = 2;

const HINT_CLASS =
  "shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted";

function sideOf(line: FlagLine): Side {
  return line.safe ? "safe" : "never";
}

/**
 * Day 1 red-line reflex drill, as a swipe deck.
 *
 * The deck is the point: in a live chat the joinee gets about a second before
 * they send, so the call has to be fast and the reasoning has to arrive after
 * it - not as something to weigh up first. Pointer events rather than HTML5
 * drag, because drag events never fire on touch screens and the card has to
 * follow the finger. Arrow keys fling the focused card, and the two buttons
 * below are the real fallback rather than decoration.
 */
export function FlagSwipe() {
  const { state, setDrillResult } = useProgress();
  // Bumping the round reshuffles. Seeded so server and client agree - see
  // `seededShuffle`.
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [called, setCalled] = useState<CalledCard[]>([]);
  /** Live drag offset of the top card, px from the pointerdown origin. */
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** Call mid-fling - input is ignored until the exit animation commits. */
  const [exiting, setExiting] = useState<Side | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const originX = useRef(0);
  const pointerId = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  /** Whether the flung card held focus, so the next card can reclaim it. */
  const refocus = useRef(false);

  // Read in an effect: `matchMedia` during render would make the server and
  // client markup disagree. The current value and every later change take the
  // same path, so a preference flipped mid-drill lands like one set before it.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = (event: MediaQueryList | MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    apply(query);
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  // The commit runs on a timeout after the fling - drop it if the component
  // unmounts mid-flight.
  useEffect(
    () => () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const queue = useMemo(() => seededShuffle(FLAG_LINES, round), [round]);

  const current = queue[index];
  const finished = index >= queue.length;
  const score = called.filter((card) => card.correct).length;
  const storedResult = state.drills["flag-swipe"];

  // A keyboard fling unmounts the focused card - hand focus to its successor
  // so the user is not dumped back to the top of the page.
  useEffect(() => {
    if (refocus.current) cardRef.current?.focus();
    refocus.current = false;
  }, [index]);

  function commit(side: Side) {
    if (!current) return;

    const next = [
      ...called,
      { line: current, called: side, correct: side === sideOf(current) },
    ];
    setCalled(next);
    setIndex(index + 1);

    if (next.length === queue.length) {
      setDrillResult("flag-swipe", {
        status: "complete",
        score: next.filter((card) => card.correct).length,
        maxScore: queue.length,
      });
    }
  }

  function fling(side: Side) {
    if (!current || exiting) return;
    refocus.current = document.activeElement === cardRef.current;

    // Reduced motion: no fling, the call just lands.
    if (reducedMotion) {
      setDx(0);
      commit(side);
      return;
    }

    // Leave `dx` alone - the swipe-out keyframe only sets `to`, so the card
    // flies off from wherever it was dropped.
    setExiting(side);
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null;
      setExiting(null);
      setDx(0);
      commit(side);
    }, EXIT_MS);
  }

  function restart() {
    setRound(round + 1);
    setIndex(0);
    setCalled([]);
    setDx(0);
    setExiting(null);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!current || exiting) return;
    // Left button only - right-click keeps its context menu.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    originX.current = event.clientX;
    pointerId.current = event.pointerId;
    // Capture so the card keeps tracking once the pointer leaves it mid-drag.
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setDx(0);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || event.pointerId !== pointerId.current) return;
    setDx(event.clientX - originX.current);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || event.pointerId !== pointerId.current) return;
    pointerId.current = null;
    setDragging(false);
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      fling(dx > 0 ? "safe" : "never");
    } else {
      // Under threshold - spring back (the transition applies once
      // `dragging` clears).
      setDx(0);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      fling("safe");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      fling("never");
    }
  }

  const behind = queue.slice(index + 1, index + 1 + PEEK_COUNT);
  // Stamps track drag distance; a fling (keyboard or button) pins its own
  // stamp fully on for the exit.
  const safeStamp =
    exiting === "safe" ? 1 : dx > 0 ? Math.min(dx / SWIPE_THRESHOLD, 1) : 0;
  const neverStamp =
    exiting === "never" ? 1 : dx < 0 ? Math.min(-dx / SWIPE_THRESHOLD, 1) : 0;

  const lastCalled = called[called.length - 1];

  return (
    <DrillSection
      eyebrow="Drill · reflex"
      title="Green flag, red flag"
      description="Ten sentences an agent might type into a live chat. Swipe right if it is safe to say, left if it is never said. You get about one second in a real conversation, so do not deliberate. The reason lands after you call it."
      status={
        storedResult?.score !== undefined ? (
          <Badge tone={storedResult.score === 10 ? "green" : "amber"}>
            Best {storedResult.score}/{storedResult.maxScore}
          </Badge>
        ) : null
      }
    >
      {!finished && current && (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            {index + 1} of {queue.length} · swipe, arrow keys, or the buttons
          </p>

          {/* Clip flings horizontally so a card exiting at 120% never gives
              the page a sideways scrollbar. */}
          <div className="mt-3 overflow-x-clip">
            <div className="flex items-center gap-3 pb-6">
              <span aria-hidden="true" className={HINT_CLASS}>
                ◀ Never
              </span>

              <div className="relative flex-1">
                {/* Card backs peeking out under the top card. Painted in DOM
                    order, deepest first. */}
                {behind
                  .slice()
                  .reverse()
                  .map((line, i) => {
                    const depth = behind.length - i;
                    return (
                      <div
                        key={line.id}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-[3px] border-2 border-ink/15 bg-surface-soft"
                        style={{
                          transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`,
                        }}
                      />
                    );
                  })}

                <div
                  key={current.id}
                  ref={cardRef}
                  role="group"
                  tabIndex={0}
                  aria-label={`Line ${index + 1} of ${queue.length}: “${current.text}”. Press the right arrow if it is safe to say, the left arrow if it is never said.`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  onKeyDown={handleKeyDown}
                  // `touch-none` so a horizontal drag never fights vertical
                  // page scroll; transform inline because it changes every
                  // pointermove.
                  style={{
                    transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
                  }}
                  className={cn(
                    "relative min-h-32 rounded-[3px] border-2 border-ink/25 bg-surface-soft p-4 pt-11 touch-none select-none",
                    // Lifting the card deepens the hard offset rather than
                    // blurring it, so the deck stays printed stock throughout.
                    dragging
                      ? "cursor-grabbing shadow-[6px_6px_0_0_rgba(20,20,26,0.28)]"
                      : "cursor-grab shadow-[3px_3px_0_0_rgba(20,20,26,0.25)]",
                    // No transition mid-drag - the card must track the
                    // pointer exactly; the springy ease is for the snap back.
                    !dragging &&
                      !exiting &&
                      "transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]",
                    exiting === "safe" && "animate-swipe-out-right",
                    exiting === "never" && "animate-swipe-out-left",
                  )}
                >
                  <span
                    aria-hidden="true"
                    style={{ opacity: safeStamp }}
                    className="absolute left-3 top-2 -rotate-12 rounded-[3px] border-2 border-badge-green px-2 py-0.5 font-condensed text-sm uppercase tracking-[0.12em] text-badge-green"
                  >
                    SAFE ✓
                  </span>
                  <span
                    aria-hidden="true"
                    style={{ opacity: neverStamp }}
                    className="absolute right-3 top-2 rotate-12 rounded-[3px] border-2 border-badge-coral px-2 py-0.5 font-condensed text-sm uppercase tracking-[0.12em] text-badge-coral"
                  >
                    NEVER ✗
                  </span>
                  <span
                    aria-hidden="true"
                    className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted"
                  >
                    You, in the chat
                  </span>
                  <p className="mt-2 text-lg font-medium">
                    &ldquo;{current.text}&rdquo;
                  </p>
                </div>
              </div>

              <span aria-hidden="true" className={HINT_CLASS}>
                Safe ▶
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-3">
            <Button size="sm" onClick={() => fling("safe")}>
              ✅ Safe to say
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fling("never")}
            >
              ❌ Never say this
            </Button>
          </div>
        </div>
      )}

      {/* Screen-reader announcement of each call - the visual reveal lands
          below the deck, which a swipe user may not be focused on. The reason
          is read out, because the reason is the drill. */}
      <p className="sr-only" role="status">
        {finished
          ? `Deck finished. ${score} of ${queue.length} called correctly.`
          : lastCalled
            ? `${lastCalled.line.safe ? "Safe to say." : "Never say this."} ${lastCalled.correct ? "You called it right." : "You called it the other way."} ${lastCalled.line.because}`
            : ""}
      </p>

      {/* The reveal stays put until the next card commits, so there is time to
          read it. Tinted by what the line IS, not by whether the joinee got it
          right: the sentence's status is what has to stick, and the reason gets
          the display type for the same reason. */}
      {lastCalled && (
        <div
          key={lastCalled.line.id}
          className={cn(
            "animate-rise-in mt-4 rounded-[3px] border-2 p-4",
            lastCalled.line.safe
              ? "border-badge-green/40 bg-badge-green-soft"
              : "border-badge-coral/40 bg-badge-coral-soft",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className={cn(
                "font-condensed text-xl uppercase tracking-[0.08em]",
                lastCalled.line.safe ? "text-badge-green" : "text-badge-coral",
              )}
            >
              {lastCalled.line.safe ? "Safe to say" : "Never say this"}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              {lastCalled.correct
                ? "You called it right"
                : "You called it the other way"}
            </span>
          </div>
          <p className="mt-3 font-display text-lg leading-snug font-medium text-ink">
            {lastCalled.line.because}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            &ldquo;{lastCalled.line.text}&rdquo;
          </p>
        </div>
      )}

      {finished && (
        <div className="animate-rise-in mt-4 flex flex-wrap items-center gap-4">
          <p className="text-lg font-medium">
            {score} of {queue.length} called correctly.
          </p>
          <Button variant="secondary" size="sm" onClick={restart}>
            Shuffle and go again
          </Button>
        </div>
      )}

      {finished && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <CalledColumn
            heading="✅ Safe to say"
            cards={called.filter((card) => card.line.safe)}
          />
          <CalledColumn
            heading="❌ Never say"
            cards={called.filter((card) => !card.line.safe)}
          />
        </div>
      )}
    </DrillSection>
  );
}

function CalledColumn({
  heading,
  cards,
}: {
  heading: string;
  cards: CalledCard[];
}) {
  return (
    <div>
      <h4 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
        {heading}
      </h4>
      <ul className="mt-2 space-y-2">
        {cards.map(({ line, correct }) => (
          <li
            key={line.id}
            className={cn(
              "rounded-[3px] border-2 p-3 text-sm",
              line.safe
                ? "border-badge-green/40 bg-badge-green-soft"
                : "border-badge-coral/40 bg-badge-coral-soft",
            )}
          >
            <p className="font-medium text-ink">{line.because}</p>
            <p className="mt-1 text-ink-secondary">
              &ldquo;{line.text}&rdquo;
            </p>
            {!correct && (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                You called this one the other way
              </p>
            )}
          </li>
        ))}
        {cards.length === 0 && (
          <li className="rounded-[3px] border-2 border-dashed border-ink/25 p-3 text-sm text-ink-muted">
            Nothing here yet.
          </li>
        )}
      </ul>
    </div>
  );
}
