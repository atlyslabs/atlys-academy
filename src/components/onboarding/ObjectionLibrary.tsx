import { OBJECTION_SCRIPTS } from "@/content/onboarding/drills";
import { HoldToReveal } from "@/components/ui/HoldToReveal";
import { DrillSection } from "./DrillSection";

/**
 * The Cluster A price-and-value scripts, as reference material.
 *
 * Not a drill. It is the source the Day 5 scenarios are built from, and the
 * thing a joinee will come back to. Rendered as `<details>` so the page opens
 * short and every entry is reachable by keyboard with no JavaScript, and it
 * folds rather than snaps because of the `::details-content` transition in
 * globals.css. The scripted lines sit behind a press-and-hold so a joinee has
 * to attempt their own answer before reading ours.
 *
 * Set at reading sizes on a capped measure, like the lesson pages, and on the
 * house ticket shape (3px radius, 2px rule) rather than the soft card it used
 * to be: this is something people read rather than operate.
 */
export function ObjectionLibrary() {
  return (
    <DrillSection
      eyebrow="Reference · Cluster A"
      title="Price and value: what to actually say"
      description="Five objections you will hear this week, what is underneath each one, and the line that answers it."
    >
      <ul className="space-y-3">
        {OBJECTION_SCRIPTS.map((script) => (
          <li key={script.id}>
            <details className="group rounded-[3px] border-2 border-ink/20 bg-surface-soft shadow-[3px_3px_0_0_rgba(20,20,26,0.12)] transition-colors open:bg-surface hover:border-ink/35">
              <summary className="flex cursor-pointer list-none items-start gap-3 p-4 marker:hidden">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-5 shrink-0 place-items-center text-ink-muted transition-transform duration-300 ease-out group-open:rotate-90"
                >
                  <svg
                    viewBox="0 0 12 12"
                    className="size-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4.5 2.5 8 6l-3.5 3.5" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 font-display text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink">
                  &ldquo;{script.objection}&rdquo;
                </span>
              </summary>

              <div className="space-y-4 border-t border-dashed border-ink/25 p-4 pt-4 sm:px-5">
                <Field label="What's really going on">{script.subtext}</Field>
                <Field label="Say">
                  <HoldToReveal>
                    <span className="text-ink">{script.say}</span>
                  </HoldToReveal>
                </Field>
                {script.then && (
                  <Field label="Then">
                    <HoldToReveal>{script.then}</HoldToReveal>
                  </Field>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </DrillSection>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[68ch]">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] leading-[1.7] text-ink-secondary">
        {children}
      </p>
    </div>
  );
}
