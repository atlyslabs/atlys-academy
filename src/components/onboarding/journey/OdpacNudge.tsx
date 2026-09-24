"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ODPAC_SHADOW_TARGET } from "@/content/onboarding/odpac";
import type { Day } from "@/content/onboarding/types";
import { odpacNudge } from "@/lib/progress/odpac-nudge";
import { useProgress } from "@/lib/progress/provider";
import { cn } from "@/lib/utils";

/**
 * The reminder that the day's ODPAC report is still unwritten.
 *
 * Inline on the day's board rather than a floating toast, deliberately. The desk
 * is a long scrolling page and the report is one stop on it: a banner pinned to
 * the viewport would either cover that stop or sit somewhere the eye has already
 * left, and it would have to be announced twice to be accessible. Sitting at the
 * head of the day, under the masthead, it is in the reading path exactly once
 * and `aria-live` announces it when it first appears.
 *
 * Dismissal is sessionStorage, NOT progress. Nothing here is written to the
 * progress store or to Supabase - a dismissed nudge is a fact about this browser
 * tab, not about the joinee, so it must never travel to the server or count as
 * work. It returns on the next sign-in, which is the point: the report is still
 * unwritten.
 */
export function OdpacNudge({
  day,
  onOpenReport,
}: {
  day: Day;
  /**
   * Opens the report stop. Receives the button's own rect so the window morphs
   * out of it exactly as it does from a trail card.
   */
  onOpenReport?: (origin: DOMRect) => void;
}) {
  const { state } = useProgress();
  const reason = odpacNudge(state, day.id);

  // sessionStorage is an external store, so it is read through
  // `useSyncExternalStore` rather than copied into state inside an effect. That
  // keeps the server snapshot (`false` - never dismissed) separate from the
  // client one, so there is no hydration mismatch and no cascading render.
  const storageKey = `atlys-onboarding.odpac-nudge.day${day.id}`;
  const dismissed = useSyncExternalStore(
    subscribeToDismissals,
    useCallback(() => isDismissed(storageKey), [storageKey]),
    () => false,
  );

  const dismiss = useCallback(() => setDismissed(storageKey), [storageKey]);

  if (!reason || dismissed) return null;

  const lastThing = reason === "only-thing-left";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mx-5 mb-1 mt-4 flex flex-wrap items-start gap-x-4 gap-y-2 rounded-xl border px-4 py-3 sm:mx-7",
        lastThing
          ? "border-brand-text/45 bg-brand/10"
          : "border-hairline-lit bg-white/[0.03]",
      )}
    >
      <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-muted">
        <span className="font-medium text-ink">
          {lastThing
            ? "Your ODPAC report is the last thing before the quiz."
            : "Your ODPAC report is still unwritten."}
        </span>{" "}
        {lastThing
          ? `Everything else on Day ${day.id} is done. Write it while the chats you shadowed are still fresh - the quiz does not open the next day on its own.`
          : `You are about halfway through Day ${day.id}. Shadow ${ODPAC_SHADOW_TARGET} and write up what you saw before the detail goes.`}
      </p>

      <span className="flex shrink-0 items-center gap-3">
        {onOpenReport && (
          <button
            type="button"
            onClick={(event) =>
              onOpenReport(event.currentTarget.getBoundingClientRect())
            }
            className="rounded-full bg-brand px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Write it
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="text-[12.5px] text-ink-dim underline decoration-hairline-lit underline-offset-4 transition-colors hover:text-ink"
        >
          Not now
        </button>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Per-tab dismissals, as an external store.
 *
 * sessionStorage fires no event for writes made by this same tab, so a bare
 * read would never re-render after "Not now". This keeps a listener set so the
 * dismissing component (and any sibling day) updates immediately, while the
 * durable value still lives in sessionStorage and dies with the tab.
 *
 * Nothing here reaches the progress store, the API or Supabase: a dismissed
 * nudge is a fact about this browser tab, never about the joinee.
 */
const listeners = new Set<() => void>();

function subscribeToDismissals(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function isDismissed(storageKey: string): boolean {
  try {
    return window.sessionStorage.getItem(storageKey) === "1";
  } catch {
    // Storage disabled (private browsing). The nudge simply stays visible.
    return false;
  }
}

function setDismissed(storageKey: string): void {
  try {
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Nothing to persist, but still notify so the nudge hides for this session.
  }
  for (const listener of listeners) listener();
}
