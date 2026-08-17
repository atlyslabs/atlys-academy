"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  DayId,
  DrillId,
  ExerciseKey,
  ItemKey,
} from "@/content/onboarding/types";
import { localProgressStore } from "./local-store";
import { remoteProgressStore } from "./remote-store";
import { progressReducer } from "./reducer";
import {
  emptyProgress,
  type AvatarConfig,
  type ProgressState,
  type ProgressStore,
  type QuizAttemptRecord,
} from "./types";

interface ProgressContextValue {
  state: ProgressState;
  /** False until the store has been read. Gate anything that would flash. */
  ready: boolean;
  toggleItem(itemKey: ItemKey, done: boolean): void;
  setDrillResult(
    drillId: DrillId,
    result: { status: string; score?: number; maxScore?: number },
  ): void;
  saveExercise(exerciseKey: ExerciseKey, body: string): void;
  recordAttempt(attempt: Omit<QuizAttemptRecord, "id" | "submittedAt">): void;
  setLastVisitedDay(dayId: DayId): void;
  setAvatar(avatar: AvatarConfig): void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

/**
 * Owns all joinee progress for the session.
 *
 * `mode` is decided by the server layout, which knows whether Google auth and
 * Supabase are both configured: "remote" syncs through the API (with a
 * localStorage write-through), "local" is browser-only - the pre-database
 * behaviour, still the default.
 */
export function ProgressProvider({
  children,
  mode = "local",
  store,
}: {
  children: ReactNode;
  mode?: "local" | "remote";
  store?: ProgressStore;
}) {
  store ??= mode === "remote" ? remoteProgressStore : localProgressStore;
  const [state, dispatch] = useReducer(progressReducer, undefined, emptyProgress);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void store.load().then((loaded) => {
      if (cancelled) return;
      dispatch({ type: "hydrate", state: loaded });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  // Persist after every change, but never write the pre-hydration default over
  // whatever is already stored.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    void store.save(state);
  }, [ready, state, store]);

  // The actions close over nothing but `dispatch`, which useReducer
  // guarantees is stable - so they are memoised once and NEVER change
  // identity. This is a contract, not an optimisation: consumers put these
  // in effect dependency arrays (`useEffect(..., [setLastVisitedDay])`), and
  // an action that changed with `state` would re-fire any effect that also
  // dispatches, looping the tree until React aborts it.
  const actions = useMemo(
    () => ({
      toggleItem: (itemKey: ItemKey, done: boolean) =>
        dispatch({ type: "toggleItem", itemKey, done, at: nowIso() }),
      setDrillResult: (
        drillId: DrillId,
        result: { status: string; score?: number; maxScore?: number },
      ) => dispatch({ type: "setDrill", drillId, ...result, at: nowIso() }),
      saveExercise: (exerciseKey: ExerciseKey, body: string) =>
        dispatch({ type: "saveExercise", exerciseKey, body, at: nowIso() }),
      recordAttempt: (attempt: Omit<QuizAttemptRecord, "id" | "submittedAt">) =>
        dispatch({
          type: "recordAttempt",
          attempt: { ...attempt, id: newId(), submittedAt: nowIso() },
        }),
      setLastVisitedDay: (dayId: DayId) =>
        dispatch({ type: "setLastVisitedDay", dayId }),
      setAvatar: (avatar: AvatarConfig) =>
        dispatch({ type: "setAvatar", avatar }),
    }),
    [],
  );

  const value = useMemo<ProgressContextValue>(
    () => ({ state, ready, ...actions }),
    [state, ready, actions],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used inside <ProgressProvider>");
  }
  return context;
}

function nowIso() {
  return new Date().toISOString();
}

function newId(): string {
  // Typed as Partial: lib.dom promises `randomUUID` unconditionally, but at
  // runtime it exists only in secure contexts - and the dev server's LAN URL
  // (http://192.168.x.x) is not one.
  const c = typeof crypto !== "undefined" ? (crypto as Partial<Crypto>) : null;
  if (c?.randomUUID) return c.randomUUID();
  // The server schema requires a real UUID for attempt ids - one made-up
  // shape here and the WHOLE progress upload fails validation from then on,
  // silently ending sync for this joinee - so build a well-formed v4 by hand.
  const bytes = c?.getRandomValues
    ? c.getRandomValues(new Uint8Array(16))
    : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
