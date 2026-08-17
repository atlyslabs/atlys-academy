"use client";

import { localProgressStore } from "./local-store";
import type { ProgressState, ProgressStore } from "./types";

/**
 * Supabase-backed store, used when the server reports sync is available
 * (signed in + database configured). Three behaviours worth knowing:
 *
 * 1. **Write-through**: every save also lands in localStorage, so a dropped
 *    connection degrades to exactly the old behaviour instead of losing work.
 * 2. **First-load merge**: whatever is already in localStorage (work done
 *    before sign-in, or before the database existed) is merged into the
 *    server state and uploaded - the localStorage→database migration is this
 *    merge, there is no separate migration step.
 * 3. **Trailing debounce** on save, because the provider saves on every
 *    reducer change and a checkbox spree should not be a request storm.
 */

const SAVE_DEBOUNCE_MS = 800;

async function fetchServerState(): Promise<ProgressState | null> {
  try {
    const response = await fetch("/api/onboarding/progress", {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { state: ProgressState };
    return payload.state;
  } catch {
    return null;
  }
}

/** Server wins on shared keys; local-only work is kept. Attempts union by id. */
function merge(server: ProgressState, local: ProgressState): ProgressState {
  const attemptIds = new Set(server.attempts.map((a) => a.id));
  return {
    ...server,
    completedItems: { ...local.completedItems, ...server.completedItems },
    drills: { ...local.drills, ...server.drills },
    exercises: { ...local.exercises, ...server.exercises },
    attempts: [
      ...server.attempts,
      ...local.attempts.filter((a) => !attemptIds.has(a.id)),
    ],
    lastVisitedDay: Math.max(
      server.lastVisitedDay,
      local.lastVisitedDay,
    ) as ProgressState["lastVisitedDay"],
  };
}

let pendingSave: ReturnType<typeof setTimeout> | null = null;
let pendingState: ProgressState | null = null;

async function upload(state: ProgressState): Promise<void> {
  try {
    const response = await fetch("/api/onboarding/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      keepalive: true,
    });
    if (!response.ok) {
      // A rejected upload (validation, expired session) must not be
      // invisible: the state is safe locally, but the manager's view stops
      // moving. Say so where a developer will look.
      console.warn(
        `[progress] sync rejected with ${response.status}; kept locally, will retry on the next change`,
      );
    }
  } catch {
    // Offline or server down - localStorage already has it; the next
    // successful save re-uploads the full state, so nothing is lost.
  }
}

/** Send whatever is still waiting out the door - now. */
function flushPending() {
  if (!pendingSave) return;
  clearTimeout(pendingSave);
  pendingSave = null;
  const state = pendingState;
  pendingState = null;
  if (state) void upload(state);
}

let exitFlushArmed = false;
function armExitFlush() {
  if (exitFlushArmed || typeof window === "undefined") return;
  exitFlushArmed = true;
  // The debounce trades chattiness for an exit hazard: close the tab within
  // the window and the last action never uploads. `pagehide` covers close
  // and navigation, the visibility flip covers mobile tab switches where
  // pagehide may never fire, and `keepalive` on the fetch lets the request
  // outlive the page.
  window.addEventListener("pagehide", flushPending);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPending();
  });
}

export const remoteProgressStore: ProgressStore = {
  async load() {
    const local = await localProgressStore.load();
    const server = await fetchServerState();
    if (!server) return local;

    const merged = merge(server, local);
    // Push the merge result up straight away so pre-sign-in work is visible
    // to the manager without waiting for the joinee's next action.
    void upload(merged);
    void localProgressStore.save(merged);
    return merged;
  },

  async save(state) {
    void localProgressStore.save(state);
    armExitFlush();
    pendingState = state;
    if (pendingSave) clearTimeout(pendingSave);
    pendingSave = setTimeout(() => {
      pendingSave = null;
      pendingState = null;
      void upload(state);
    }, SAVE_DEBOUNCE_MS);
  },

  async clear() {
    await localProgressStore.clear();
  },
};
