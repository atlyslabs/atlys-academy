import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";

/** Shared chrome for every interactive drill - heading, blurb, status badge. */
export function DrillSection({
  eyebrow,
  title,
  description,
  status,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  /** Badge showing a stored result, if the drill has one. */
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-white/[0.02] p-6 sm:p-7">
      {/* Two-tone header: printed mono label over a display-serif title,
          ruled off from the drill body. The status stamp keeps the
          right-hand slot. */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <Eyebrow className="text-ink-dim">{eyebrow}</Eyebrow>
          <h3 className="mt-2 font-display text-[24px] italic leading-tight text-ink">
            {title}
          </h3>
        </div>
        {status}
      </div>

      {description && (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      )}

      <div className="mt-6">{children}</div>
    </section>
  );
}
