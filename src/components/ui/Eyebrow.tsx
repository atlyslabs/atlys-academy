import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Draws a leading hairline rule, like a printed field marker. */
  rule?: boolean;
}

/** Printed ticket field label: mono, uppercase, widely tracked. */
export function Eyebrow({
  rule = false,
  className,
  children,
  ...props
}: EyebrowProps) {
  return (
    <p
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted",
        // Flex only when the rule is present; plain eyebrows stay block-level so
        // existing call sites keep their inline wrapping behaviour.
        rule && "flex items-center gap-2",
        className,
      )}
      {...props}
    >
      {rule ? (
        <span
          aria-hidden
          className="h-px w-6 shrink-0 bg-current opacity-40"
        />
      ) : null}
      {children}
    </p>
  );
}
