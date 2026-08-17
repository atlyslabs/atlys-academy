import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bubble stock per side.
 *
 * Kept here instead of reaching for `Card`: the tail has to be cut from the same
 * paper as the body, so this file needs the fill and rule colours anyway. Both
 * rules are solid rather than an ink alpha, because the tail's outline overlaps
 * the body's outline - at any alpha that seam would print twice as dark.
 */
const TONE = {
  customer: {
    body: "border-ink bg-surface text-ink shadow-[3px_3px_0_0_var(--color-ink)]",
    tail: "border-ink bg-surface",
  },
  agent: {
    body:
      "border-ticket-ink bg-ticket text-white " +
      "shadow-[3px_3px_0_0_var(--color-ticket-ink)]",
    tail: "border-ticket-ink bg-ticket",
  },
} as const;

/** One message in a simulated chat. Used by the pause drill and the scenarios. */
export function ChatBubble({
  from,
  children,
  className,
}: {
  from: "customer" | "agent";
  children: ReactNode;
  className?: string;
}) {
  const isCustomer = from === "customer";
  const tone = isCustomer ? TONE.customer : TONE.agent;

  return (
    <div
      className={cn(
        "flex",
        isCustomer ? "justify-start" : "justify-end",
        className,
      )}
    >
      <div className="max-w-[36rem]">
        <p
          className={cn(
            "mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted",
            !isCustomer && "text-right",
          )}
        >
          {isCustomer ? "Guest" : "You"}
        </p>
        <div
          className={cn(
            "relative rounded-[3px] border-2 px-4 py-3 text-sm",
            tone.body,
          )}
        >
          {/* The tail is a 12px square turned 45deg with only the two rules that
              form the point kept; its fill hides the body rule running behind
              it, so the outline reads as one continuous line. Absolute offsets
              resolve against the padding box, hence the 5px pull past a 2px
              rule. */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-3.5 size-3 rotate-45",
              tone.tail,
              isCustomer
                ? "-left-[5px] border-b-2 border-l-2"
                : "-right-[5px] border-t-2 border-r-2",
            )}
          />
          {children}
        </div>
      </div>
    </div>
  );
}
