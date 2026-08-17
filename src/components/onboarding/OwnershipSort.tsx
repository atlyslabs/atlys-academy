"use client";

import { useMemo, useState, type DragEvent } from "react";
import {
  OWNERSHIP_COLUMNS,
  OWNERSHIP_STATEMENTS,
  type Owner,
  type OwnershipStatement,
} from "@/content/onboarding/puzzles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProgress } from "@/lib/progress/provider";
import { seededShuffle } from "@/lib/shuffle";
import { cn } from "@/lib/utils";
import { DrillSection } from "./DrillSection";

interface AnsweredCard {
  statement: OwnershipStatement;
  chose: Owner;
  correct: boolean;
}

// Object.keys loses the literal type, so pin it back once here.
const OWNERS = Object.keys(OWNERSHIP_COLUMNS) as Owner[];

/**
 * Day 3 - who owns what in the visa process (PRD §7.3).
 *
 * Native HTML5 drag events, no library. The buttons under the card are not an
 * afterthought: they are the whole interaction on touch screens and for
 * keyboard users, since HTML5 drag covers neither.
 */
export function OwnershipSort() {
  const { state, setDrillResult } = useProgress();
  // Bumping the round reshuffles. Seeded so server and client agree - see
  // `seededShuffle`.
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<AnsweredCard[]>([]);
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState<Owner | null>(null);

  const queue = useMemo(
    () => seededShuffle(OWNERSHIP_STATEMENTS, round),
    [round],
  );

  const current = queue[index];
  const finished = index >= queue.length;
  const score = answered.filter((card) => card.correct).length;
  const last = answered[answered.length - 1];
  const storedResult = state.drills["ownership-sort"];

  function answer(chose: Owner) {
    if (!current) return;

    const next = [
      ...answered,
      { statement: current, chose, correct: chose === current.owner },
    ];
    setAnswered(next);
    setIndex(index + 1);
    setDragging(false);
    setDragOver(null);

    if (next.length === queue.length) {
      setDrillResult("ownership-sort", {
        status: "complete",
        score: next.filter((card) => card.correct).length,
        maxScore: queue.length,
      });
    }
  }

  function restart() {
    setRound(round + 1);
    setIndex(0);
    setAnswered([]);
    setDragging(false);
    setDragOver(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, owner: Owner) {
    event.preventDefault();
    answer(owner);
  }

  return (
    <DrillSection
      eyebrow="Drill · ownership"
      title="Whose job is it?"
      description="Drag each statement to whoever actually controls it. Getting this wrong in a chat is how overpromises happen."
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
      {!finished && current && (
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
              "mt-3 cursor-grab rounded-[3px] border-2 border-ink/25 bg-surface-soft p-4 shadow-[3px_3px_0_0_rgba(20,20,26,0.12)] active:cursor-grabbing",
              dragging && "opacity-50",
            )}
          >
            <p className="text-lg font-medium">{current.text}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {OWNERS.map((owner) => (
              <div
                key={owner}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOver(owner);
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
                  setDragOver((prev) => (prev === owner ? null : prev));
                }}
                onDrop={(event) => handleDrop(event, owner)}
                className={cn(
                  "rounded-[3px] border-2 border-dashed p-4 text-center transition-colors",
                  dragOver === owner
                    ? "border-accent bg-accent-soft"
                    : dragging
                      ? "border-accent/40 bg-surface"
                      : "border-ink/25 bg-surface",
                )}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink">
                  {OWNERSHIP_COLUMNS[owner]}
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
              Or tap the owner
            </p>
            {OWNERS.map((owner) => (
              <Button
                key={owner}
                variant="secondary"
                size="sm"
                onClick={() => answer(owner)}
              >
                {OWNERSHIP_COLUMNS[owner]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {finished && (
        <div className="animate-rise-in flex flex-wrap items-center gap-4">
          <p className="text-lg font-medium">
            {score} of {queue.length} owned correctly.
          </p>
          <Button variant="secondary" size="sm" onClick={restart}>
            Shuffle and go again
          </Button>
        </div>
      )}

      {/* Persistent live region so each verdict is announced as it lands. */}
      <div role="status" aria-live="polite" className="mt-5">
        {last && (
          <div
            key={last.statement.id}
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
                ? `Correct. ${last.statement.text}`
                : `Not quite. That one belongs to ${OWNERSHIP_COLUMNS[last.statement.owner]}.`}
            </p>
            <p className="mt-1 text-ink-secondary">{last.statement.because}</p>
          </div>
        )}
      </div>
    </DrillSection>
  );
}

function ProgressDots({
  queue,
  answered,
  index,
}: {
  queue: OwnershipStatement[];
  answered: AnsweredCard[];
  index: number;
}) {
  return (
    // Decorative - the "n of 9" text alongside carries the information.
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {queue.map((statement, i) => (
        <span
          key={statement.id}
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
