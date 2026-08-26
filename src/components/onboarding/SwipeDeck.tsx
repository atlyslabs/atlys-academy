"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { SwipeDeckConfig, SwipeLine } from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  MAX_DRILL_ATTEMPTS,
  canReplayDrill,
  drillAttemptsLeft,
  drillAttemptsUsed,
  isTerminalDrillStatus,
} from "@/lib/progress/attempts";
import { useProgress } from "@/lib/progress/provider";
import { seededShuffle } from "@/lib/shuffle";
import { cn } from "@/lib/utils";
import { DrillSection } from "./DrillSection";

/**
 * Which way a card was thrown. Named by direction rather than by meaning,
 * because the meaning is the deck's: Day 1 throws safe-to-say against
 * never-say, Day 3 a consistent file against a contradicted one.
 */
type Side = "right" | "left";

interface CalledCard {
  line: SwipeLine;
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

function sideOf(line: SwipeLine): Side {
  return line.safe ? "right" : "left";
}

/**
 * A button label with its leading emoji stripped off.
 *
 * The buttons want the emoji; the reveal's display heading, the card's
 * aria-label and the screen-reader announcement do not. A "white heavy check
 * mark" spoken mid-sentence is noise, and the reveal panel is already tinted
 * by the side it belongs to.
 */
function spokenLabel(label: string): string {
  return label.replace(/^[^A-Za-z0-9]+/, "");
}

/**
 * A stamp with its tick or cross stripped off, for the hints flanking the
 * deck - a second mark next to the ◀ / ▶ arrow reads as clutter. Uppercasing
 * is `HINT_CLASS`'s job, so this only has to drop the glyph.
 */
function hintLabel(stamp: string): string {
  return stamp.replace(/[^A-Za-z0-9 ]+/g, "").trim();
}

/**
 * A two-way swipe deck, driven entirely by its config.
 *
 * The deck is the point: the call has to be fast and the reasoning has to
 * arrive after it - not as something to weigh up first. Pointer events rather
 * than HTML5 drag, because drag events never fire on touch screens and the
 * card has to follow the finger. Arrow keys fling the focused card, and the
 * two buttons below are the real fallback rather than decoration.
 *
 * Day 1's red lines and Day 3's DS-160 consistency check are the same drill
 * over different cards, so everything that named Day 1 - the drill id, the
 * copy, the two side labels and their stamps - comes in as `deck`. The thin
 * per-day wrappers (`FlagSwipe`, `Ds160Consistency`) exist because the drill
 * registry maps an id to a zero-prop component.
 */
export function SwipeDeck({ deck }: { deck: SwipeDeckConfig }) {
  const { state, ready, setDrillResult, beginDrillAttempt } = useProgress();
  // Bumping the round reshuffles. Seeded so server and client agree - see
  // `seededShuffle`.
  const [round, setRound] = useState(0);
  /**
   * Set the moment a replay is asked for, and never cleared for the life of the
   * mount. Without it the recorded-result panel would slam straight back over
   * the freshly dealt deck: the play the joinee just paid for leaves the stored
   * status exactly as terminal as it was.
   */
  const [replaying, setReplaying] = useState(false);
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

  const queue = useMemo(
    () => seededShuffle(deck.lines, round),
    [deck.lines, round],
  );

  const current = queue[index];
  const finished = index >= queue.length;
  const score = called.filter((card) => card.correct).length;
  const storedResult = state.drills[deck.drillId];

  // Read through `attempts.ts` rather than off `storedResult.attempts`, so a
  // deck that was already played before the cap shipped is read as one play
  // used and not as three - and so this deck agrees with the day gate and the
  // voucher, which ask the same question through the same helpers. Keyed on
  // `deck.drillId` like everything else here, because the two decks that share
  // this component each get their own three plays.
  const attemptsUsed = drillAttemptsUsed(state, deck.drillId);
  const attemptsLeft = drillAttemptsLeft(state, deck.drillId);
  const replayable = canReplayDrill(state, deck.drillId);
  const storedStatus = storedResult?.status;

  /**
   * Whether this mount owes the joinee a recorded result rather than a deck.
   *
   * The cap was bypassable by reloading: every "have I finished" question in
   * here is answered from local state, which a refresh wipes, so a joinee who
   * had already played got dealt a fresh playable deck without the replay
   * control - and therefore without `beginDrillAttempt` - ever being involved.
   * Three plays became unlimited plays for the price of pressing F5.
   *
   * `ready` gates it because `state.drills` is empty until the store has been
   * read, and treating that emptiness as "never played" would flash the deck at
   * everyone. `called.length` is the local counterweight: a joinee who has
   * called even one card in this session is mid-play or looking at their own
   * result screen, and neither may be yanked away from them when a slow remote
   * hydration finally lands.
   */
  const lockedToStoredResult =
    ready &&
    !replaying &&
    isTerminalDrillStatus(storedStatus) &&
    called.length === 0;

  const rightSpoken = spokenLabel(deck.right.label);
  const leftSpoken = spokenLabel(deck.left.label);

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
      setDrillResult(deck.drillId, {
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
    // Spend the play before anything local moves. Called unconditionally on
    // purpose: the reducer only charges for a replay of a deck whose STORED
    // status is already terminal, so a reshuffle of a deck that is still
    // part-way through is free and needs no check here.
    beginDrillAttempt(deck.drillId);
    // Both replay controls come through here - the one under a result finished
    // in this session and the one on the recorded-result panel - so this is the
    // single place the lock has to be lifted.
    setReplaying(true);
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
      fling(dx > 0 ? "right" : "left");
    } else {
      // Under threshold - spring back (the transition applies once
      // `dragging` clears).
      setDx(0);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      fling("right");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      fling("left");
    }
  }

  const behind = queue.slice(index + 1, index + 1 + PEEK_COUNT);
  // Stamps track drag distance; a fling (keyboard or button) pins its own
  // stamp fully on for the exit.
  const rightStamp =
    exiting === "right" ? 1 : dx > 0 ? Math.min(dx / SWIPE_THRESHOLD, 1) : 0;
  const leftStamp =
    exiting === "left" ? 1 : dx < 0 ? Math.min(-dx / SWIPE_THRESHOLD, 1) : 0;

  const lastCalled = called[called.length - 1];

  // Hoisted out of the JSX so the recorded-result panel and the live deck share
  // one header rather than two copies of it that could drift apart.
  const statusBadge =
    storedResult?.score !== undefined ? (
      // Against `maxScore`, not a literal: a hardcoded ten went amber on
      // every clean run of any deck that was not ten cards long.
      <Badge
        tone={storedResult.score === storedResult.maxScore ? "green" : "amber"}
      >
        Best {storedResult.score}/{storedResult.maxScore}
      </Badge>
    ) : null;

  // Nothing playable is dealt over a finished drill. The panel carries the
  // replay control instead, so the only route back to a deck is the one that
  // spends a play.
  if (lockedToStoredResult) {
    return (
      <DrillSection
        eyebrow={deck.eyebrow}
        title={deck.title}
        description={deck.description}
        status={statusBadge}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Recorded result
        </p>
        <p className="mt-2 text-lg font-medium">
          {storedResult?.score !== undefined
            ? `${storedResult.score} of ${storedResult.maxScore} called correctly.`
            : storedStatus}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {/* The count only gets its own line while a play is still to be had.
              Once they are gone the note below says the same thing and says
              what it means, so printing both would be talking twice. */}
          {replayable ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                {attemptsUsed} of {MAX_DRILL_ATTEMPTS} plays used
              </p>
              <Button variant="secondary" size="sm" onClick={restart}>
                Shuffle and go again
                <span className="ml-1 font-mono text-[11px] tracking-[0.08em] opacity-70 tabular-nums">
                  {attemptsLeft} left
                </span>
              </Button>
            </>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              All {MAX_DRILL_ATTEMPTS} plays used · your recorded score stands
            </p>
          )}
        </div>
      </DrillSection>
    );
  }

  return (
    <DrillSection
      eyebrow={deck.eyebrow}
      title={deck.title}
      description={deck.description}
      status={statusBadge}
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
                ◀ {hintLabel(deck.left.stamp)}
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
                  // "Card" rather than "Line": Day 3 deals a pair of documents
                  // per card, and the two arrow directions are named by the
                  // deck so the announcement matches the buttons on screen.
                  aria-label={`Card ${index + 1} of ${queue.length}: “${current.text}”. Press the right arrow for ${rightSpoken}, the left arrow for ${leftSpoken}.`}
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
                    exiting === "right" && "animate-swipe-out-right",
                    exiting === "left" && "animate-swipe-out-left",
                  )}
                >
                  <span
                    aria-hidden="true"
                    style={{ opacity: rightStamp }}
                    className="absolute left-3 top-2 -rotate-12 rounded-[3px] border-2 border-badge-green px-2 py-0.5 font-condensed text-sm uppercase tracking-[0.12em] text-badge-green"
                  >
                    {deck.right.stamp}
                  </span>
                  <span
                    aria-hidden="true"
                    style={{ opacity: leftStamp }}
                    className="absolute right-3 top-2 rotate-12 rounded-[3px] border-2 border-badge-coral px-2 py-0.5 font-condensed text-sm uppercase tracking-[0.12em] text-badge-coral"
                  >
                    {deck.left.stamp}
                  </span>
                  <span
                    aria-hidden="true"
                    className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted"
                  >
                    {deck.cardKicker}
                  </span>
                  <p className="mt-2 text-lg font-medium">
                    &ldquo;{current.text}&rdquo;
                  </p>
                </div>
              </div>

              <span aria-hidden="true" className={HINT_CLASS}>
                {hintLabel(deck.right.stamp)} ▶
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-3">
            <Button size="sm" onClick={() => fling("right")}>
              {deck.right.label}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fling("left")}>
              {deck.left.label}
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
            ? `${lastCalled.line.safe ? rightSpoken : leftSpoken}. ${lastCalled.correct ? "You called it right." : "You called it the other way."} ${lastCalled.line.because}`
            : ""}
      </p>

      {/* The reveal stays put until the next card commits, so there is time to
          read it. Tinted by what the line IS, not by whether the joinee got it
          right: the card's status is what has to stick, and the reason gets
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
              {lastCalled.line.safe ? rightSpoken : leftSpoken}
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
          {/* No button once the three plays are gone. A disabled one would
              invite clicking at the exact moment there is nothing left to
              click, so the control goes and a line of small print takes its
              place - the same reversal `MentorPanel` made for a link that was
              never coming. The Badge above already shows the score that
              stands; this says why it is final. */}
          {replayable ? (
            <Button variant="secondary" size="sm" onClick={restart}>
              Shuffle and go again
              {/* Only worth saying once a play is spent - "3 left" on a first
                  finish is noise about a limit nobody is near. */}
              {attemptsUsed > 0 && (
                <span className="ml-1 font-mono text-[11px] tracking-[0.08em] opacity-70 tabular-nums">
                  {attemptsLeft} left
                </span>
              )}
            </Button>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              All {MAX_DRILL_ATTEMPTS} plays used · your recorded score stands
            </p>
          )}
        </div>
      )}

      {finished && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <CalledColumn
            heading={deck.right.heading}
            cards={called.filter((card) => card.line.safe)}
          />
          <CalledColumn
            heading={deck.left.heading}
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
