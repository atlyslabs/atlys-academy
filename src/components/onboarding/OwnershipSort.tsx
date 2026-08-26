"use client";

import { useMemo, useState, type DragEvent } from "react";
import {
  OWNERSHIP_COLUMNS,
  OWNERSHIP_STATEMENTS,
  type Owner,
} from "@/content/onboarding/puzzles";
import type { DrillId } from "@/content/onboarding/types";
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
 * One card in a column sort, normalised.
 *
 * The two sorts name their pieces differently - an ownership statement is a
 * `text` with an `owner`, a lead is a Cadence `note` with a `status` - so each
 * wrapper maps its own content onto this shape rather than the sort learning
 * both. `K` is the column-key union, which is what stops a card naming a
 * column the config never prints.
 */
export interface SortCard<K extends string> {
  id: string;
  /** The line on the card, as it would actually be read. */
  text: string;
  /** The column it belongs in. */
  column: K;
  /** Shown after answering - the teaching line. */
  because: string;
}

/** Everything a column sort needs beyond its cards. */
export interface ColumnSortConfig<K extends string> {
  drillId: DrillId;
  eyebrow: string;
  title: string;
  description: string;
  /** Columns left to right, in the order they are printed. */
  columns: readonly { key: K; label: string }[];
  cards: readonly SortCard<K>[];
  /**
   * Grid template for the drop zones. Three zones stack happily on a phone and
   * go 3-up at `sm:`; five need a narrow tier of their own. The template is
   * config rather than something derived from `columns.length` because
   * Tailwind only ships the class names it can see in the source.
   */
  zoneGrid: string;
  /**
   * Narrow-tier only: let the last zone take the leftover half-row instead of
   * dangling. Set it when `zoneGrid` puts an odd number of zones 2-up.
   */
  fillLastZone?: boolean;
  /**
   * Extra classes for the dealt card. Where the cards run long this is where
   * the height gets reserved, so the drop zones below do not walk up and down
   * the page as cards are dealt.
   */
  cardClass?: string;
  /** Mono line above the card's text, e.g. "Cadence · lead note". */
  cardKicker?: string;
  /** Label over the tap fallback, e.g. "Or tap the owner". */
  tapHint: string;
  /** Tail of the closing line: "7 of 9 <scoreTail>." */
  scoreTail: string;
  /** Reveal headline when the card landed in the right column. */
  correctLine: (answer: { card: SortCard<K>; label: string }) => string;
  /** Reveal headline when it did not. `label` is the column it belonged in. */
  missLine: (answer: { card: SortCard<K>; label: string }) => string;
}

interface AnsweredCard<K extends string> {
  card: SortCard<K>;
  chose: K;
  correct: boolean;
}

/**
 * A column sort, driven entirely by its config: cards are dealt one at a time
 * and each one goes into a column.
 *
 * Native HTML5 drag events, no library. The buttons under the card are not an
 * afterthought: they are the whole interaction on touch screens and for
 * keyboard users, since HTML5 drag covers neither.
 *
 * Day 3 runs this twice - who owns what in the visa process, and where a lead
 * sits in the pipeline - so everything that named the ownership sort comes in
 * as `sort`. The thin wrappers (`OwnershipSort`, `LeadStatusSort`) exist
 * because the drill registry maps a `DrillId` to a zero-prop component.
 */
export function ColumnSort<K extends string>({
  sort,
}: {
  sort: ColumnSortConfig<K>;
}) {
  const { state, ready, setDrillResult, beginDrillAttempt } = useProgress();
  // Bumping the round reshuffles. Seeded so server and client agree - see
  // `seededShuffle`.
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<AnsweredCard<K>[]>([]);
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState<K | null>(null);
  // Set the moment a play is deliberately spent, and never cleared: it is what
  // tells the stored-result guard below that the deck on screen was paid for.
  const [replaying, setReplaying] = useState(false);

  const queue = useMemo(
    () => seededShuffle(sort.cards, round),
    [sort.cards, round],
  );

  const current = queue[index];
  const finished = index >= queue.length;
  const score = answered.filter((card) => card.correct).length;
  const last = answered[answered.length - 1];
  const storedResult = state.drills[sort.drillId];
  // Both sorts share this component, so the cap has to be counted against the
  // config's own `drillId` - keyed on anything shared, the ownership sort and
  // the lead-status sort would spend each other's plays. Read off progress
  // state rather than counted locally, so a joinee who played this yesterday
  // comes back to the goes they have left instead of a fresh three.
  const attemptsUsed = drillAttemptsUsed(state, sort.drillId);
  const attemptsLeft = drillAttemptsLeft(state, sort.drillId);

  const storedStatus = storedResult?.status;
  // Whether this session has touched the deck at all. `finished` is the local
  // signal that the sort was played to the end, and it implies this one, so
  // testing the broader signal covers both: someone who has just finished
  // keeps their own closing screen with their own answers on it, and someone
  // holding a half-dealt deck when hydration lands does not have it taken
  // away mid-play.
  const playedThisSession = answered.length > 0;
  // Local state alone cannot tell a first visit from a reload, which is how a
  // joinee used to get a fresh playable deck by pressing F5 - no replay click,
  // so no play charged, so the three-play cap meant nothing. A terminal stored
  // status means this sort has already been played out, so the deck is withheld
  // until a play is knowingly spent. Only trusted once `ready`: before the
  // store has been read `state.drills` is empty, and treating that as "never
  // played" is the right way round - a deck that stays playable for a moment
  // is recoverable, one yanked away is not.
  const lockedToStoredResult =
    ready &&
    !replaying &&
    isTerminalDrillStatus(storedStatus) &&
    !playedThisSession;

  /** A card's column is always one the config prints; the fallback is only
   *  there to keep the lookup total. */
  function labelFor(column: K) {
    return sort.columns.find((entry) => entry.key === column)?.label ?? column;
  }

  function answer(chose: K) {
    if (!current) return;

    const next = [
      ...answered,
      { card: current, chose, correct: chose === current.column },
    ];
    setAnswered(next);
    setIndex(index + 1);
    setDragging(false);
    setDragOver(null);

    if (next.length === queue.length) {
      setDrillResult(sort.drillId, {
        status: "complete",
        score: next.filter((card) => card.correct).length,
        maxScore: queue.length,
      });
    }
  }

  function restart() {
    // Spend the play before any local state moves, so the count the button
    // reads is already the new one. Unconditional on purpose: the reducer only
    // charges an attempt when the stored status is already terminal, which
    // means reshuffling a sort that was abandoned half-dealt is free.
    beginDrillAttempt(sort.drillId);
    // The play has been paid for, so stop reading the stored result as a reason
    // to withhold a deck - otherwise a replay of a finished sort would hand
    // back the recorded-result panel it was clicked from.
    setReplaying(true);
    setRound(round + 1);
    setIndex(0);
    setAnswered([]);
    setDragging(false);
    setDragOver(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, column: K) {
    event.preventDefault();
    answer(column);
  }

  return (
    <DrillSection
      eyebrow={sort.eyebrow}
      title={sort.title}
      description={sort.description}
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
      {/* Stands in for the whole interactive body when the sort has already
          been played out in an earlier session: the result that was recorded,
          the plays it cost, and the only way back to a deck. The `finished`
          screen below and the verdict region at the foot both key off local
          state that is empty here, so nothing else renders alongside it. */}
      {lockedToStoredResult && (
        <div className="animate-rise-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            Already played · recorded result
          </p>
          <p className="mt-2 text-lg font-medium">
            {storedResult?.score !== undefined
              ? `${storedResult.score} of ${storedResult.maxScore} ${sort.scoreTail}.`
              : storedStatus}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {canReplayDrill(state, sort.drillId) ? (
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
              // Same call as the closing screen: no button once the plays are
              // gone, because a disabled one still invites clicking.
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                All {MAX_DRILL_ATTEMPTS} plays used · the recorded score stands
              </p>
            )}
          </div>
        </div>
      )}

      {!lockedToStoredResult && !finished && current && (
        <div key={current.id} className="animate-rise-in">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              {index + 1} of {queue.length}
            </p>
            <ProgressDots queue={queue} answered={answered} index={index} />
          </div>

          <div
            draggable
            onDragStart={(event) => {
              // Firefox refuses to start a drag without data attached.
              event.dataTransfer.setData("text/plain", current.id);
              event.dataTransfer.effectAllowed = "move";
              setDragging(true);
            }}
            onDragEnd={() => {
              setDragging(false);
              setDragOver(null);
            }}
            className={cn(
              "mt-3 cursor-grab rounded-[3px] border-2 border-ink/25 bg-surface-soft p-4 text-lg font-medium shadow-[3px_3px_0_0_rgba(20,20,26,0.12)] active:cursor-grabbing",
              // Config last so a deck of long cards can reserve its own height
              // and drop the type a step.
              sort.cardClass,
              dragging && "opacity-50",
            )}
          >
            {/* Spacing sits on the kicker rather than on the text below it, so
                a deck without one leaves the card exactly as it was. */}
            {sort.cardKicker && (
              <span
                aria-hidden="true"
                className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted"
              >
                {sort.cardKicker}
              </span>
            )}
            <p>{current.text}</p>
          </div>

          <div className={cn("mt-4 grid gap-3", sort.zoneGrid)}>
            {sort.columns.map((column, i) => (
              <div
                key={column.key}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOver(column.key);
                }}
                onDragLeave={(event) => {
                  // dragleave also fires when the pointer moves onto a child
                  // of the zone - ignore those, or the highlight flickers.
                  if (
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  ) {
                    return;
                  }
                  setDragOver((prev) => (prev === column.key ? null : prev));
                }}
                onDrop={(event) => handleDrop(event, column.key)}
                className={cn(
                  "rounded-[3px] border-2 border-dashed p-4 text-center transition-colors",
                  // The odd zone out on a 2-up narrow tier: better as a full
                  // row than as a half-empty one. Cleared again from `md:`,
                  // where every zone has its own column.
                  sort.fillLastZone &&
                    i === sort.columns.length - 1 &&
                    "col-span-2 md:col-span-1",
                  dragOver === column.key
                    ? "border-accent bg-accent-soft"
                    : dragging
                      ? "border-accent/40 bg-surface"
                      : "border-ink/25 bg-surface",
                )}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink">
                  {column.label}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  Drop here
                </p>
              </div>
            ))}
          </div>

          {/* Click/keyboard path - drag events don't fire for either. */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              {sort.tapHint}
            </p>
            {sort.columns.map((column) => (
              <Button
                key={column.key}
                variant="secondary"
                size="sm"
                onClick={() => answer(column.key)}
              >
                {column.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {finished && (
        <div className="animate-rise-in flex flex-wrap items-center gap-4">
          <p className="text-lg font-medium">
            {score} of {queue.length} {sort.scoreTail}.
          </p>
          {/* No button once the three plays are gone. A disabled one would
              still invite clicking, and the line beside it already says the
              score is settled - the same call MentorPanel makes about its
              greyed-out controls. */}
          {canReplayDrill(state, sort.drillId) ? (
            <Button variant="secondary" size="sm" onClick={restart}>
              Shuffle and go again
              {attemptsUsed > 0 && (
                <span className="ml-1 font-mono text-[11px] tracking-[0.08em] opacity-70 tabular-nums">
                  {attemptsLeft} left
                </span>
              )}
            </Button>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              All {MAX_DRILL_ATTEMPTS} plays used · the recorded score stands
            </p>
          )}
        </div>
      )}

      {/* Persistent live region so each verdict is announced as it lands. */}
      <div role="status" aria-live="polite" className="mt-5">
        {last && (
          <div
            key={last.card.id}
            className={cn(
              // Verdict borders run at /40: at /30 the 2px rule washes out
              // against its own soft fill.
              "rounded-[3px] border-2 p-3 text-sm",
              last.correct
                ? "border-badge-green/40 bg-badge-green-soft"
                : "border-badge-coral/40 bg-badge-coral-soft",
            )}
          >
            <p className="font-medium">
              {last.correct
                ? sort.correctLine({
                    card: last.card,
                    label: labelFor(last.card.column),
                  })
                : sort.missLine({
                    card: last.card,
                    label: labelFor(last.card.column),
                  })}
            </p>
            <p className="mt-1 text-ink-secondary">{last.card.because}</p>
          </div>
        )}
      </div>
    </DrillSection>
  );
}

function ProgressDots<K extends string>({
  queue,
  answered,
  index,
}: {
  queue: SortCard<K>[];
  answered: AnsweredCard<K>[];
  index: number;
}) {
  return (
    // Decorative - the "n of 9" text alongside carries the information.
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {queue.map((card, i) => (
        <span
          key={card.id}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < answered.length
              ? answered[i].correct
                ? "bg-badge-green"
                : "bg-badge-coral"
              : i === index
                ? "bg-accent"
                : "bg-line",
          )}
        />
      ))}
    </div>
  );
}

// Object.keys loses the literal type, so pin it back once here.
const OWNERS = Object.keys(OWNERSHIP_COLUMNS) as Owner[];

/** Day 3 - who owns what in the visa process (PRD §7.3). */
const OWNERSHIP_SORT: ColumnSortConfig<Owner> = {
  drillId: "ownership-sort",
  eyebrow: "Drill · ownership",
  title: "Whose job is it?",
  description:
    "Drag each statement to whoever actually controls it. Getting this wrong in a chat is how overpromises happen.",
  columns: OWNERS.map((owner) => ({
    key: owner,
    label: OWNERSHIP_COLUMNS[owner],
  })),
  cards: OWNERSHIP_STATEMENTS.map((statement) => ({
    id: statement.id,
    text: statement.text,
    column: statement.owner,
    because: statement.because,
  })),
  // Three short zones: stacked on a phone, 3-up from `sm:` - as it has always
  // been here.
  zoneGrid: "sm:grid-cols-3",
  tapHint: "Or tap the owner",
  scoreTail: "owned correctly",
  // The statement is one line, so the reveal repeats it rather than making the
  // joinee look back up at a card that has already been replaced.
  correctLine: ({ card }) => `Correct. ${card.text}`,
  missLine: ({ label }) => `Not quite. That one belongs to ${label}.`,
};

/**
 * Day 3's ownership sort.
 *
 * The interaction moved into `ColumnSort` when Day 3's lead-status drill
 * turned out to be the same sort over five columns instead of three. This
 * component stays because the drill registry maps a `DrillId` to a zero-prop
 * component - and because `ownership-sort` is the id its stored results are
 * keyed to.
 */
export function OwnershipSort() {
  return <ColumnSort sort={OWNERSHIP_SORT} />;
}
