"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";

export interface HoldToRevealProps {
  label?: string;
  /** How long the press must be held before the content shows. */
  holdMs?: number;
  children: ReactNode;
}

/**
 * Press-and-hold gate for model answers.
 *
 * The hold is the point - a forced beat where the joinee has to think of
 * their own line before reading ours. A tap would be skimmed past; twelve
 * hundred milliseconds is just long enough to feel the question.
 *
 * Driven by rAF rather than a timer so the fill tracks real elapsed time and
 * an early release cancels cleanly. Once revealed, stays revealed.
 */
export function HoldToReveal({
  label = "Hold to reveal. Think of your line first",
  holdMs = 1200,
  children,
}: HoldToRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  function beginHold() {
    if (revealed || rafRef.current !== null) return;
    const start = performance.now();

    const tick = (now: number) => {
      const next = Math.min((now - start) / holdMs, 1);
      setProgress(next);
      if (next >= 1) {
        rafRef.current = null;
        setRevealed(true);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function cancelHold() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setProgress(0);
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") return;
    // The browser would fire a synthetic click on these keys; we drive the
    // hold ourselves, so suppress it. Repeats would restart the ramp.
    event.preventDefault();
    if (event.repeat) return;
    beginHold();
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    cancelHold();
  }

  // Spans with `block` throughout so this can sit inside a <p> - the fields
  // in the objection library render their copy in one.
  return (
    <span className="block">
      {!revealed && (
        <Button
          size="sm"
          className="relative touch-none select-none overflow-hidden"
          onPointerDown={beginHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onBlur={cancelHold}
          // A long press summons the context menu on touch devices, which
          // would interrupt the hold.
          onContextMenu={(event) => event.preventDefault()}
        >
          <span
            aria-hidden
            className="absolute inset-0 origin-left bg-white/25"
            style={{ transform: `scaleX(${progress})` }}
          />
          <span className="relative">{label}</span>
        </Button>
      )}
      <span aria-live="polite" className="block">
        {revealed && <span className="block animate-rise-in">{children}</span>}
      </span>
    </span>
  );
}
