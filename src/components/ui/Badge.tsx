import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "green" | "coral" | "amber" | "teal";

// Border alpha is raised from /25 to /40 because the rule is now 2px: at the old
// alpha the stamp outline disappeared against its own soft fill.
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-soft text-ink-muted border-line",
  green: "bg-badge-green-soft text-badge-green border-badge-green/40",
  coral: "bg-badge-coral-soft text-badge-coral border-badge-coral/40",
  amber: "bg-badge-amber-soft text-badge-amber border-badge-amber/40",
  teal: "bg-badge-teal-soft text-badge-teal border-badge-teal/40",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** Inked stamp: square corners, 2px rule, pressed on slightly off-square. */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex -rotate-[1.5deg] items-center gap-1 rounded-[2px] border-2 px-2 py-0.5",
        "font-mono text-[11px] font-medium uppercase tracking-[0.12em]",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
