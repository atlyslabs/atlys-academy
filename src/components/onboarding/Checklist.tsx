"use client";

import type { Activity } from "@/content/onboarding/types";
import { useProgress } from "@/lib/progress/provider";
import { cn } from "@/lib/utils";

/**
 * A list of checkable activities.
 *
 * Rendered as real `<input type="checkbox">` elements inside `<label>`s so the
 * whole list is keyboard-operable and screen-reader-labelled for free.
 */
export function Checklist({
  items,
  ariaLabel,
}: {
  items: readonly Activity[];
  ariaLabel: string;
}) {
  const { state, toggleItem } = useProgress();

  return (
    <ul aria-label={ariaLabel} className="space-y-2">
      {items.map((item) => {
        const done = item.key in state.completedItems;

        return (
          <li key={item.key}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3.5 rounded-lg border p-4 transition-colors duration-150",
                done
                  ? "border-complete/35 bg-complete/[0.07]"
                  : "border-hairline bg-white/[0.02] hover:border-hairline-lit hover:bg-white/[0.04]",
              )}
            >
              <input
                type="checkbox"
                checked={done}
                onChange={(event) => toggleItem(item.key, event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-brand"
              />

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[14px] font-medium leading-snug",
                    done ? "text-ink-dim line-through" : "text-ink",
                  )}
                >
                  {item.label}
                </span>

                {item.detail && (
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-dim">
                    {item.detail}
                  </span>
                )}

                {item.href && (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    // Clicking the link must not also toggle the checkbox.
                    onClick={(event) => event.stopPropagation()}
                    className="mt-1.5 inline-block text-[13px] font-medium text-brand-text underline decoration-brand-text/40 underline-offset-4 transition-colors hover:text-brand-hover"
                  >
                    Open resource ↗
                  </a>
                )}

                {item.accessNeeded && (
                  <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-badge-amber">
                    Needs tool access
                  </span>
                )}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
