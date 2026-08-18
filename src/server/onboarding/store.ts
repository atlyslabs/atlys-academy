import "server-only";

import { DAYS } from "@/content/onboarding/days";
import type { DayId } from "@/content/onboarding/types";
import { calculatePoints } from "@/lib/progress/points";
import { hasPassedQuiz } from "@/lib/progress/selectors";
import {
  type AvatarConfig,
  emptyProgress,
  type ProgressState,
  type QuizAttemptRecord,
} from "@/lib/progress/types";
import { getDb } from "./db";

/**
 * Server persistence for joinee progress.
 *
 * The client remains the writer (it PUTs its whole `ProgressState`, the same
 * shape it keeps in localStorage) and this module fans that state out into
 * relational rows so the admin view and leaderboard can query across users.
 * Reads reassemble the same shape. One shape end to end; points are computed
 * with the same `calculatePoints` the client HUD uses, so the two can never
 * disagree.
 *
 * Trust model v1: state is client-pushed and stored as-is - the same trust
 * level as the localStorage it replaces. See supabase/schema.sql for the
 * planned hardening.
 */

export interface JoineeIdentity {
  googleSub: string;
  email: string;
  name?: string | null;
}

/** Find-or-create the profile row; first sign-in date fixes the cohort. */
export async function ensureProfile(identity: JoineeIdentity) {
  const db = getDb();
  if (!db) return null;

  const { data: existing } = await db
    .from("profiles")
    .select("id, cohort_date")
    .eq("google_sub", identity.googleSub)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await db
    .from("profiles")
    .insert({
      google_sub: identity.googleSub,
      email: identity.email,
      full_name: identity.name ?? null,
    })
    .select("id, cohort_date")
    .single();
  if (error) {
    // Raced by a concurrent first request - the unique index means the row
    // exists now; re-read it.
    const { data: raced } = await db
      .from("profiles")
      .select("id, cohort_date")
      .eq("google_sub", identity.googleSub)
      .maybeSingle();
    if (raced) return raced;
    throw error;
  }
  return created;
}

export async function loadProgress(profileId: string): Promise<ProgressState> {
  const db = getDb();
  if (!db) return emptyProgress();

  const [items, attempts, drills, exercises, appState] = await Promise.all([
    db
      .from("progress_items")
      .select("item_key, completed_at")
      .eq("profile_id", profileId),
    db
      .from("quiz_attempts")
      .select("id, quiz_slug, score, max_score, passed, submitted_at")
      .eq("profile_id", profileId)
      .order("submitted_at", { ascending: true }),
    db
      .from("drill_results")
      .select("drill_id, status, score, max_score, updated_at")
      .eq("profile_id", profileId),
    db
      .from("exercise_submissions")
      .select("exercise_key, body, submitted_at")
      .eq("profile_id", profileId),
    db
      .from("app_state")
      .select("last_visited_day, avatar")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);

  const state = emptyProgress();
  for (const row of items.data ?? []) {
    state.completedItems[row.item_key] = row.completed_at;
  }
  state.attempts = (attempts.data ?? []).map(
    (row): QuizAttemptRecord => ({
      id: row.id,
      quizSlug: row.quiz_slug,
      score: row.score,
      maxScore: row.max_score,
      passed: row.passed,
      submittedAt: row.submitted_at,
    }),
  );
  for (const row of drills.data ?? []) {
    state.drills[row.drill_id as keyof ProgressState["drills"]] = {
      status: row.status,
      score: row.score ?? undefined,
      maxScore: row.max_score ?? undefined,
      updatedAt: row.updated_at,
    };
  }
  for (const row of exercises.data ?? []) {
    state.exercises[row.exercise_key] = {
      body: row.body,
      submittedAt: row.submitted_at,
    };
  }
  state.lastVisitedDay = (appState.data?.last_visited_day ?? 1) as DayId;
  if (appState.data?.avatar) {
    state.avatar = appState.data.avatar as ProgressState["avatar"];
  }
  return state;
}

export async function saveProgress(
  profileId: string,
  state: ProgressState,
): Promise<void> {
  const db = getDb();
  if (!db) return;

  // Upserts keyed on stable ids make the whole save idempotent - replaying the
  // same state is a no-op, and nothing here deletes: un-ticking a checklist
  // item locally leaves the server row, which is the conservative direction
  // for an audit trail the manager reads.
  const items = Object.entries(state.completedItems).map(
    ([item_key, completed_at]) => ({ profile_id: profileId, item_key, completed_at }),
  );
  const attempts = state.attempts.map((attempt) => ({
    id: attempt.id,
    profile_id: profileId,
    quiz_slug: attempt.quizSlug,
    score: attempt.score,
    max_score: attempt.maxScore,
    passed: attempt.passed,
    submitted_at: attempt.submittedAt,
  }));
  const drills = Object.entries(state.drills).map(([drill_id, result]) => ({
    profile_id: profileId,
    drill_id,
    status: result.status,
    score: result.score ?? null,
    max_score: result.maxScore ?? null,
    updated_at: result.updatedAt,
  }));
  const exercises = Object.entries(state.exercises).map(
    ([exercise_key, submission]) => ({
      profile_id: profileId,
      exercise_key,
      body: submission.body,
      submitted_at: submission.submittedAt,
    }),
  );

  const results = await Promise.all([
    items.length
      ? db.from("progress_items").upsert(items, { ignoreDuplicates: true })
      : null,
    attempts.length
      ? db.from("quiz_attempts").upsert(attempts, { ignoreDuplicates: true })
      : null,
    drills.length ? db.from("drill_results").upsert(drills) : null,
    exercises.length ? db.from("exercise_submissions").upsert(exercises) : null,
    db.from("app_state").upsert({
      profile_id: profileId,
      last_visited_day: state.lastVisitedDay,
      avatar: state.avatar ?? null,
      updated_at: new Date().toISOString(),
    }),
  ]);
  const failed = results.find((r) => r?.error);
  if (failed?.error) throw failed.error;
}

/* -------------------------------------------------------------------------- */
/* Cross-user reads - leaderboard and admin                                    */
/* -------------------------------------------------------------------------- */

export interface LeaderboardRow {
  /** Display name falls back to the email's local part. */
  name: string;
  /** Null until the joinee picks one - the renderer shows its default. */
  avatar: AvatarConfig | null;
  points: number;
  daysCompleted: number;
  isYou: boolean;
}

/** Everyone in the same cohort, ranked by points. */
export async function cohortLeaderboard(
  profileId: string,
): Promise<{ cohortDate: string; rows: LeaderboardRow[] } | null> {
  const db = getDb();
  if (!db) return null;

  const { data: me } = await db
    .from("profiles")
    .select("cohort_date")
    .eq("id", profileId)
    .maybeSingle();
  if (!me) return null;

  const { data: peers } = await db
    .from("profiles")
    .select("id, email, full_name")
    .eq("cohort_date", me.cohort_date);

  const rows = await Promise.all(
    (peers ?? []).map(async (peer) => {
      const state = await loadProgress(peer.id);
      return {
        name: peer.full_name || peer.email.split("@")[0],
        // Older stored states predate avatars - absence renders the default.
        avatar: state.avatar ?? null,
        points: calculatePoints(state).total,
        daysCompleted: DAYS.filter((d) => hasPassedQuiz(state, d.slug)).length,
        isYou: peer.id === profileId,
      };
    }),
  );
  rows.sort((a, b) => b.points - a.points);
  return { cohortDate: me.cohort_date, rows };
}

export interface AdminJoineeRow {
  email: string;
  name: string | null;
  cohortDate: string;
  points: number;
  daysCompleted: number;
  /** Best score per quiz slug, e.g. { day1: "4/5" }. */
  quizBest: Record<string, string>;
  activitiesDone: number;
  /** Free-text submissions, verbatim - what the mentor actually reads. */
  exercises: { key: string; body: string; submittedAt: string }[];
  lastActivityAt: string | null;
}

/** Everything the manager sees, one row per joinee, newest cohort first. */
export async function adminOverview(): Promise<AdminJoineeRow[] | null> {
  const db = getDb();
  if (!db) return null;

  const { data: profiles } = await db
    .from("profiles")
    .select("id, email, full_name, cohort_date")
    .order("cohort_date", { ascending: false });

  return Promise.all(
    (profiles ?? []).map(async (profile) => {
      const state = await loadProgress(profile.id);
      const quizBest: Record<string, string> = {};
      for (const day of DAYS) {
        const best = state.attempts
          .filter((a) => a.quizSlug === day.slug)
          .reduce<QuizAttemptRecord | null>(
            (acc, a) => (!acc || a.score > acc.score ? a : acc),
            null,
          );
        if (best) quizBest[day.slug] = `${best.score}/${best.maxScore}`;
      }
      // Written work counts as activity. Without the exercises line, a joinee
      // whose only action today was filing their ODPAC report reads as inactive
      // and drops out of the daily Slack report entirely - taking the one
      // artefact a mentor actually has to read with them.
      const timestamps = [
        ...Object.values(state.completedItems),
        ...state.attempts.map((a) => a.submittedAt),
        ...Object.values(state.drills).map((d) => d.updatedAt),
        ...Object.values(state.exercises).map((e) => e.submittedAt),
      ].sort();
      return {
        email: profile.email,
        name: profile.full_name,
        cohortDate: profile.cohort_date,
        points: calculatePoints(state).total,
        daysCompleted: DAYS.filter((d) => hasPassedQuiz(state, d.slug)).length,
        quizBest,
        activitiesDone: Object.keys(state.completedItems).length,
        exercises: Object.entries(state.exercises).map(([key, sub]) => ({
          key,
          body: sub.body,
          submittedAt: sub.submittedAt,
        })),
        lastActivityAt: timestamps.at(-1) ?? null,
      };
    }),
  );
}
