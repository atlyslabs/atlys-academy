"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { TeamLeader } from "@/content/onboarding/team-leaders";

export interface AddLeaderState {
  ok: boolean;
  message: string | null;
}

export interface RemoveLeaderState {
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
  removeAction,
  stored,
}: {
  leaders: TeamLeader[];
  action: (
    previous: AddLeaderState,
    formData: FormData,
  ) => Promise<AddLeaderState>;
  /**
   * Remove one leader. Optional so the seed-list case, where there is nothing
   * in a database to delete, simply renders no remove controls.
   */
  removeAction?: (
    previous: RemoveLeaderState,
    formData: FormData,
  ) => Promise<RemoveLeaderState>;
  /** False when the roster is the built-in seed list, not the database. */
  stored: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {
    ok: true,
    message: null,
  });
  const [pendingRemoval, setPendingRemoval] = useState<TeamLeader | null>(null);

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
                  className="group/row flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 hover:bg-white/[0.04]"
                >
                  <span className="truncate text-[13px] text-ink">
                    {leader.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-ink-dim">
                      {leader.id}
                    </span>
                    {/* Removal is a two-step: this only opens the dialog. A
                        single click that deleted somebody from a hover-revealed
                        icon is exactly the accident worth designing out. */}
                    {removeAction && (
                      <button
                        type="button"
                        onClick={() => setPendingRemoval(leader)}
                        aria-label={`Remove ${leader.name} from the roster`}
                        className="grid size-5 shrink-0 place-items-center rounded text-ink-dim opacity-0 transition-[opacity,color] hover:text-badge-coral focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-text group-hover/row:opacity-100"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          aria-hidden="true"
                          className="size-3"
                        >
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Mounted only while a removal is pending, and KEYED BY LEADER.
          Both halves matter. `useActionState` keeps its result for the life of
          the component, so a long-lived dialog would still be holding the last
          successful "X removed" the next time it opened - and its own
          close-on-success effect would read that stale result and slam it shut
          before the admin saw it. Remounting per leader gives each removal
          fresh action state, which makes that whole class of bug
          unrepresentable rather than merely handled. */}
      {removeAction && pendingRemoval && (
        <RemoveLeaderDialog
          key={pendingRemoval.id}
          leader={pendingRemoval}
          onClose={() => setPendingRemoval(null)}
          action={removeAction}
          isLastLeader={leaders.length === 1}
        />
      )}

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

/**
 * Confirm before taking a leader off the roster.
 *
 * A native `<dialog>` for the same reason `journey/TrailWindow` uses one: it
 * carries the focus trap, the top layer, Esc-to-close and the backdrop without
 * any of it being hand-rolled.
 *
 * The copy states consequences rather than asking "are you sure". Two of them
 * are real and neither is obvious from the button:
 *
 * - **Removing the last leader empties the sign-in dropdown.** That field is
 *   required for a presales joinee, so nobody can complete sign-in until
 *   another leader is added. Worth saying out loud before it happens, not
 *   after.
 * - **Joinees already pointing at the id keep pointing at it.** Nothing
 *   cascades: their progress is untouched, but the desk falls back to printing
 *   the raw slug where the name used to be. The action's own reply reports how
 *   many, because only the server can count them.
 */
function RemoveLeaderDialog({
  leader,
  onClose,
  action,
  isLastLeader,
}: {
  /** Always present: the parent only mounts this while a removal is pending. */
  leader: TeamLeader;
  onClose: () => void;
  action: (
    previous: RemoveLeaderState,
    formData: FormData,
  ) => Promise<RemoveLeaderState>;
  isLastLeader: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, {
    ok: true,
    message: null,
  });

  // Open once, on mount. The parent keys this component by leader id, so a
  // fresh instance - and fresh action state - exists for every removal.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // The server action's reply is the signal that the work is done. Closing on
  // it - rather than on the click - means the dialog stays up if the removal
  // fails, with the reason still on screen. `state` starts at
  // `{ ok: true, message: null }`, so the null guard is what stops this firing
  // before anything has been submitted.
  useEffect(() => {
    if (state.message && state.ok) onClose();
  }, [state, onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        // Backdrop click. The <dialog> itself is the backdrop's hit target, so
        // a click landing on the element and not its contents means outside.
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="remove-leader-title"
      className="m-auto w-[min(420px,92vw)] rounded-xl border border-hairline-lit bg-raised p-0 text-ink shadow-[0_24px_70px_rgb(0_0_0/0.6)] backdrop:bg-black/60"
    >
      <div className="p-5">
        <h2
          id="remove-leader-title"
          className="font-display text-[19px] italic leading-tight"
        >
          Remove {leader.name}?
        </h2>

        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-secondary">
          They disappear from the sign-in dropdown straight away. Any joinee
          already assigned to them keeps their progress, but their team leader
          will show as{" "}
          <code className="font-mono text-[11.5px] text-ink-muted">
            {leader.id}
          </code>{" "}
          on the desk until they pick again.
        </p>

        {isLastLeader && (
          <p className="mt-3 rounded-lg border border-badge-coral/35 bg-badge-coral-soft/60 p-3 text-[12.5px] leading-relaxed text-badge-coral">
            This is the last leader on the roster. Remove them and the sign-in
            dropdown is empty — and because it is a required field, no joinee
            can finish signing in until you add somebody.
          </p>
        )}

        {state.message && !state.ok && (
          <p
            aria-live="polite"
            className="mt-3 text-[12.5px] leading-relaxed text-badge-coral"
          >
            {state.message}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-hairline px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-hairline-lit hover:text-ink"
          >
            Keep them
          </button>
          <form action={formAction}>
            <input type="hidden" name="id" value={leader.id} />
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-lg border border-badge-coral/45 bg-badge-coral-soft/60 px-3.5 text-[13px] font-medium text-badge-coral transition-colors hover:border-badge-coral/70 disabled:opacity-50"
            >
              {pending ? "Removing..." : "Remove"}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
