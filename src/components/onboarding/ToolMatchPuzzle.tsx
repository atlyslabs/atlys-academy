"use client";

import { useMemo, useState } from "react";
import { TOOL_MATCH_PAIRS } from "@/content/onboarding/puzzles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProgress } from "@/lib/progress/provider";
import { seededShuffle } from "@/lib/shuffle";
import { cn } from "@/lib/utils";
import { DrillSection } from "./DrillSection";

/**
 * Chips and slots shuffle from the same attempt counter, offset so the two
 * rows never come out in matching order - a board where row positions line up
 * would give the answers away.
 */
const SLOT_SEED_OFFSET = 53;

const MAX_SCORE = TOOL_MATCH_PAIRS.length;

/**
 * Day 1 matching puzzle - drag each tool chip onto the job it does.
 *
 * Raw HTML5 drag events, no library. Every pointer interaction has a click
 * twin (arm a chip, then pick a slot) so the whole drill works from the
 * keyboard: chips and slots are plain buttons.
 */
export function ToolMatchPuzzle() {
  const { state, setDrillResult } = useProgress();
  // Bumping the attempt reshuffles. Seeded so server and client agree - see
  // `seededShuffle`.
  const [attempt, setAttempt] = useState(0);
  /** Slot pair id → the tool pair id currently sitting in it. */
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [armedId, setArmedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const chips = useMemo(
    () => seededShuffle(TOOL_MATCH_PAIRS, attempt),
    [attempt],
  );
  const slots = useMemo(
    () => seededShuffle(TOOL_MATCH_PAIRS, attempt + SLOT_SEED_OFFSET),
    [attempt],
  );
  const pairById = useMemo(
    () => new Map(TOOL_MATCH_PAIRS.map((pair) => [pair.id, pair])),
    [],
  );

  const placedIds = new Set(Object.values(placements));
  const tray = chips.filter((pair) => !placedIds.has(pair.id));
  const allPlaced = placedIds.size === MAX_SCORE;
  const score = TOOL_MATCH_PAIRS.filter(
    (pair) => placements[pair.id] === pair.id,
  ).length;
  const storedResult = state.drills["tool-match"];
  const armed = armedId ? pairById.get(armedId) : undefined;

  function place(slotId: string, chipId: string) {
    if (checked || !pairById.has(chipId)) return;
    setPlacements((prev) => {
      const next = { ...prev };
      // A chip lives in one slot at a time - moving it evicts it first.
      for (const [key, value] of Object.entries(next)) {
        if (value === chipId) delete next[key];
      }
      next[slotId] = chipId;
      return next;
    });
    setArmedId(null);
    setAnnouncement(
      `${pairById.get(chipId)?.tool} placed on “${pairById.get(slotId)?.job}”.`,
    );
  }

  function returnToTray(slotId: string) {
    if (checked) return;
    const chip = pairById.get(placements[slotId] ?? "");
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    if (chip) setAnnouncement(`${chip.tool} returned to the tray.`);
  }

  function toggleArm(chipId: string) {
    if (checked) return;
    const disarming = armedId === chipId;
    setArmedId(disarming ? null : chipId);
    const tool = pairById.get(chipId)?.tool;
    setAnnouncement(
      disarming ? `${tool} unarmed.` : `${tool} armed. Now pick a job slot.`,
    );
  }

  function check() {
    setChecked(true);
    setDrillResult("tool-match", {
      status: "complete",
      score,
      maxScore: MAX_SCORE,
    });
    setAnnouncement(`${score} of ${MAX_SCORE} matched correctly.`);
  }

  function retry() {
    setAttempt(attempt + 1);
    setPlacements({});
    setArmedId(null);
    setChecked(false);
    setAnnouncement("Board reshuffled. All tools back in the tray.");
  }

  return (
    <DrillSection
      eyebrow="Drill · tools"
      title="Right tool, right job"
      description="Six tools, six jobs. Drag each chip onto the job it does, or click a chip and then its slot."
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
      {/* Announced placements and results for screen readers. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div key={attempt} className="animate-rise-in">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Tools
        </p>
        <ul className="mt-2 flex min-h-10 flex-wrap items-center gap-2">
          {tray.map((pair) => (
            <li key={pair.id}>
              <Button
                variant="secondary"
                size="sm"
                draggable={!checked}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", pair.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => toggleArm(pair.id)}
                aria-pressed={armedId === pair.id}
                className={cn(
                  "cursor-grab active:cursor-grabbing",
                  armedId === pair.id && "ring-2 ring-accent ring-offset-2",
                )}
              >
                {pair.tool}
              </Button>
            </li>
          ))}
          {tray.length === 0 && (
            <li className="text-sm text-ink-muted">
              Tray empty. Every tool is placed.
            </li>
          )}
        </ul>

        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Jobs
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {slots.map((slot) => {
            const placed = pairById.get(placements[slot.id] ?? "");
            const correct = checked && placements[slot.id] === slot.id;
            return (
              <li
                key={slot.id}
                onDragOver={(event) => {
                  if (!checked) event.preventDefault();
                }}
                onDrop={(event) => {
                  if (checked) return;
                  event.preventDefault();
                  place(slot.id, event.dataTransfer.getData("text/plain"));
                }}
                className={cn(
                  // Verdict borders run at /40: at /30 the 2px rule washes out
                  // against its own soft fill.
                  "rounded-[3px] border-2 p-3",
                  !checked && "border-ink/20 bg-surface-soft",
                  checked &&
                    (correct
                      ? "border-badge-green/40 bg-badge-green-soft"
                      : "border-badge-coral/40 bg-badge-coral-soft"),
                )}
              >
                <p className="text-sm text-ink-secondary">{slot.job}</p>
                <div className="mt-2 flex items-center gap-2">
                  {placed ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={checked}
                        onClick={() => returnToTray(slot.id)}
                        aria-label={`${placed.tool}, return to tray`}
                      >
                        {placed.tool}
                      </Button>
                      {checked && (
                        <span className="text-sm">
                          <span aria-hidden="true">{correct ? "✅" : "❌"}</span>
                          <span className="sr-only">
                            {correct ? "Correct" : "Wrong tool"}
                          </span>
                        </span>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (armedId) {
                          place(slot.id, armedId);
                        } else {
                          setAnnouncement(
                            "Pick a tool from the tray first, then choose a slot.",
                          );
                        }
                      }}
                      aria-label={
                        armed
                          ? `Place ${armed.tool} on: ${slot.job}`
                          : `Empty slot for: ${slot.job}`
                      }
                      className={cn(
                        "w-full rounded-[3px] border-2 border-dashed px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                        armed
                          ? "border-accent/60 text-accent"
                          : "border-ink/25 text-ink-muted hover:border-accent/60 hover:text-accent",
                      )}
                    >
                      {armed ? `Place ${armed.tool} here` : "Drop a tool here"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!checked && allPlaced && (
          <Button onClick={check}>Check matches</Button>
        )}
        {checked && (
          <div className="animate-rise-in flex flex-wrap items-center gap-3">
            <p className="text-lg font-medium">
              {score} of {MAX_SCORE} matched.
            </p>
            {score === MAX_SCORE ? (
              <Badge tone="green">Perfect. Every tool matched</Badge>
            ) : (
              <Button variant="secondary" size="sm" onClick={retry}>
                Shuffle and retry
              </Button>
            )}
          </div>
        )}
      </div>
    </DrillSection>
  );
}
