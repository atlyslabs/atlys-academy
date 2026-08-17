import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PixelDialogueTone = "guest" | "you";

export interface PixelDialogueMeter {
  /** Short caption, e.g. "PATIENCE". Rendered in mono beside the pips. */
  label: string;
  value: number;
  max: number;
}

export interface PixelDialogueProps {
  speaker: string;
  /** Sits in the bordered square on the name plate. Decorative - the plate
   *  carries the speaker's name in text, so portraits stay `aria-hidden`. */
  portrait?: ReactNode;
  children: ReactNode;
  tone?: PixelDialogueTone;
  /** Optional mood read - how much patience, trust or time is left. */
  meter?: PixelDialogueMeter;
}

/** Body wash and name-plate fill per speaker, so the two sides of a
 *  conversation read apart before a word is parsed. */
const TONE_CLASSES: Record<PixelDialogueTone, { box: string; plate: string }> = {
  guest: { box: "bg-tile-pink/20", plate: "bg-tile-pink" },
  you: { box: "bg-surface", plate: "bg-tile-yellow" },
};

/** Portrait square edge, in px. Half of it hangs above the box, which is what
 *  the body's top padding has to clear. */
const PORTRAIT_BOX = 34;

/**
 * Handheld-RPG dialogue box: hard 3px outline, 4px offset shadow block, and a
 * name plate straddling the top border.
 *
 * No sprite assets exist, so the arcade weight comes entirely from geometry -
 * square corners, square pips, solid borders, no gradients.
 */
export function PixelDialogue({
  speaker,
  portrait,
  children,
  tone = "guest",
  meter,
}: PixelDialogueProps) {
  const tones = TONE_CLASSES[tone];

  return (
    <div
      className={cn(
        "relative rounded-[4px] border-[3px] border-ink px-4 pb-4 pt-8",
        "shadow-[4px_4px_0_0_var(--color-ink)]",
        tones.box,
      )}
    >
      <div
        className="absolute left-3 flex items-center gap-2"
        style={{ top: -PORTRAIT_BOX / 2 }}
      >
        {portrait ? (
          <span
            aria-hidden="true"
            className="flex items-center justify-center rounded-[2px] border-[3px] border-ink bg-surface"
            style={{ width: PORTRAIT_BOX, height: PORTRAIT_BOX }}
          >
            {portrait}
          </span>
        ) : null}
        <span
          className={cn(
            "rounded-[2px] border-[3px] border-ink px-2 py-1 text-ink",
            "font-condensed text-[13px] uppercase leading-none tracking-[0.14em]",
            tones.plate,
          )}
        >
          {speaker}
        </span>
      </div>

      {meter ? <Pips meter={meter} /> : null}

      <div className="text-sm leading-relaxed text-ink sm:text-base">
        {children}
      </div>
    </div>
  );
}

function Pips({ meter }: { meter: PixelDialogueMeter }) {
  const max = Math.max(0, Math.round(meter.max));
  const filled = Math.min(max, Math.max(0, Math.round(meter.value)));

  return (
    <p className="mb-3 flex items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
      <span>{meter.label}</span>
      <span aria-hidden="true" className="flex items-center gap-[3px]">
        {Array.from({ length: max }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-3 w-3 border-2 border-ink",
              index < filled ? "bg-tile-yellow" : "bg-transparent",
            )}
          />
        ))}
      </span>
      <span className="sr-only">
        {filled} of {max}
      </span>
    </p>
  );
}
