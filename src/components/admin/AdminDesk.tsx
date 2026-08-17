import type { ReactNode } from "react";
import { RoomShell } from "@/components/onboarding/journey/RoomShell";

/**
 * The manager's desk chrome: the masthead on the shared room shell, and the
 * plate used for every state where there is nothing to plot yet.
 *
 * Presentation only. Every access decision - the kill switch, the
 * development-only preview, the sign-in requirement, the admin-email check and
 * the no-database state - stays in `src/app/admin/page.tsx`.
 */
export function AdminDesk({
  title,
  standfirst,
  children,
}: {
  title?: string;
  standfirst?: string;
  children: ReactNode;
}) {
  return (
    <RoomShell room="admin">
      <header>
        <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand-text">
          <span aria-hidden="true" className="h-px w-6 bg-brand-text/50" />
          Manager view
        </p>
        <h1 className="mt-3 max-w-[24ch] font-display text-[38px] italic leading-tight tracking-[-0.01em] text-ink sm:text-[46px]">
          {title ?? "Cohort progress"}
        </h1>
        <p className="mt-4 max-w-[58ch] text-[14.5px] leading-relaxed text-ink-muted">
          {standfirst ??
            "Every joinee's progress, scores and written answers, visible only to admins."}
        </p>
      </header>

      <div className="mt-9">{children}</div>
    </RoomShell>
  );
}

/** A plate for the states where there is nothing to plot yet. */
export function AdminNotice({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="desk-card px-7 py-9 sm:px-10 sm:py-11">
      <svg className="beam" aria-hidden="true">
        <rect
          className="beam-hairline"
          x="0"
          y="0"
          width="100%"
          height="100%"
          pathLength={100}
        />
      </svg>
      <p className="max-w-[36ch] font-display text-[24px] italic leading-snug text-ink">
        {heading}
      </p>
      <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-ink-muted">
        {children}
      </p>
    </section>
  );
}

/** An environment variable name, printed as a key rather than as prose. */
export function EnvKey({ children }: { children: ReactNode }) {
  return (
    <code className="whitespace-nowrap rounded-full border border-hairline bg-white/[0.03] px-2 py-0.5 font-mono text-[12px] text-ink">
      {children}
    </code>
  );
}
