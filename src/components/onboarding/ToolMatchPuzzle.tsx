"use client";

import { useMemo, useState } from "react";
import { TOOL_MATCH_PAIRS } from "@/content/onboarding/puzzles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  canReplayDrill,
  drillAttemptsLeft,
  drillAttemptsUsed,
  isTerminalDrillStatus,
  MAX_DRILL_ATTEMPTS,
} from "@/lib/progress/attempts";
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
  const { state, ready, setDrillResult, beginDrillAttempt } = useProgress();
  // Bumping the attempt reshuffles. Seeded so server and client agree - see
  // `seededShuffle`.
  const [attempt, setAttempt] = useState(0);
  /** Slot pair id → the tool pair id currently sitting in it. */
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [armedId, setArmedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // Set the moment a play is deliberately spent, so the board that play bought
  // is not immediately taken back by the stored-result guard below.
  const [replaying, setReplaying] = useState(false);

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
  // Both numbers are read from `state` rather than from the local `attempt`
  // counter, because that counter also ticks for mid-play reshuffles the cap
  // deliberately does not charge for. The stored count is the only one that
  // matches what the joinee is actually allowed.
  const attemptsUsed = drillAttemptsUsed(state, "tool-match");
  const attemptsLeft = drillAttemptsLeft(state, "tool-match");
  const armed = armedId ? pairById.get(armedId) : undefined;

  /**
   * A finished drill must not hand out a fresh board on reload.
   *
   * Local `checked` is per-mount, so on its own it lets a joinee reload past a
   * recorded result onto a playable board without `beginDrillAttempt` ever
   * charging a play - the three-play cap was bypassable with F5. So the board
   * is withheld whenever stored progress already says this drill is finished,
   * and the only way back onto it is the replay control, which spends a play.
   *
   * Three guards keep that from misfiring. Before `ready` the store has not
   * been read yet and `state.drills` is empty, so nothing is trusted and the
   * drill stays playable. `replaying` covers the joinee who has just paid for a
   * board, whose stored status is still the terminal one from last time.
   * `checked` covers the joinee who finished in THIS session: they keep their
   * own result screen, with their answers and verdict marks on it, rather than
   * being bounced to a summary of the score they just watched being written.
   */
  const storedStatus = storedResult?.status;
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
    Object.keys(placements).length === 0;

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
    // Spend a play before anything local is cleared. The reducer ignores this
    // unless the stored status is already terminal, so a reshuffle of a board
    // that was never checked stays free and this call needs no guard here.
    beginDrillAttempt("tool-match");
    // This play is paid for, so the stored terminal status must stop hiding the
    // board - otherwise the guard above would re-lock it on the next render.
    setReplaying(true);
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

      {lockedToStoredResult ? (
        <div className="animate-rise-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            Recorded result
          </p>
          <p className="mt-2 text-lg font-medium">
            {storedResult?.score !== undefined &&
            storedResult.maxScore !== undefined
              ? `${storedResult.score} of ${storedResult.maxScore} matched.`
              : storedStatus}
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            {attemptsUsed} of {MAX_DRILL_ATTEMPTS} plays used
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {canReplayDrill(state, "tool-match") ? (
              /* `retry` is the same handler the result screen uses, so it
                 spends the play and lifts the lock in one place. */
              <Button variant="secondary" size="sm" onClick={retry}>
                Shuffle and retry
                <span className="ml-1 font-mono text-[11px] tracking-[0.08em] opacity-70 tabular-nums">
                  {attemptsLeft} left
                </span>
              </Button>
            ) : (
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                All {MAX_DRILL_ATTEMPTS} plays used. The recorded score stands.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
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
                ) : canReplayDrill(state, "tool-match") ? (
                  <Button variant="secondary" size="sm" onClick={retry}>
                    Shuffle and retry
                    {attemptsUsed > 0 && (
                      <span className="ml-1 font-mono text-[11px] tracking-[0.08em] opacity-70 tabular-nums">
                        {attemptsLeft} left
                      </span>
                    )}
                  </Button>
                ) : (
                  /* The button goes rather than greying out: a disabled control
                     invites clicking and explains nothing, so the note takes its
                     place and says why there is no way back onto the board. */
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                    All {MAX_DRILL_ATTEMPTS} plays used. The recorded score stands.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </DrillSection>
  );
}
