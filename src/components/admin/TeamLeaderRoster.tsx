"use client";

import { useActionState } from "react";
import type { TeamLeader } from "@/content/onboarding/team-leaders";

export interface AddLeaderState {
  ok: boolean;
  message: string | null;
}

/**
 * Add a team leader, and see who is already on the roster.
 *
 * Deliberately not a panel: it is one field and a button, so it sits as a bare
 * row at the top of the desk rather than a card at the bottom. Adding a leader
 * is a ten-second job and should not cost a scroll to the end of the page to
 * reach. The same roster feeds the sign-in dropdown, so a name added here is
 * selectable there immediately.
 */
export function TeamLeaderRoster({
  leaders,
  action,
  stored,
}: {
  leaders: TeamLeader[];
  action: (
    previous: AddLeaderState,
    formData: FormData,
  ) => Promise<AddLeaderState>;
  /** False when the roster is the built-in seed list, not the database. */
  stored: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {
    ok: true,
    message: null,
  });

  return (
    <section
      aria-label="Team leaders"
      className="border-b border-hairline pb-5"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-dim">
          Team leaders
        </p>

        <form action={formAction} className="flex min-w-0 gap-2">
          <label htmlFor="leader-name" className="sr-only">
            Add a leader
          </label>
          <input
            id="leader-name"
            name="name"
            type="text"
            required
            maxLength={64}
            placeholder="Add a leader"
            className="h-9 min-w-0 max-w-[280px] flex-1 rounded-lg border border-hairline bg-raised px-3 text-[13px] text-ink transition-colors placeholder:text-ink-dim hover:border-hairline-lit focus:border-brand-text focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-9 shrink-0 rounded-lg border border-hairline-lit px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-ink-dim disabled:opacity-50"
          >
            {pending ? "Adding..." : "Add"}
          </button>
        </form>

        {/* The roster on demand. A run of names beside the field read as a
            status line about whoever was first in it; a fold says plainly that
            it is the whole list, and stays out of the way until asked. */}
        {leaders.length > 0 && (
          <details className="group relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-hairline px-3 text-[13px] text-ink-muted transition-colors hover:border-hairline-lit hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text">
              View all team leaders
              <span className="font-mono text-[11px] text-ink-dim tabular-nums">
                {leaders.length}
              </span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-2.5 shrink-0 text-ink-dim transition-transform duration-200 group-open:rotate-90"
              >
                <path d="M6 4l4 4-4 4" />
              </svg>
            </summary>

            {/* Floated so opening the list never pushes the desk downward. */}
            <ul
              data-no-fold
              className="absolute left-0 z-20 mt-2 max-h-[18rem] w-[min(320px,80vw)] overflow-y-auto rounded-xl border border-hairline-lit bg-raised p-1.5 shadow-[0_18px_50px_rgb(0_0_0/0.55)]"
            >
              {leaders.map((leader) => (
                <li
                  key={leader.id}
                  className="flex items-baseline justify-between gap-3 rounded-lg px-2.5 py-1.5"
                >
                  <span className="truncate text-[13px] text-ink">
                    {leader.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-dim">
                    {leader.id}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {(state.message || !stored) && (
        <p
          aria-live="polite"
          className={`mt-2.5 text-[12px] ${
            state.message && !state.ok ? "text-badge-coral" : "text-ink-dim"
          }`}
        >
          {state.message ??
            "Built-in list. Adding needs the team_leaders table from supabase/schema.sql."}
        </p>
      )}
    </section>
  );
}
