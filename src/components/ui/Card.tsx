import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "plain" | "soft" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  plain: "border-hairline bg-raised/60 text-ink",
  soft: "border-hairline bg-white/[0.03] text-ink",
  // The one filled surface: deep brand blue, white ink. Callers layer
  // `text-white/70`-style ink on top, so this must stay a saturated fill.
  accent: "border-brand/40 bg-brand text-white",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  /** Punches ticket notches through the left and right edges. */
  notched?: boolean;
}

/** Night-stage panel: hairline rule, raised glassy fill, 16px corners. */
export function Card({
  tone = "plain",
  notched = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border",
        // Only notched cards become a positioning context, so unnotched call
        // sites keep whatever containing block they already resolve against.
        notched && "relative overflow-visible",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {notched ? (
        <>
          {/* Absolute offsets resolve against the padding box, so the notches
              back out by the 1px rule to centre on the border-box edge. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -left-px top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-page"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-px top-1/2 size-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-page"
          />
        </>
      ) : null}
      {children}
    </div>
  );
}
