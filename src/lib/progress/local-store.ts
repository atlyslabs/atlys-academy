import {
  emptyProgress,
  PROGRESS_VERSION,
  type ProgressState,
  type ProgressStore,
} from "./types";

const STORAGE_KEY = "atlys-onboarding.progress.v1";

/**
 * Phase 2 persistence: one JSON blob in localStorage.
 *
 * Deliberately forgiving - a corrupt or stale payload resets to empty progress
 * rather than throwing, because losing a checklist is a far smaller problem
 * than a joinee hitting a blank page on Day 3.
 */
export const localProgressStore: ProgressStore = {
  async load() {
    if (typeof window === "undefined") return emptyProgress();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyProgress();

      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      if (parsed.version !== PROGRESS_VERSION) return emptyProgress();

      // Spread over a fresh default so a payload missing a newer field still loads.
      return { ...emptyProgress(), ...parsed, version: PROGRESS_VERSION };
    } catch {
      return emptyProgress();
    }
  },

  async save(state) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded or storage disabled (private browsing). The session
      // still works, it just will not survive a reload.
    }
  },

  async clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
