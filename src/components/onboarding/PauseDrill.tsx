"use client";

import { useEffect, useRef, useState } from "react";
import { PAUSE_DRILL } from "@/content/onboarding/drills";
import { PAUSE_COUNTDOWN_ENABLED } from "@/lib/dev-flags";
import {
  MAX_DRILL_ATTEMPTS,
  canReplayDrill,
  drillAttemptsLeft,
  drillAttemptsUsed,
  isTerminalDrillStatus,
} from "@/lib/progress/attempts";
import { useProgress } from "@/lib/progress/provider";
import { speak, stopSpeaking } from "@/lib/speech";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { ChatBubble } from "./ChatBubble";
import { DrillSection } from "./DrillSection";

/**
 * "Shut up for 10 seconds" - the behaviour drill (PRD §7.2).
 *
 * The point is not that the joinee learns the rule; it is that they feel the
 * ten seconds. So the Send button stays *enabled* while the composer is locked:
 * the drill only works if rushing is possible.
 *
 * Phases:
 *   intro    → nothing started
 *   waiting  → countdown running, composer locked, Send is a trap
 *   rushed   → they sent early; a replay is offered while plays remain
 *   unlocked → they waited; the real fear appears and they can reply
 *   done     → reply submitted, model answer revealed
 */
type Phase = "intro" | "waiting" | "rushed" | "unlocked" | "done";

export function PauseDrill() {
  const { state, setDrillResult, saveExercise, beginDrillAttempt } =
    useProgress();
  const [phase, setPhase] = useState<Phase>("intro");
  const [secondsLeft, setSecondsLeft] = useState(PAUSE_DRILL.waitSeconds);
  const [reply, setReply] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const storedResult = state.drills["pause-10s"];
  // The replay cap is read from stored progress rather than local state: this
  // drill used to allow exactly one retry via a `retryUsed` flag, which reset
  // itself every time the component remounted and disagreed with the cap the
  // day gate and the voucher already enforce. `attempts.ts` is the one source
  // of truth for how many goes are left.
  const attemptsUsed = drillAttemptsUsed(state, "pause-10s");
  const attemptsLeft = drillAttemptsLeft(state, "pause-10s");

  // Countdown. Driven off a wall-clock deadline so a backgrounded tab that
  // throttles timers still unlocks at the right moment rather than late.
  useEffect(() => {
    if (phase !== "waiting") return;

    const deadline = Date.now() + PAUSE_DRILL.waitSeconds * 1000;
    const tick = () => {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      if (remaining <= 0) {
        setSecondsLeft(0);
        setPhase("unlocked");
      } else {
        setSecondsLeft(remaining);
      }
    };

    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [phase]);

  // Move focus to the composer the moment it opens, so a keyboard user is not
  // left hunting for what changed.
  useEffect(() => {
    if (phase === "unlocked") composerRef.current?.focus();
  }, [phase]);

  // Voice the follow-up the moment it lands, and never let a voice outlive
  // the phase - or the component - that started it.
  useEffect(() => {
    if (phase === "unlocked") speak(PAUSE_DRILL.followUpMessage);
    if (phase !== "waiting" && phase !== "unlocked") return;
    return () => stopSpeaking();
  }, [phase]);

  function start() {
    // With the countdown switched off there is nothing to wait through, so skip
    // straight past the trap to the reply. See `PAUSE_COUNTDOWN_ENABLED`. The
    // opening message stays unspoken here - the unlocked effect would only
    // cancel it a moment later to voice the follow-up.
    if (!PAUSE_COUNTDOWN_ENABLED) {
      setSecondsLeft(0);
      setPhase("unlocked");
      return;
    }
    // The click that got us here counts as the user gesture browsers require
    // before audio, so the guest's message can be voiced without a second tap.
    speak(PAUSE_DRILL.openingMessage);
    setSecondsLeft(PAUSE_DRILL.waitSeconds);
    setPhase("waiting");
  }

  function sendTooEarly() {
    setPhase("rushed");
    // Never write "rushed" over a run that already finished.
    //
    // This is the same guard `ApacLoop` carries, and it is here for a worse
    // version of the same failure. "rushed" is not terminal, so demoting a
    // stored "passed" un-earns the Gate hold stamp; `dayWorkFinished` then
    // fails for Day 2, and Day 3 - which the joinee had already opened - seals
    // itself again. It is durable, not cosmetic: the write syncs, and
    // `mergeDrill` takes the newer `updatedAt`, so a reload brings the demotion
    // back with it.
    //
    // Reaching it takes nothing exotic. This drill re-offers "Start the drill"
    // on every mount, so anyone revisiting a finished Day 2 can rush it again
    // by accident. Skipping the write matches how `setDrill` already treats
    // scores - a replay may improve a result, never worsen it - so the local
    // phase still shows them what they did while the record holds.
    if (isTerminalDrillStatus(storedResult?.status)) return;
    setDrillResult("pause-10s", { status: "rushed" });
  }

  function retry() {
    // Spend the play before anything local moves, and spend it unconditionally:
    // the reducer only charges an attempt when the STORED status is already
    // terminal, so a mid-play restart stays free and this handler does not need
    // to know the difference. Note `start()` is also reachable from the intro
    // control, which is the first play rather than a replay - so the count is
    // spent here and not inside `start`.
    beginDrillAttempt("pause-10s");
    start();
  }

  function submitReply() {
    const trimmed = reply.trim();
    if (!trimmed) return;
    saveExercise(PAUSE_DRILL.exerciseKey, trimmed);
    setDrillResult("pause-10s", { status: "passed" });
    setPhase("done");
  }

  return (
    <DrillSection
      eyebrow="Drill · behaviour"
      title="Shut up for 10 seconds"
      description="A guest has just messaged you. Everything in you will want to answer. Don't."
      status={
        storedResult?.status === "passed" ? (
          <Badge tone="green">Waited it out</Badge>
        ) : storedResult?.status === "rushed" ? (
          <Badge tone="coral">Rushed</Badge>
        ) : null
      }
    >
      <div className="space-y-3">
        <div className="flex items-end gap-1">
          <ChatBubble from="customer">{PAUSE_DRILL.openingMessage}</ChatBubble>
          <SpeakButton text={PAUSE_DRILL.openingMessage} />
        </div>

        {(phase === "unlocked" || phase === "done") && (
          <div className="flex items-end gap-1 animate-rise-in">
            <ChatBubble from="customer">
              {PAUSE_DRILL.followUpMessage}
            </ChatBubble>
            <SpeakButton text={PAUSE_DRILL.followUpMessage} />
          </div>
        )}

        {phase === "done" && (
          <ChatBubble from="agent" className="animate-rise-in">
            {reply}
          </ChatBubble>
        )}
      </div>

      {phase === "intro" && (
        <div className="mt-5">
          <Button onClick={start}>Start the drill</Button>
        </div>
      )}

      {phase === "waiting" && (
        <Composer
          countdown={secondsLeft}
          total={PAUSE_DRILL.waitSeconds}
          onSend={sendTooEarly}
          hint="The composer is locked. If you send now, you send the fast answer."
        />
      )}

      {phase === "rushed" && (
        <div className="mt-5 animate-rise-in rounded-[3px] border-2 border-badge-coral/40 bg-badge-coral-soft p-5 shadow-[3px_3px_0_0_rgba(20,20,26,0.12)]">
          <p className="text-sm font-semibold text-badge-coral">
            {PAUSE_DRILL.rushedFeedback}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            The reply waiting on your fingertips was{" "}
            <em className="font-display italic text-retro-blue">
              &ldquo;{PAUSE_DRILL.rushedReply}&rdquo;
            </em>
            . Accurate, and beside the point. What they were actually about to
            tell you never got said.
          </p>
          {/* No button once the plays are gone. A disabled one would invite
              clicking, and the house rule (see `MentorPanel`) is that a
              permanently dead control is removed rather than greyed out. */}
          {canReplayDrill(state, "pause-10s") ? (
            <Button className="mt-4" onClick={retry}>
              Try once more
              {attemptsUsed > 0 && (
                <span className="ml-1 font-mono text-[11px] tracking-[0.08em] opacity-70 tabular-nums">
                  {attemptsLeft} left
                </span>
              )}
            </Button>
          ) : (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              All {MAX_DRILL_ATTEMPTS} plays used. The recorded score stands -
              bring this one to your sync with your team leader
            </p>
          )}
        </div>
      )}

      {phase === "unlocked" && (
        <>
          <p className="mt-5 text-sm text-ink-secondary">
            There it is. That is the message you were about to talk over. Now
            reply to <strong>the fear</strong>, not the question.
          </p>
          <div className="mt-3">
            <label
              htmlFor="pause-drill-reply"
              className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted"
            >
              Your reply
            </label>
            <textarea
              id="pause-drill-reply"
              ref={composerRef}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={4}
              placeholder="They told you they were rejected before and are afraid of losing money again. Start there."
              className="w-full rounded-lg border border-hairline-lit bg-white/[0.04] p-3.5 text-sm leading-relaxed text-ink caret-brand-text placeholder:text-ink-dim/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-text"
            />
            <Button
              className="mt-3"
              onClick={submitReply}
              disabled={!reply.trim()}
            >
              Send reply
            </Button>
          </div>
        </>
      )}

      {phase === "done" && (
        <div className="mt-5 animate-rise-in grid gap-4 md:grid-cols-2">
          <div className="rounded-[3px] border-2 border-ink/20 bg-surface-soft p-4 shadow-[3px_3px_0_0_rgba(20,20,26,0.12)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              What you wrote
            </p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{reply}</p>
          </div>
          <div className="rounded-[3px] border-2 border-accent/40 bg-accent-soft p-4 shadow-[3px_3px_0_0_rgba(20,20,26,0.12)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
              One good answer
            </p>
            <p className="mt-2 text-sm">{PAUSE_DRILL.modelAnswer}</p>
          </div>
          <p className="text-sm text-ink-muted md:col-span-2">
            Yours is not graded. Compare the two and notice where the model
            answer concedes the point before it argues anything.
          </p>
        </div>
      )}
    </DrillSection>
  );
}

/**
 * The locked composer. Rendered only while the countdown runs - the Send button
 * is live on purpose, because the drill needs rushing to be possible.
 */
function Composer({
  countdown,
  total,
  onSend,
  hint,
}: {
  countdown: number;
  total: number;
  onSend: () => void;
  hint: string;
}) {
  return (
    <div className="mt-5 rounded-[3px] border-2 border-ink/20 bg-surface-soft p-4 shadow-[3px_3px_0_0_rgba(20,20,26,0.12)]">
      <div className="flex items-center gap-4">
        <CountdownRing secondsLeft={countdown} total={total} />
        <p className="text-sm text-ink-secondary">{hint}</p>
      </div>

      <textarea
        disabled
        rows={3}
        aria-label="Your reply (locked)"
        placeholder="Locked. Read the room instead."
        className="mt-3 w-full cursor-not-allowed rounded-lg border border-dashed border-hairline-lit bg-white/[0.02] p-3 text-sm text-ink-dim placeholder:text-ink-dim/70"
      />

      <Button className="mt-3" variant="secondary" onClick={onSend}>
        Send now
      </Button>
    </div>
  );
}

/**
 * The countdown as a depleting progress ring. The arc tracks
 * `secondsLeft / total`; a one-second linear transition on the dash offset
 * makes each tick sweep instead of jump, and the global reduced-motion rule
 * collapses that transition for anyone who asked for stillness.
 */
function CountdownRing({
  secondsLeft,
  total,
}: {
  secondsLeft: number;
  total: number;
}) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? secondsLeft / total : 0;

  return (
    <div role="timer" aria-live="off" className="relative size-16 shrink-0">
      {/* Rotated so the arc starts depleting from 12 o'clock. */}
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth={4}
          className="stroke-line"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="stroke-accent transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-lg font-semibold text-ink">
        {secondsLeft}
      </span>
    </div>
  );
}
