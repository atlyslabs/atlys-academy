"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { SORTER_STATEMENTS } from "@/content/onboarding/drills";
import type { SorterStatement, Verdict } from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProgress } from "@/lib/progress/provider";
import { seededShuffle } from "@/lib/shuffle";
import { cn } from "@/lib/utils";
import { DrillSection } from "./DrillSection";

interface SortedCard {
  statement: SorterStatement;
  chose: Verdict;
  correct: boolean;
}

/** Horizontal drag distance (px) past which a release commits the verdict. */
const SWIPE_THRESHOLD = 90;

/** Must match the swipe-out keyframe duration in globals.css. */
const EXIT_MS = 280;

/** Cards visible behind the top of the deck. */
const PEEK_COUNT = 2;

const HINT_CLASS =
  "shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted";

/**
 * Dos vs Don'ts sorter (PRD §7.3), as a swipe deck.
 *
 * Pointer events rather than HTML5 drag - drag events never fire on touch
 * screens, and the card has to follow the finger. Arrow keys fling the card
 * for keyboard users, and the two buttons below stay as the labelled
 * fallback rather than decoration.
 */
export function DosDontsSorter() {
  const { state, setDrillResult } = useProgress();
  // Bumping the round reshuffles. Seeded so server and client agree - see
  // `seededShuffle`.
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [sorted, setSorted] = useState<SortedCard[]>([]);
  /** Live drag offset of the top card, px from the pointerdown origin. */
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** Verdict mid-fling - input is ignored until the exit animation commits. */
  const [exiting, setExiting] = useState<Verdict | null>(null);

  const originX = useRef(0);
  const pointerId = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  /** Whether the flung card held focus, so the next card can reclaim it. */
  const refocus = useRef(false);

  // The commit runs on a timeout after the fling - drop it if the component
  // unmounts mid-flight.
  useEffect(
    () => () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const queue = useMemo(() => seededShuffle(SORTER_STATEMENTS, round), [round]);

  const current = queue[index];
  const finished = index >= queue.length;
  const score = sorted.filter((card) => card.correct).length;
  const storedResult = state.drills["dos-donts"];

  // A keyboard fling unmounts the focused card - hand focus to its successor
  // so the user is not dumped back to the top of the page.
  useEffect(() => {
    if (refocus.current) cardRef.current?.focus();
    refocus.current = false;
  }, [index]);

  function choose(chose: Verdict) {
    if (!current) return;

    const next = [
      ...sorted,
      { statement: current, chose, correct: chose === current.verdict },
    ];
    setSorted(next);
    setIndex(index + 1);

    if (next.length === queue.length) {
      setDrillResult("dos-donts", {
        status: "complete",
        score: next.filter((card) => card.correct).length,
        maxScore: queue.length,
      });
    }
  }

  function fling(verdict: Verdict) {
    if (!current || exiting) return;
    refocus.current = document.activeElement === cardRef.current;

    // Reduced motion: no fling, the verdict just lands.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDx(0);
      choose(verdict);
      return;
    }

    // Leave `dx` alone - the swipe-out keyframe only sets `to`, so the card
    // flies off from wherever it was dropped.
    setExiting(verdict);
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null;
      setExiting(null);
      setDx(0);
      choose(verdict);
    }, EXIT_MS);
  }

  function restart() {
    setRound(round + 1);
    setIndex(0);
    setSorted([]);
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
      fling(dx > 0 ? "do" : "dont");
    } else {
      // Under threshold - spring back (the transition applies once
      // `dragging` clears).
      setDx(0);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      fling("do");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      fling("dont");
    }
  }

  const behind = queue.slice(index + 1, index + 1 + PEEK_COUNT);
  // Stamps track drag distance; a fling (keyboard or button) pins its own
  // stamp fully on for the exit.
  const doStamp =
    exiting === "do" ? 1 : dx > 0 ? Math.min(dx / SWIPE_THRESHOLD, 1) : 0;
  const dontStamp =
    exiting === "dont" ? 1 : dx < 0 ? Math.min(-dx / SWIPE_THRESHOLD, 1) : 0;

  const lastSorted = sorted[sorted.length - 1];

  return (
    <DrillSection
      eyebrow="Drill · judgement"
      title="Dos vs Don'ts"
      description="Ten things an agent might do. Swipe right for a Do, left for a Don't. You will get the reasoning either way."
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
                ◀ Don&apos;t
              </span>

              <div className="relative flex-1">
                {/* Card backs peeking out under the top card. Painted in DOM
                    order, deepest first. */}
                {behind
                  .slice()
                  .reverse()
                  .map((statement, i) => {
                    const depth = behind.length - i;
                    return (
                      <div
                        key={statement.id}
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
                  aria-label={`Statement ${index + 1} of ${queue.length}: ${current.text}. Press the right arrow to mark it a Do, the left arrow to mark it a Don't.`}
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
                    "relative min-h-28 rounded-[3px] border-2 border-ink/25 bg-surface-soft p-4 pt-10 touch-none select-none",
                    // Lifting the card deepens the hard offset rather than
                    // blurring it, so the deck stays printed stock throughout.
                    dragging
                      ? "cursor-grabbing shadow-[6px_6px_0_0_rgba(20,20,26,0.28)]"
                      : "cursor-grab shadow-[3px_3px_0_0_rgba(20,20,26,0.2)]",
                    // No transition mid-drag - the card must track the
                    // pointer exactly; the springy ease is for the snap back.
                    !dragging &&
                      !exiting &&
                      "transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]",
                    exiting === "do" && "animate-swipe-out-right",
                    exiting === "dont" && "animate-swipe-out-left",
                  )}
                >
                  <span
                    aria-hidden="true"
                    style={{ opacity: doStamp }}
                    className="absolute left-3 top-2 -rotate-12 rounded-[2px] border-2 border-badge-green px-2 py-0.5 font-condensed text-sm uppercase tracking-[0.12em] text-badge-green"
                  >
                    DO ✓
                  </span>
                  <span
                    aria-hidden="true"
                    style={{ opacity: dontStamp }}
                    className="absolute right-3 top-2 rotate-12 rounded-[2px] border-2 border-badge-coral px-2 py-0.5 font-condensed text-sm uppercase tracking-[0.12em] text-badge-coral"
                  >
                    DON&apos;T ✗
                  </span>
                  <p className="text-lg font-medium">{current.text}</p>
                </div>
              </div>

              <span aria-hidden="true" className={HINT_CLASS}>
                Do ▶
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-3">
            <Button size="sm" onClick={() => fling("do")}>
              ✅ This is a Do
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fling("dont")}>
              ❌ This is a Don&apos;t
            </Button>
          </div>
        </div>
      )}

      {/* Screen-reader announcement of each verdict - the visual reveal lands
          below the deck, which a swipe user may not be focused on. */}
      <p className="sr-only" role="status">
        {finished
          ? `All sorted. ${score} of ${queue.length} correct.`
          : lastSorted
            ? `${lastSorted.correct ? "Correct." : "That one belongs on the other side."} ${lastSorted.statement.because}`
            : ""}
      </p>

      {/* The verdict on the last swipe stays put until the next card
          commits, so there is time to read the reasoning. */}
      {lastSorted && (
        <div
          key={lastSorted.statement.id}
          className={cn(
            "animate-rise-in mt-4 rounded-[3px] border-2 p-3 text-sm",
            lastSorted.correct
              ? "border-badge-green/30 bg-badge-green-soft"
              : "border-badge-coral/30 bg-badge-coral-soft",
          )}
        >
          <p className="font-medium">
            {lastSorted.correct
              ? "Correct."
              : "That one belongs on the other side."}
          </p>
          <p className="mt-1 text-ink-secondary">
            {lastSorted.statement.because}
          </p>
        </div>
      )}

      {finished && (
        <div className="animate-rise-in mt-4 flex flex-wrap items-center gap-4">
          <p className="text-lg font-medium">
            {score} of {queue.length} sorted correctly.
          </p>
          <Button variant="secondary" size="sm" onClick={restart}>
            Shuffle and go again
          </Button>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SortedColumn
            heading="✅ Dos"
            cards={sorted.filter((card) => card.statement.verdict === "do")}
          />
          <SortedColumn
            heading="❌ Don'ts"
            cards={sorted.filter((card) => card.statement.verdict === "dont")}
          />
        </div>
      )}
    </DrillSection>
  );
}

function SortedColumn({
  heading,
  cards,
}: {
  heading: string;
  cards: SortedCard[];
}) {
  return (
    <div>
      <h4 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
        {heading}
      </h4>
      <ul className="mt-2 space-y-2">
        {cards.map(({ statement, correct }) => (
          <li
            key={statement.id}
            className={cn(
              "rounded-[3px] border-2 p-3 text-sm",
              correct
                ? "border-badge-green/30 bg-badge-green-soft"
                : "border-badge-coral/30 bg-badge-coral-soft",
            )}
          >
            <p className="font-medium">
              {correct ? "Correct. " : "You put this on the other side. "}
              {statement.text}
            </p>
            <p className="mt-1 text-ink-secondary">{statement.because}</p>
          </li>
        ))}
        {cards.length === 0 && (
          <li className="rounded-[3px] border-2 border-dashed border-ink/20 p-3 text-sm text-ink-muted">
            Nothing here yet.
          </li>
        )}
      </ul>
    </div>
  );
}
