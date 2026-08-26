"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ISLAND_PAIRS,
  TERMINAL_ZONES,
  type TerminalZone,
} from "@/content/onboarding/games";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { JoineeAvatar } from "@/components/ui/JoineeAvatar";
import {
  MAX_DRILL_ATTEMPTS,
  canReplayDrill,
  drillAttemptsLeft,
  drillAttemptsUsed,
  isTerminalDrillStatus,
} from "@/lib/progress/attempts";
import { useProgress } from "@/lib/progress/provider";
import { seededShuffle } from "@/lib/shuffle";
import { playClick } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { DrillSection } from "./DrillSection";

const MAX_SCORE = ISLAND_PAIRS.length;

const PAIR_BY_ID = new Map(ISLAND_PAIRS.map((pair) => [pair.id, pair]));

/** The middle of the hall - where the joinee stands between cases. */
const HUB = { x: 50, y: 50 };

/**
 * How far outside a desk still counts as a drop on it, in px.
 *
 * The catch area is measured from the desk's own box rather than declared as a
 * percentage of the floor. A percentage was wrong in both directions at once:
 * generous on a wide screen and, on a phone, *narrower* than the desk drawn
 * inside it - so the outer band of a desk the joinee was plainly standing on
 * silently refused the drop. A margin around the real rect cannot drift.
 */
const HIT_PAD = 12;

/** Desk fills, in `TERMINAL_ZONES` order. Flat tiles, no gradients. */
const ZONE_FILLS = [
  "var(--color-tile-yellow)",
  "var(--color-tile-blue)",
  "var(--color-tile-purple)",
  "var(--color-tile-green)",
] as const;

/** Cases docked at a desk before the rest collapse into a "+n". */
const VISIBLE_CHIPS = 2;

const WALK_MS = 380;
/** Beat spent standing at the desk before walking back into the hall. */
const RETURN_MS = 700;

/**
 * The desks as the two-by-two grid they physically stand in, so the arrow keys
 * mean what the floor looks like: ← → swap side of the hall, ↑ ↓ swap end of it.
 * Derived from the coordinates rather than hard-coded, so moving a desk in
 * content moves its key with it.
 */
const DESK_GRID: readonly (readonly number[])[] = [0, 1].map((row) =>
  [0, 1].map((col) =>
    TERMINAL_ZONES.findIndex(
      (zone) => (zone.y < 50 ? 0 : 1) === row && (zone.x < 50 ? 0 : 1) === col,
    ),
  ),
);

interface Spot {
  x: number;
  y: number;
}

/**
 * The joinee stops on the hall side of the desk rather than on top of it, so the
 * sign, the counter and the docked cases all stay readable.
 */
function standingSpot(zone: TerminalZone): Spot {
  return {
    x: zone.x + Math.sign(HUB.x - zone.x) * 13,
    y: zone.y + Math.sign(HUB.y - zone.y) * 6,
  };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * Day 1 routing drill, staged on an airport floor: one case on the departures
 * board at a time, four staffed desks around the hall, and the joinee **picks
 * themselves up and drops themselves at the desk the case belongs to**.
 *
 * Dragging is the interaction. The drill used to be answered by typing 1-4 at a
 * grid of unlabelled pads, which is a keypad, not a terminal - nothing about it
 * suggested what the four destinations were or what moving between them meant.
 * Now the desks carry the signage the lessons already give them, and the token
 * is grabbed with a pointer, which is how everyone already knows this gesture
 * works.
 *
 * Pointer events, not HTML5 drag: HTML5 drag does not exist on touch, and this
 * has to work on a phone. `setPointerCapture` is what keeps a fast drag glued to
 * the token once the cursor leaves it.
 *
 * The pointer path is an enhancement, never the only path. Each desk is a real
 * button, so a tap and a Tab-then-Enter both route; and the floor itself takes
 * the arrow keys to pick a desk and Enter to send the case there - the keyboard
 * equivalent of the drag, with no numbers to memorise.
 */
export function ConnectIslands() {
  const { state, ready, setDrillResult, beginDrillAttempt } = useProgress();
  // Bumping the round reshuffles. Seeded so server and client agree - see
  // `seededShuffle`.
  const [round, setRound] = useState(0);
  /** Situation pair id → destination it is currently routed to. */
  const [connections, setConnections] = useState<Record<string, string>>({});
  /** Pair ids in the order they were routed, so the last one can be taken back. */
  const [history, setHistory] = useState<string[]>([]);
  /** Where the token is standing when nobody is holding it. Floor percentages. */
  const [spot, setSpot] = useState<Spot>(HUB);
  /** Where the pointer is holding the token, or null when it is not held. */
  const [drag, setDrag] = useState<Spot | null>(null);
  /** Desk index under the held token, or under the keyboard selection. */
  const [over, setOver] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [checked, setChecked] = useState(false);
  /**
   * Set the moment a replay is paid for, and never cleared.
   *
   * The stored status is what packs the floor away on load, and it stays
   * terminal from the previous play right up until this new round is checked -
   * so without a flag saying "this joinee has already spent a play for the
   * floor they are standing on", the fresh floor would be taken away again on
   * the very next render.
   */
  const [replaying, setReplaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const floorRef = useRef<HTMLDivElement | null>(null);
  const returnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The four desk buttons, for hit-testing a drop and for moving focus. */
  const deskRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  /**
   * Whether the token is currently held, readable *now*.
   *
   * The move and release handlers cannot ask the rendered `drag` state whether a
   * grab is in progress: the press that started it only becomes rendered state
   * on the next commit, so any move arriving in the same task - the browser is
   * free to deliver one, and a slow frame makes it likely - would look like a
   * move with nothing held and be thrown away. That is a drag that ignores the
   * first flick of the wrist, which is exactly the movement that tells the
   * joinee whether the thing picked up at all.
   */
  const holdingRef = useRef(false);

  const order = useMemo(() => seededShuffle(ISLAND_PAIRS, round), [round]);

  // The walk is the only motion here, and it carries no information the live
  // region and the docked cases do not already carry - so it is dropped
  // outright, never shortened. Read in an effect: `matchMedia` during render
  // would make the server and client markup disagree.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // The current value and every later change take the same path, so a
    // preference flipped mid-drill lands exactly like one set before it.
    const apply = (event: MediaQueryList | MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    apply(query);
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    return () => {
      if (returnRef.current !== null) clearTimeout(returnRef.current);
    };
  }, []);

  /**
   * Checking the board unmounts the button that was just pressed, which leaves
   * focus on the floor of the dialog - the next Tab restarts at the window's
   * close control, with nothing pointing at the score and the marked-up cases
   * that have appeared. Hand focus to the result instead.
   */
  useEffect(() => {
    if (!checked) return;
    resultsRef.current?.focus();
  }, [checked]);

  const currentIndex = order.findIndex(
    (pair) => connections[pair.id] === undefined,
  );
  const current = currentIndex === -1 ? undefined : order[currentIndex];
  const routedCount = Object.keys(connections).length;
  const allRouted = routedCount === MAX_SCORE;
  const score = ISLAND_PAIRS.filter(
    (pair) => connections[pair.id] === pair.right,
  ).length;
  const wrong = ISLAND_PAIRS.filter(
    (pair) =>
      connections[pair.id] !== undefined && connections[pair.id] !== pair.right,
  );
  const storedResult = state.drills["connect-islands"];
  /**
   * Plays spent and plays left, both read from the stored result rather than
   * counted in local state. Reloading the page in the middle of a round throws
   * every piece of state above away, and a count kept here would hand out a
   * fourth walk to anyone who refreshed.
   */
  const attemptsUsed = drillAttemptsUsed(state, "connect-islands");
  const attemptsLeft = drillAttemptsLeft(state, "connect-islands");
  const storedStatus = storedResult?.status;
  /**
   * Whether the floor is packed away and only the recorded result is shown.
   *
   * A drill that asks local state alone whether it is finished hands a fresh
   * playable floor to anyone who presses F5: the replay control is never
   * clicked, so no play is ever charged, and the three-play cap is bypassable
   * by reloading. Asking stored progress instead is what closes that - a
   * finished drill comes back as the result it recorded, and the only route to
   * a new floor is the control that spends a play.
   *
   * `ready` gates the whole thing because `state.drills` is empty until the
   * store has actually been read, and nothing may be locked on a status nobody
   * has looked up yet. `checked` keeps a joinee who has just finished this
   * round looking at their own marked-up cases rather than a summary of them,
   * and `replaying` is what stops hydration re-locking a floor already paid
   * for.
   */
  // The local counterweight is "has this joinee touched the deck in THIS
  // session", not "have they finished it". That distinction is the whole
  // correctness of this guard. `ready` starts false and, in remote mode,
  // `store.load()` is a network round-trip - so a joinee can mount, start
  // playing, and only then have hydration land. If the counterweight were the
  // finished signal, that half-played run would be replaced by the recorded
  // panel mid-play and continuing would cost them a play. Untouched is the only
  // state it is safe to lock.
  const lockedToStoredResult =
    ready &&
    !replaying &&
    isTerminalDrillStatus(storedStatus) &&
    !checked &&
    Object.keys(connections).length === 0;
  const held = drag !== null;

  function clearReturn() {
    if (returnRef.current === null) return;
    clearTimeout(returnRef.current);
    returnRef.current = null;
  }

  /** Pointer position as floor percentages, clamped to the room. */
  function floorPercent(clientX: number, clientY: number): Spot | null {
    const box = floorRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return null;
    return {
      x: clamp(((clientX - box.left) / box.width) * 100, 2, 98),
      y: clamp(((clientY - box.top) / box.height) * 100, 3, 97),
    };
  }

  /**
   * Which desk the pointer is over, measured against the desks themselves.
   *
   * Takes viewport coordinates rather than floor percentages so the answer is
   * always the desk actually drawn under the cursor, whatever the floor's size or
   * scroll position.
   */
  function deskAt(clientX: number, clientY: number): number | null {
    for (let index = 0; index < deskRefs.current.length; index += 1) {
      const box = deskRefs.current[index]?.getBoundingClientRect();
      if (!box) continue;
      if (
        clientX >= box.left - HIT_PAD &&
        clientX <= box.right + HIT_PAD &&
        clientY >= box.top - HIT_PAD &&
        clientY <= box.bottom + HIT_PAD
      ) {
        return index;
      }
    }
    return null;
  }

  function routeTo(zone: TerminalZone) {
    if (checked) return;
    if (!current) {
      setAnnouncement(`All ${MAX_SCORE} routed. Check the board.`);
      return;
    }
    clearReturn();
    const next = { ...connections, [current.id]: zone.destination };
    setConnections(next);
    setHistory([...history, current.id]);
    setSpot(standingSpot(zone));
    playClick("stamp");
    setAnnouncement(
      `Routed “${current.left}” to ${zone.sign}. ${Object.keys(next).length} of ${MAX_SCORE} routed.`,
    );
    // Back into the hall for the next case, so every drag starts from the same
    // place and the "you are here" pad keeps meaning something.
    returnRef.current = setTimeout(() => {
      returnRef.current = null;
      setSpot(HUB);
    }, RETURN_MS);
  }

  /** Takes back the last routing only - a mis-drop should not cost the round. */
  function undo() {
    if (checked || history.length === 0) return;
    clearReturn();
    const lastId = history[history.length - 1];
    const rest = history.slice(0, -1);
    const next = { ...connections };
    delete next[lastId];
    setConnections(next);
    setHistory(rest);
    setSpot(HUB);
    setAnnouncement(
      `Took back “${PAIR_BY_ID.get(lastId)?.left}”. ${rest.length} of ${MAX_SCORE} routed.`,
    );
  }

  function check() {
    clearReturn();
    setChecked(true);
    setSpot(HUB);
    setDrillResult("connect-islands", {
      status: "complete",
      score,
      maxScore: MAX_SCORE,
    });
    setAnnouncement(`${score} of ${MAX_SCORE} routed to the right desk.`);
  }

  function retry() {
    // Spends a play before anything local is torn down, so the count and the
    // floor can never disagree. Called unconditionally on purpose: the reducer
    // only charges for a replay of a drill whose stored status is already
    // terminal, so clearing a round that was never checked stays free.
    beginDrillAttempt("connect-islands");
    // The play has been paid for, so the stored result must stop hiding the
    // floor - it still reads terminal until this round is checked, and a
    // mid-session replay would otherwise be locked away the instant it started.
    setReplaying(true);
    clearReturn();
    holdingRef.current = false;
    setRound(round + 1);
    setConnections({});
    setHistory([]);
    setSpot(HUB);
    setDrag(null);
    setOver(null);
    setChecked(false);
    setAnnouncement(
      "Floor cleared and cases reshuffled. Every one needs a desk again.",
    );
  }

  function handleTokenPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (checked || !current) return;
    const position = floorPercent(event.clientX, event.clientY);
    if (!position) return;
    // Stops the gesture turning into a text selection or a page pan.
    event.preventDefault();
    // A pending walk-back would otherwise yank the token out of the hand
    // holding it.
    clearReturn();
    // The grab is registered before capture is asked for, and capture failing
    // does not cancel it: `setPointerCapture` throws for a pointer id that is no
    // longer active, and losing the whole gesture - not merely the retargeting -
    // to that would be the worst possible trade.
    holdingRef.current = true;
    try {
      // What keeps a fast drag glued to the token once the cursor outruns it:
      // every later move for this pointer is retargeted here.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Moves outside the token are lost, but the press still counts.
    }
    setDrag(position);
    setOver(deskAt(event.clientX, event.clientY));
    playClick("tap");
    setAnnouncement("Picked up. Move to a desk and let go.");
  }

  function handleTokenPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!holdingRef.current) return;
    const position = floorPercent(event.clientX, event.clientY);
    if (!position) return;
    setDrag(position);
    setOver(deskAt(event.clientX, event.clientY));
  }

  function handleTokenPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    const index = deskAt(event.clientX, event.clientY);
    // Cleared before routing, so the token animates from the hand to the desk
    // rather than teleporting.
    setDrag(null);
    setOver(null);
    if (index === null) {
      setAnnouncement(
        "Put down in the middle of the hall, so nothing routed. Every case belongs at a desk.",
      );
      return;
    }
    routeTo(TERMINAL_ZONES[index]);
  }

  /**
   * Puts the token down wherever it is. `lostpointercapture` is the one that
   * matters: a button released while the window is not focused (alt-tab
   * mid-drag, an interrupting system gesture on touch) delivers no pointerup at
   * all, and without this the token stays lifted and glued to a cursor that is
   * no longer holding anything.
   */
  function handleTokenRelease() {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setDrag(null);
    setOver(null);
  }

  /**
   * Walks the arrow keys around the four desks by moving **focus**, not by
   * keeping a selection of its own.
   *
   * The first version tracked a `selected` index, drew a ring for it and routed
   * on Enter. Three separate bugs came out of that one decision: the ring was
   * gated on the floor matching `:focus-visible`, so clicking the floor and then
   * using the arrows moved an invisible choice; a held Enter auto-repeated and
   * dumped every remaining case at one desk; and while a desk button had focus
   * the arrows moved the hidden selection while Enter went to the focused button
   * - the live region announcing one desk and the case landing at another.
   *
   * Focus *is* the selection here. The button's own focus ring is the cue, its
   * accessible name is the announcement, and its own click handler is what
   * routes - so there is nothing left to keep in sync.
   */
  function focusDesk(index: number) {
    if (index < 0 || index >= TERMINAL_ZONES.length) return;
    setSelected(index);
    deskRefs.current[index]?.focus();
    playClick("tap");
  }

  function stepFocus(dx: number, dy: number) {
    const zone = TERMINAL_ZONES[selected];
    const row = zone.y < 50 ? 0 : 1;
    const col = zone.x < 50 ? 0 : 1;
    const nextRow = dy === 0 ? row : (row + dy + 2) % 2;
    const nextCol = dx === 0 ? col : (col + dx + 2) % 2;
    const next = DESK_GRID[nextRow]?.[nextCol];
    if (next === undefined || next < 0) return;
    focusDesk(next);
  }

  /**
   * The floor's own keys: the four arrows, and nothing else. Enter and Space are
   * deliberately absent - whichever desk the arrows have moved focus to answers
   * them itself, which is both the standard behaviour and the only version of
   * this that cannot route a case to a desk other than the one shown.
   */
  function handleFloorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (checked || event.metaKey || event.ctrlKey || event.altKey) return;
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = step[event.key];
    if (!delta) return;
    event.preventDefault();
    // Arriving from the floor itself, the first press steps *into* the desks
    // rather than past the nearest one.
    const enteringFromFloor = event.target === event.currentTarget;
    if (enteringFromFloor) focusDesk(selected);
    else stepFocus(delta[0], delta[1]);
  }

  /**
   * The chips are decoration; this label is the whole state of a desk - what it
   * takes, which cases are standing there and, after checking, whether they
   * belong.
   */
  function deskLabel(zone: TerminalZone) {
    const parked = ISLAND_PAIRS.filter(
      (pair) => connections[pair.id] === zone.destination,
    );
    const load =
      parked.length === 0
        ? "Nothing routed here yet."
        : `${parked.length} routed here: ${parked
            .map(
              (pair) =>
                `“${pair.left}”${
                  checked
                    ? pair.right === zone.destination
                      ? ", correct"
                      : ", wrong desk"
                    : ""
                }`,
            )
            .join("; ")}.`;
    const action = checked || !current ? "" : ` Route “${current.left}” here.`;
    return `${zone.sign}. ${zone.hint}.${action} ${load}`;
  }

  const boardLabel = current
    ? `Case ${currentIndex + 1} of ${MAX_SCORE}`
    : checked
      ? "Board checked"
      : `All ${MAX_SCORE} routed`;
  const boardText = current
    ? current.left
    : checked
      ? `${score} of ${MAX_SCORE} landed at the right desk.`
      : "Every case is standing at a desk. Check the board when you are ready.";

  const tokenAt = drag ?? spot;

  return (
    <DrillSection
      eyebrow="Drill · routing"
      title="Walk it to the right desk"
      description="One case on the departures board at a time. Pick yourself up and drop yourself at the desk it belongs to. A desk can take more than one, and nothing on this floor stays with you."
      status={
        storedResult?.score !== undefined ? (
          <Badge
            tone={storedResult.score === storedResult.maxScore ? "green" : "amber"}
          >
            Best {storedResult.score}/{storedResult.maxScore}
          </Badge>
        ) : null
      }
    >
      {/* Routings and results for screen readers. Never unmounted. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {lockedToStoredResult ? (
        /* Deliberately nothing playable: the result on record, what it cost,
           and the one control that can buy a floor to walk again. */
        <div className="rounded-xl border border-hairline bg-white/[0.02] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            Recorded result
          </p>
          <p className="mt-2 text-lg font-medium">
            {storedResult?.score !== undefined
              ? `${storedResult.score} of ${storedResult.maxScore} routed right.`
              : storedStatus}
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted tabular-nums">
            {attemptsUsed} of {MAX_DRILL_ATTEMPTS} plays used
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Same rule as the result screen below: the control leaves rather
                than greying out, and the note that replaces it says why.
                `retry` is what spends the play and lifts the lock. */}
            {canReplayDrill(state, "connect-islands") ? (
              <Button variant="secondary" size="sm" onClick={retry}>
                Walk it again
                <span className="ml-1 font-mono text-[11px] tracking-[0.08em] opacity-70 tabular-nums">
                  {attemptsLeft} left
                </span>
              </Button>
            ) : (
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted tabular-nums">
                All {MAX_DRILL_ATTEMPTS} plays used · this score stands
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* The case, on a departures board: the one surface in an airport whose
              whole job is telling you where something is going next. */}
          <div className="border-2 border-board-line bg-board">
            <div className="flex items-center justify-between gap-3 border-b-2 border-board-line px-3 py-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tile-yellow">
                Now routing
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-board-muted tabular-nums">
                {boardLabel} · {routedCount}/{MAX_SCORE} sent
              </p>
            </div>
            <div
              key={current?.id ?? "cleared"}
              className="animate-rise-in flex items-stretch gap-3 px-3 py-3"
            >
              <span
                aria-hidden="true"
                className="grid w-9 shrink-0 place-items-center border-2 border-board-line bg-board-soft font-condensed text-xl leading-none text-tile-yellow"
              >
                {current ? currentIndex + 1 : MAX_SCORE}
              </span>
              <p className="min-w-0 self-center font-mono text-[13px] leading-snug text-board-ink sm:text-sm">
                {boardText}
              </p>
            </div>
          </div>

          <div
            ref={floorRef}
            data-floor
            role="group"
            tabIndex={0}
            aria-label="Terminal routing floor. Four desks. Use the arrow keys to move between them and Enter to send the case to the one you land on, or drag yourself onto a desk."
            onKeyDown={handleFloorKeyDown}
            className={cn(
              // A hall, not a square: at 4/3 a wide window gave the room 830px of
              // height for four desks and a token, and all of it read as emptiness.
              // Bounded at both ends as well as proportional - the widest screen
              // must not stretch the drag distances, and a narrow one must not
              // squeeze the two rows of desks into the middle of the floor.
              "relative mt-3 min-h-[34rem] w-full overflow-hidden border-2 border-t-0 border-board-line bg-board",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright",
              "sm:aspect-[2/1] sm:min-h-[26rem] sm:max-h-[34rem]",
            )}
          >
            <FloorScene routed={routedCount} total={MAX_SCORE} dimmed={held} />

            {/* Stand-by pad the joinee starts and returns to. The label is printed
                *inside* the ring, in the band of pad the token does not cover, so it
                cannot collide with a desk's docked cases on a narrow floor. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-board-line"
            >
              <span className="absolute inset-x-0 bottom-1 text-center font-mono text-[8px] uppercase tracking-[0.1em] text-board-muted">
                You are here
              </span>
            </div>

            {TERMINAL_ZONES.map((zone, index) => (
              <Desk
                key={zone.destination}
                ref={(node) => {
                  deskRefs.current[index] = node;
                }}
                zone={zone}
                fill={ZONE_FILLS[index % ZONE_FILLS.length]}
                label={deskLabel(zone)}
                cases={order.filter(
                  (pair) => connections[pair.id] === zone.destination,
                )}
                checked={checked}
                /** Lit while the held token is over it. */
                targeted={over === index}
                inviting={held}
                onFocused={() => setSelected(index)}
                onRoute={() => routeTo(zone)}
              />
            ))}

            {/*
              The joinee, as a token you can pick up.

              Pointer-only, so it is hidden from assistive technology on purpose: a
              drag has no keyboard or screen-reader meaning, and every move it makes
              is available through the four desk buttons and announced in the live
              region above. `touch-none` is what stops a drag on a phone scrolling
              the page instead of moving the token.
            */}
            <div
              aria-hidden="true"
              data-token
              onPointerDown={handleTokenPointerDown}
              onPointerMove={handleTokenPointerMove}
              onPointerUp={handleTokenPointerUp}
              onPointerCancel={handleTokenRelease}
              onLostPointerCapture={handleTokenRelease}
              className={cn(
                "absolute z-30 -translate-x-1/2 -translate-y-1/2 touch-none select-none",
                checked
                  ? "cursor-default"
                  : held
                    ? "cursor-grabbing"
                    : "cursor-grab",
              )}
              style={{
                left: `${tokenAt.x}%`,
                top: `${tokenAt.y}%`,
                // Never transitioned while held: a token that eases toward the
                // cursor is a token that feels stuck to treacle.
                transition:
                  held || reducedMotion
                    ? undefined
                    : `left ${WALK_MS}ms ease-out, top ${WALK_MS}ms ease-out`,
              }}
            >
              {/* Held reads as lifted: a little bigger, ringed in the accent, and
                  standing further off the floor. No blurred shadow - the house style
                  has none, and a black smear on a near-black floor is just a smear. */}
              <span
                className={cn(
                  "grid size-14 place-items-center rounded-full border-[3px] border-board-ink bg-board-soft",
                  held
                    ? "scale-110 shadow-[0_8px_0_0_var(--color-board-line)] ring-2 ring-accent-bright"
                    : "shadow-[4px_4px_0_0_var(--color-board-line)]",
                )}
              >
                <JoineeAvatar config={state.avatar} size={38} />
              </span>
              {/* Says the gesture out loud, and only until it has been used once.
                  Above the token, because "You are here" is printed below the pad. */}
              {!checked && !held && routedCount === 0 && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-board-ink bg-tile-yellow px-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-board">
                  Drag me
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
              Drag yourself onto a desk, or tap one
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
              Keyboard: <Key>←</Key> <Key>→</Key> <Key>↑</Key> <Key>↓</Key> then{" "}
              <Key>⏎</Key>
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!checked && (
              <>
                <Button onClick={check} disabled={!allRouted}>
                  Check the board
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={undo}
                  disabled={history.length === 0}
                >
                  Take back last
                </Button>
                <p className="text-sm text-ink-muted">
                  {routedCount} of {MAX_SCORE} routed.
                </p>
              </>
            )}
            {checked && (
              <div
                ref={resultsRef}
                tabIndex={-1}
                className="animate-rise-in flex flex-wrap items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <p className="text-lg font-medium">
                  {score} of {MAX_SCORE} routed right.
                </p>
                {score === MAX_SCORE && <Badge tone="green">Perfect routing</Badge>}
                {/* The control goes away once the plays are gone rather than
                    greying out: a disabled button still invites the click that
                    cannot do anything, and the note that replaces it says why. */}
                {canReplayDrill(state, "connect-islands") ? (
                  <Button variant="secondary" size="sm" onClick={retry}>
                    Walk it again
                    {attemptsUsed > 0 && (
                      <span className="ml-1 font-mono text-[11px] tracking-[0.08em] opacity-70 tabular-nums">
                        {attemptsLeft} left
                      </span>
                    )}
                  </Button>
                ) : (
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted tabular-nums">
                    All {MAX_DRILL_ATTEMPTS} plays used · this score stands
                  </p>
                )}
              </div>
            )}
          </div>

          {checked && wrong.length > 0 && (
            <ul className="animate-rise-in mt-4 space-y-3">
              {wrong.map((pair) => (
                <li
                  key={pair.id}
                  className="rounded-[3px] border-2 border-badge-coral/40 bg-badge-coral-soft p-3"
                >
                  <p className="text-sm font-medium text-ink">
                    “{pair.left}” goes to {pair.right}, not {connections[pair.id]}.
                  </p>
                  <p className="mt-1 text-sm text-ink-secondary">{pair.because}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </DrillSection>
  );
}

/** Inline keycap for the control legend. */
function Key({ children }: { children: string }) {
  return (
    <span className="mx-px inline-grid h-4 min-w-4 place-items-center border border-ink/40 px-0.5 align-middle text-[10px] leading-none text-ink-secondary">
      {children}
    </span>
  );
}

/**
 * One staffed desk: overhead sign, counter, a clerk behind it, and the cases
 * already standing there.
 *
 * The whole thing is one button. Everything inside it is decoration - the
 * accessible name on the button carries the sign, what the desk takes, and its
 * current load, so nothing here needs to be read twice.
 */
function Desk({
  ref,
  zone,
  fill,
  label,
  cases,
  checked,
  targeted,
  inviting,
  onFocused,
  onRoute,
}: {
  ref: (node: HTMLButtonElement | null) => void;
  zone: TerminalZone;
  fill: string;
  label: string;
  cases: readonly { id: string; left: string; right: string }[];
  checked: boolean;
  /** The held token is over this desk right now. */
  targeted: boolean;
  /** Something is being carried - every desk shows it can take a drop. */
  inviting: boolean;
  /** Focus landed here, so the arrows step from this desk next. */
  onFocused: () => void;
  onRoute: () => void;
}) {
  const shown = cases.slice(0, VISIBLE_CHIPS);
  const overflow = cases.length - shown.length;
  // Desks in the bottom half dock their cases upward, or the stack would run
  // off the floor.
  const dockAbove = zone.y > 50;

  return (
    <button
      ref={ref}
      type="button"
      aria-disabled={checked}
      onClick={onRoute}
      onFocus={onFocused}
      // One press, one routing. A held Enter or Space auto-repeats into a stream
      // of synthetic clicks, and each one would send the *next* case to this same
      // desk - six cases parked at one counter from a key nobody meant to hold.
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && event.repeat) {
          event.preventDefault();
        }
      }}
      aria-label={label}
      className={cn(
        // Fluid up to a ceiling. Fixed rem widths put two 10rem desks on a 13rem
        // floor at the narrowest phone size: they overlapped each other, overhung
        // the clipped floor edge, and the overlap band routed taps to the wrong
        // desk. A percentage of the floor cannot collide with its own neighbour.
        "absolute w-[min(10rem,44%)] -translate-x-1/2 -translate-y-1/2",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-bright",
        checked ? "cursor-default" : "cursor-pointer",
      )}
      style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
    >
      {/* Overhead sign: the desk's name, and the line saying what it takes. */}
      <span
        aria-hidden="true"
        className={cn(
          "block border-2 px-1 py-1 text-center",
          targeted ? "border-board-ink" : "border-board",
        )}
        style={{ backgroundColor: fill }}
      >
        <span className="block truncate font-condensed text-[13px] uppercase leading-none tracking-[0.04em] text-board sm:text-[15px]">
          {zone.sign}
        </span>
        {/* Two lines' worth of room, always. The hints wrap to two lines at this
            width and a desk whose sign is one line shorter than its neighbour's
            stands its counter at a different height - the whole row goes crooked
            for the sake of one short string. */}
        <span className="mt-0.5 flex min-h-[1.9rem] items-center justify-center font-mono text-[8px] uppercase leading-[1.3] tracking-[0.04em] text-board/75">
          {zone.hint}
        </span>
      </span>

      {/* Sign posts down to the counter. */}
      <span
        aria-hidden="true"
        className="flex h-2 items-stretch justify-between px-2"
      >
        <span className="w-0.5 bg-board-line" />
        <span className="w-0.5 bg-board-line" />
      </span>

      {/* The counter, with someone behind it. */}
      <span aria-hidden="true" className="relative block">
        {/* Clerk: a head over the counter line, so the desk reads as staffed. */}
        <span className="absolute -top-2.5 left-1/2 size-5 -translate-x-1/2 rounded-full border-2 border-board-line bg-board-soft" />
        <span
          className={cn(
            "relative block h-7 border-2",
            targeted
              ? "border-accent-bright bg-board-ink/15"
              : "border-board-line bg-board-soft",
            !checked &&
              inviting &&
              !targeted &&
              "border-dashed border-board-muted",
          )}
        >
          {/* Code stencilled on the counter face. */}
          <span className="absolute inset-0 grid place-items-center font-condensed text-lg leading-none text-board-muted">
            {zone.code}
          </span>
          {/* Queue rail along the front. */}
          <span
            className="absolute inset-x-1 -bottom-1.5 h-1 border-y border-board-line"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--color-board-line) 0 3px, transparent 3px 7px)",
            }}
          />
        </span>

        {/* Drop cue while the token is over this desk. Raised, because the cases
            already docked at a top-row desk land in the same band and would
            otherwise paint straight over it. */}
        {targeted && !checked && (
          <span className="animate-pop-in absolute -bottom-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border-2 border-board bg-accent-bright px-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-board">
            Drop here
          </span>
        )}
      </span>

      {/* Cases standing at this desk. */}
      {cases.length > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            // Exactly the desk's width - `w-full`, not a percentage, because a
            // percentage here resolves against the desk (its own containing
            // block), not the floor.
            "absolute inset-x-0 flex flex-col gap-1",
            dockAbove ? "bottom-full mb-1" : "top-full mt-3",
          )}
        >
          {shown.map((pair) => (
            <span
              key={pair.id}
              title={pair.left}
              className={cn(
                "animate-pop-in block truncate border-2 px-1 py-0.5 text-left font-mono text-[10px] leading-tight",
                !checked && "border-board-ink bg-board-soft text-board-ink",
                checked &&
                  (pair.right === zone.destination
                    ? "border-board bg-tile-green text-board"
                    : "border-board bg-tile-coral text-board"),
              )}
            >
              {pair.left}
            </span>
          ))}
          {overflow > 0 && (
            <span className="block border-2 border-dashed border-board-line px-1 py-0.5 text-left font-mono text-[10px] leading-tight text-board-muted">
              +{overflow}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

/**
 * The terminal itself - glass wall, split-flap counter, seating, walkways.
 *
 * All decoration, and all of it positioned in the same percentage space as the
 * desks. Two layers on purpose: the corridors are drawn in a stretched SVG
 * because they are axis-aligned and cannot be skewed by a non-uniform box, while
 * every piece of furniture is a fixed-size element pinned to a percentage, so a
 * narrow phone floor scales the room without squashing the chairs.
 */
function FloorScene({
  routed,
  total,
  dimmed,
}: {
  routed: number;
  total: number;
  /** Something is being carried: the room steps back so the desks read. */
  dimmed: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: dimmed ? 0.55 : 1,
        transition: "opacity 160ms ease-out",
      }}
    >
      {/* Floor tiling. */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, var(--color-board-line) 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, var(--color-board-line) 0 1px, transparent 1px 10px)",
        }}
      />

      {/* Concourses from the hall to each desk. Axis-aligned, so stretching the
          viewBox to the box cannot skew them; the strokes hold their width
          through `non-scaling-stroke`. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="absolute inset-0 h-full w-full"
      >
        {TERMINAL_ZONES.map((zone) => (
          <polyline
            key={zone.destination}
            points={`${HUB.x},${HUB.y} ${zone.x},${HUB.y} ${zone.x},${zone.y}`}
            fill="none"
            // board-soft against board is a two-step difference and disappeared
            // entirely once the floor tiling ran over it; mixed toward the rule
            // colour, the walkway reads as a surface.
            stroke="color-mix(in srgb, var(--color-board-line) 60%, var(--color-board))"
            strokeWidth={22}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {TERMINAL_ZONES.map((zone) => (
          <polyline
            key={zone.destination}
            points={`${HUB.x},${HUB.y} ${zone.x},${HUB.y} ${zone.x},${zone.y}`}
            fill="none"
            stroke="var(--color-board-line)"
            strokeWidth={2}
            strokeDasharray="6 8"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Curtain wall along the far end, with a tail on the apron behind it. */}
      <div className="absolute inset-x-0 top-0 h-8 border-b-2 border-board-line bg-board-soft">
        <span
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--color-board-line) 0 2px, transparent 2px 34px)",
          }}
        />
        <svg
          viewBox="0 0 60 24"
          className="absolute left-[44%] top-0.5 h-7 w-20 text-board-muted/50"
          fill="currentColor"
        >
          {/* Tail fin and fuselage of an aircraft parked at the gate. */}
          <path d="M4 20h52l-6-6H16z" />
          <path d="M30 14 34 2h4l2 12z" />
        </svg>
      </div>

      {/* Split-flap counter over the hall: how much of the shift is cleared. */}
      <div className="absolute left-1/2 top-10 -translate-x-1/2 border-2 border-board-line bg-board px-2 py-1 text-center">
        <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-board-muted">
          Cases routed
        </p>
        <p className="font-condensed text-base leading-none tracking-[0.08em] text-tile-yellow tabular-nums">
          {String(routed).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
      </div>

      {/* Gate seating along both side walls. */}
      {[
        { x: 6, y: 44 },
        { x: 94, y: 44 },
      ].map((bank) => (
        <span
          key={bank.x}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1"
          style={{ left: `${bank.x}%`, top: `${bank.y}%` }}
        >
          {[0, 1, 2].map((seat) => (
            <span
              key={seat}
              className="block h-2.5 w-5 rounded-t-[2px] border-2 border-board-line bg-board-soft"
            />
          ))}
        </span>
      ))}

      {/* Planters, because every terminal has them. Below the desks, above the
          walkway - the one horizontal band on this floor nothing else claims. */}
      {[
        { x: 8, y: 90 },
        { x: 92, y: 90 },
      ].map((plant) => (
        <span
          key={plant.x}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${plant.x}%`, top: `${plant.y}%` }}
        >
          <span className="block size-3 rounded-full border-2 border-tile-green/60" />
          <span className="mx-auto block h-2 w-3 border-2 border-board-line bg-board-soft" />
        </span>
      ))}

      {/* Moving walkway across the near end. */}
      <div className="absolute inset-x-[8%] bottom-6 h-4 border-y-2 border-board-line bg-board-soft">
        <span
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 12px, var(--color-board-line) 12px 14px)",
          }}
        />
      </div>

      <p className="absolute bottom-1 left-3 font-mono text-[8px] uppercase tracking-[0.24em] text-board-line">
        Terminal 4 · Routing floor
      </p>
    </div>
  );
}
