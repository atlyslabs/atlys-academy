import "server-only";

import { DAYS } from "@/content/onboarding/days";
import {
  TEAM_LEADERS,
  type TeamLeader,
} from "@/content/onboarding/team-leaders";
import type { DayId } from "@/content/onboarding/types";
import { HIDE_STAFF_FROM_DESK } from "@/lib/dev-flags";
import { calculatePoints } from "@/lib/progress/points";
import { hasPassedQuiz } from "@/lib/progress/selectors";
import { stampTotals } from "@/lib/progress/stamps";
import { hasEarnedVoucher } from "@/lib/progress/voucher";
import {
  type AvatarConfig,
  emptyProgress,
  type ProgressState,
  type QuizAttemptRecord,
} from "@/lib/progress/types";
import { getDb } from "./db";
import { voucherCodeFor } from "./voucher";

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
  /**
   * The roster id the joinee picked at sign-in, already validated against the
   * roster (see `normalizeTeamLeader`) - null when they have none on file or
   * the cookie was missing/unknown.
   */
  teamLeader?: string | null;
  /** "presales" or "admin", validated at the edge. Null when not picked. */
  role?: string | null;
}

/**
 * True when a Supabase error is "drill_results.attempts is not there yet".
 *
 * Same tolerance as `isMissingProfileColumn` below, and it exists for the same
 * reason: the column is added by an additive statement in
 * `supabase/schema.sql`, and until someone runs it the reads and writes below
 * would fail. Without this, a deploy of the three-attempt cap against an
 * un-migrated database does not degrade - it breaks hard and silently. The
 * SELECT returns Postgres 42703 and `drills.data` comes back null, so EVERY
 * drill result vanishes from the loaded state; the upsert returns PostgREST
 * PGRST204 and throws, so every progress sync 500s. Neither says why.
 *
 * With this, a database missing the column behaves exactly as it did before the
 * cap existed: drill results load and save, and every drill reads as one play
 * used (see `drillAttemptsUsed`), so nobody is locked out either.
 */
function isMissingAttemptsColumn(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  const known = error.code === "42703" || error.code === "PGRST204";
  return known && (error.message ?? "").includes("attempts");
}

/**
 * True when a Supabase error is "one of the sign-in profile columns is not
 * there yet" - `team_leader` or `role`.
 *
 * Reads report it as Postgres `42703` (undefined column); writes report it as
 * PostgREST `PGRST204` (column missing from the schema cache). Either means the
 * additive migration in `supabase/schema.sql` has not been applied. The code
 * tolerates that window so sign-in, sync and the admin desk keep working -
 * everyone simply unassigned - rather than hard-failing until the SQL is run.
 */
function isMissingProfileColumn(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  const known = error.code === "42703" || error.code === "PGRST204";
  if (!known) return false;
  const message = error.message ?? "";
  return message.includes("team_leader") || message.includes("role");
}

/**
 * Find-or-create the profile row; first sign-in date fixes the cohort.
 *
 * The team leader is persisted here, and this is the only place it can be:
 * `currentProfile` reads the (validated) value from the sign-in cookie and
 * hands it in. For a brand-new row it goes in the insert. For an existing row
 * it is written only when a value is supplied AND differs from what is stored -
 * so a returning joinee who picked a leader before this column existed is
 * backfilled on their next sync, a joinee who changes their pick is updated,
 * and the steady state (same value every sync) writes nothing. A null/missing
 * value never clears an existing leader.
 *
 * If the column is not migrated yet, the whole path degrades to its pre-column
 * behaviour rather than 500-ing every sync.
 */
export async function ensureProfile(identity: JoineeIdentity) {
  const db = getDb();
  if (!db) return null;

  // Feature-detect the sign-in columns on the existence check: on a database
  // without them, fall back to the base select so `existing` is still found.
  let hasSignInColumns = true;
  let lookup = await db
    .from("profiles")
    .select("id, cohort_date, team_leader, role")
    .eq("google_sub", identity.googleSub)
    .maybeSingle();
  if (lookup.error && isMissingProfileColumn(lookup.error)) {
    hasSignInColumns = false;
    lookup = await db
      .from("profiles")
      .select("id, cohort_date")
      .eq("google_sub", identity.googleSub)
      .maybeSingle();
  }
  const existing = lookup.data as
    | {
        id: string;
        cohort_date: string;
        team_leader?: string | null;
        role?: string | null;
      }
    | null;

  if (existing) {
    // Write only what actually changed, so the steady state (the same values on
    // every sync) costs no write at all.
    const patch: Record<string, string> = {};
    if (
      identity.teamLeader != null &&
      identity.teamLeader !== existing.team_leader
    ) {
      patch.team_leader = identity.teamLeader;
    }
    if (identity.role != null && identity.role !== existing.role) {
      patch.role = identity.role;
    }
    if (hasSignInColumns && Object.keys(patch).length > 0) {
      await db.from("profiles").update(patch).eq("id", existing.id);
    }
    return existing;
  }

  const { data: created, error } = await db
    .from("profiles")
    .insert({
      google_sub: identity.googleSub,
      email: identity.email,
      full_name: identity.name ?? null,
      // Only name the columns when they exist, so a pre-migration insert does
      // not 400 on an unknown key.
      ...(hasSignInColumns
        ? {
            team_leader: identity.teamLeader ?? null,
            role: identity.role ?? null,
          }
        : {}),
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

  const [items, attempts, drillsWithAttempts, exercises, appState] =
    await Promise.all([
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
        .select("drill_id, status, score, max_score, attempts, updated_at")
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

  // Fall back to the pre-cap column list on a database that has not had the
  // additive `attempts` column applied yet. Re-reading is cheap and only
  // happens on such a database; the alternative is losing every drill result.
  let drills = drillsWithAttempts;
  if (drillsWithAttempts.error && isMissingAttemptsColumn(drillsWithAttempts.error)) {
    console.warn(
      "[onboarding] drill_results.attempts is missing - run supabase/schema.sql to enable the three-attempt drill cap. Treating every stored drill as one play used.",
    );
    drills = (await db
      .from("drill_results")
      .select("drill_id, status, score, max_score, updated_at")
      .eq("profile_id", profileId)) as typeof drillsWithAttempts;
  }

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
      // Null for a row written before the column existed, and absent entirely
      // on a database where the column itself is missing. `drillAttemptsUsed`
      // reads either as one play used, so those joinees keep two goes instead
      // of being locked out of a drill they had already done.
      attempts: row.attempts ?? undefined,
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

/**
 * Upsert drill results, dropping the attempt count on a database that has not
 * had the additive `attempts` column applied.
 *
 * Retrying without the field rather than failing is the same tolerance
 * `ensureProfile` shows for the sign-in columns. The alternative is worse than
 * an unenforced cap: a single unknown column makes PostgREST reject the whole
 * upsert, which throws out of `saveProgress` and 500s the sync - so the joinee's
 * checklist, quiz marks and ODPAC report all stop reaching the database while
 * their screen keeps saying everything is saved. That exact failure has
 * happened three times on this project already, for three different fields.
 * See docs/pre-deploy.md.
 */
async function upsertDrills(
  db: NonNullable<ReturnType<typeof getDb>>,
  drills: Record<string, unknown>[],
) {
  const withAttempts = await db.from("drill_results").upsert(drills);
  if (!withAttempts.error || !isMissingAttemptsColumn(withAttempts.error)) {
    return withAttempts;
  }
  console.warn(
    "[onboarding] drill_results.attempts is missing - saving drill results without the attempt count. Run supabase/schema.sql to enable the three-attempt drill cap.",
  );
  const stripped = drills.map((row) => {
    const { attempts: _dropped, ...rest } = row as { attempts?: unknown };
    return rest;
  });
  return db.from("drill_results").upsert(stripped);
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
    attempts: result.attempts ?? null,
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
    drills.length ? upsertDrills(db, drills) : null,
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

/* ---------------------------------------------------------------------------
 * The team-leader roster.
 *
 * Lives in the database so an admin can add to it from the desk, with the
 * static list in `src/content/onboarding/team-leaders.ts` as the fallback for
 * a deployment where the table has not been created yet. Every reader below
 * degrades to that fallback rather than failing: an unreachable roster must
 * never take the sign-in page down with it.
 * ------------------------------------------------------------------------- */

/** True when the error is "the team_leaders table is not there yet". */
function isMissingRosterTable(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  // 42P01 is Postgres "undefined table"; PGRST205 is PostgREST failing to find
  // it in its schema cache.
  if (error.code === "42P01" || error.code === "PGRST205") return true;

  // The message is only consulted when there is no code to go on, and even then
  // it has to say the relation is MISSING - not merely mention the table.
  //
  // This used to be a bare `message.includes("team_leaders")`, which was too
  // loose to be right: a unique violation reads "duplicate key value violates
  // unique constraint \"team_leaders_pkey\"", so adding a leader who was
  // already on the roster came back as "the roster table is not set up yet.
  // Run supabase/schema.sql" - sending an admin to the SQL editor to fix a
  // name they had simply typed twice.
  if (error.code) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("team_leaders") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("undefined table"))
  );
}

/**
 * The roster as stored, newest last. Returns null - not an empty list - when
 * the database cannot answer, so the caller can tell "no leaders yet" apart
 * from "no roster table" and fall back to the static list for the latter.
 */
export async function listTeamLeaders(): Promise<TeamLeader[] | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from("team_leaders")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    if (isMissingRosterTable(error)) return null;
    throw error;
  }
  return (data ?? []) as TeamLeader[];
}

/**
 * The roster an admin desk or sign-in page should offer: the database list
 * when there is one, the static list otherwise. Never throws for a missing
 * table, because both callers would rather show the seed names than nothing.
 */
export async function teamLeaderRoster(): Promise<TeamLeader[]> {
  try {
    const stored = await listTeamLeaders();
    if (stored && stored.length > 0) return stored;
  } catch (error) {
    console.warn("[onboarding] team-leader roster unreadable", error);
  }
  return [...TEAM_LEADERS];
}

/** A stable slug for a new leader: lowercase, dashed, ASCII-safe. */
function slugForLeader(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "leader"
  );
}

export type AddTeamLeaderResult =
  | { ok: true; leader: TeamLeader }
  | { ok: false; reason: "unavailable" | "invalid" | "duplicate" };

/**
 * Add a leader to the roster. Admin-gated by the caller.
 *
 * The id is derived from the name once and then frozen - it is what lands in
 * `profiles.team_leader`, so renaming a leader later must not orphan the
 * joinees already pointing at them. A clashing slug is rejected rather than
 * silently suffixed, because two leaders whose ids differ by a digit is a
 * worse problem to debug than a rejected form.
 */
export async function addTeamLeader(
  rawName: string,
): Promise<AddTeamLeaderResult> {
  const db = getDb();
  if (!db) return { ok: false, reason: "unavailable" };

  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 64) return { ok: false, reason: "invalid" };

  const id = slugForLeader(name);
  const { data, error } = await db
    .from("team_leaders")
    .insert({ id, name })
    .select("id, name")
    .single();

  if (error) {
    if (isMissingRosterTable(error)) return { ok: false, reason: "unavailable" };
    // 23505 is a unique violation - this leader is already on the roster.
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, reason: "duplicate" };
    }
    throw error;
  }
  return { ok: true, leader: data as TeamLeader };
}

export type RemoveTeamLeaderResult =
  | { ok: true; name: string; orphaned: number }
  | { ok: false; reason: "unavailable" | "not-found" };

/**
 * How many joinees currently point at a roster id.
 *
 * Read before a delete so the confirmation can say what it will actually cost.
 * Nothing cascades here - `profiles.team_leader` is a plain text column, not a
 * foreign key - so removing a leader leaves those rows pointing at an id that
 * no longer resolves, and the desk falls back to printing the raw slug.
 */
export async function countJoineesUnder(id: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const { count, error } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("team_leader", id);
  // A database without the column yet cannot have anybody assigned.
  if (error) return isMissingProfileColumn(error) ? 0 : 0;
  return count ?? 0;
}

/**
 * Take a leader off the roster. Admin-gated by the caller.
 *
 * Deliberately NOT blocked when joinees still point at the id. An admin
 * removing somebody who has left the company is the common case, and refusing
 * would leave them stuck with a name they cannot get rid of. What the caller
 * gets instead is `orphaned` - the number of joinees whose stored id will stop
 * resolving - so the confirmation can state the consequence rather than hide
 * it. Their progress is untouched either way; only the label changes, to the
 * raw slug (see `teamLeaderName`).
 *
 * The row is read back first so the result can name who was removed. Deleting
 * something and reporting only "done" is the wrong answer for a destructive
 * action - the admin should see the name they just took off.
 */
export async function removeTeamLeader(
  id: string,
): Promise<RemoveTeamLeaderResult> {
  const db = getDb();
  if (!db) return { ok: false, reason: "unavailable" };

  const { data: existing, error: lookupError } = await db
    .from("team_leaders")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) {
    if (isMissingRosterTable(lookupError)) {
      return { ok: false, reason: "unavailable" };
    }
    throw lookupError;
  }
  if (!existing) return { ok: false, reason: "not-found" };

  const orphaned = await countJoineesUnder(id);

  const { error } = await db.from("team_leaders").delete().eq("id", id);
  if (error) {
    if (isMissingRosterTable(error)) return { ok: false, reason: "unavailable" };
    throw error;
  }
  return { ok: true, name: (existing as TeamLeader).name, orphaned };
}

export interface AdminJoineeRow {
  email: string;
  name: string | null;
  cohortDate: string;
  /** Roster id of the joinee's team leader, or null when none is on file. */
  teamLeader: string | null;
  /**
   * That leader's display name, resolved here against the live roster.
   *
   * Resolved server-side on purpose: the roster is editable and lives in the
   * database, so the client has no reliable way to turn an id into a name.
   * Null when there is no leader; falls back to the id itself when the leader
   * has been removed from the roster but joinees still point at them.
   */
  teamLeaderName: string | null;
  points: number;
  daysCompleted: number;
  /** Best score per quiz slug, e.g. { day1: "4/5" }. */
  quizBest: Record<string, string>;
  /** Whether that day's quiz is passed at the mark, keyed the same way. */
  quizPassed: Record<string, boolean>;
  activitiesDone: number;
  /**
   * Passport stamps collected out of collectable, across all days.
   *
   * This is what the admin desk prints as "activities": a stamp is issued for
   * finishing a real thing (the day's reading, its checklist, each drill, the
   * quiz), so a full sheet and a finished day are the same statement. The
   * `activitiesDone` count above stays for the Slack report, which counts
   * checklist ticks rather than souvenirs.
   */
  stamps: { earned: number; total: number };
  /** Free-text submissions, verbatim - what the mentor actually reads. */
  exercises: { key: string; body: string; submittedAt: string }[];
  /**
   * The end-of-academy voucher code, or null until it is earned.
   *
   * Derived here from `profiles.id` rather than stored, so the desk and the
   * joinee's own screen cannot disagree - see `voucher.ts`. Null while
   * unearned, deliberately: a team leader must never be able to read out a code
   * to somebody who has not finished, and printing one early is exactly how
   * that would happen.
   */
  voucherCode: string | null;
  lastActivityAt: string | null;
  /**
   * EVERY activity timestamp, oldest first - not just the newest.
   *
   * `lastActivityAt` above answers "when were they last seen", which is what
   * the desk column needs. It cannot answer "did they do anything on the 30th",
   * and the daily Slack report was using it for exactly that: a joinee who
   * worked all day Sunday and then touched anything on Monday morning had their
   * latest timestamp move to Monday, so Sunday's report counted them idle and
   * announced "nobody did anything on this day". That happened in production on
   * 30 Aug 2026 to the one joinee who had actually finished the day's work.
   *
   * A whole cohort's timestamps is a couple of hundred short strings, so this
   * is cheap; the report needs the set, not a summary of it.
   */
  activityAt: string[];
  /**
   * Every quiz attempt with its date, so a report about a past day can describe
   * that day rather than this moment.
   *
   * `quizBest` and `daysCompleted` above are current-state and stay that way -
   * the desk is a live view. But a report headed "Sun, 30 Aug" saying somebody
   * is on day 2 because they passed day 1 on the Monday morning is telling the
   * reader something untrue about the day they are reading about.
   */
  attemptsAt: {
    quizSlug: string;
    score: number;
    maxScore: number;
    passed: boolean;
    submittedAt: string;
  }[];
}

/** Everything the manager sees, one row per joinee, newest cohort first. */
export async function adminOverview(): Promise<AdminJoineeRow[] | null> {
  const db = getDb();
  if (!db) return null;

  type ProfileRow = {
    id: string;
    email: string;
    full_name: string | null;
    team_leader?: string | null;
    role?: string | null;
    cohort_date: string;
  };

  const withSignInColumns = await db
    .from("profiles")
    .select("id, email, full_name, team_leader, role, cohort_date")
    .order("cohort_date", { ascending: false });

  // Before the migration lands, read without those columns so the desk still
  // shows everyone (unassigned) instead of hard-failing. This is the ONE
  // tolerated error - any other failure is surfaced rather than swallowed into
  // an empty desk that reads as "nobody has signed in".
  let profiles: ProfileRow[] | null;
  if (
    withSignInColumns.error &&
    isMissingProfileColumn(withSignInColumns.error)
  ) {
    console.warn(
      "[onboarding] profiles.team_leader / profiles.role are missing - run supabase/schema.sql to enable team-leader grouping. Showing everyone as unassigned.",
    );
    const base = await db
      .from("profiles")
      .select("id, email, full_name, cohort_date")
      .order("cohort_date", { ascending: false });
    if (base.error) throw base.error;
    profiles = base.data as ProfileRow[] | null;
  } else {
    if (withSignInColumns.error) throw withSignInColumns.error;
    profiles = withSignInColumns.data as ProfileRow[] | null;
  }

  // One roster read for the whole page, so a name lookup is not a query per row.
  //
  // Seeded with the built-in list FIRST and then overlaid with the stored one:
  // a joinee who picked a seed leader before the roster moved into the database
  // still points at that seed id, and without this their leader would print as
  // the raw slug. Stored names win where the two overlap.
  const rosterNames = new Map<string, string>(
    TEAM_LEADERS.map((leader) => [leader.id, leader.name]),
  );
  for (const leader of await teamLeaderRoster()) {
    rosterNames.set(leader.id, leader.name);
  }

  // Staff are not joinees: an admin signs in to read this desk, and without
  // this they land in it as a row of their own - no team leader, no progress -
  // dragging every completion rate down with them.
  //
  // The role picked at sign-in is the only authority. The configured
  // admin-email list is NOT a fallback here, and that is deliberate: the same
  // person is often both, and someone on that list who signs in as a presales
  // associate to walk the journey is a joinee. Guessing from the email hid a
  // real joinee's progress completely, which is a far worse failure than an
  // admin briefly showing up as a row until they sign in with a role.
  const joinees = (profiles ?? []).filter(
    (profile) => !HIDE_STAFF_FROM_DESK || profile.role !== "admin",
  );

  return Promise.all(
    joinees.map(async (profile) => {
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
      const stamps = stampTotals(state);
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
        teamLeader: profile.team_leader ?? null,
        teamLeaderName: profile.team_leader
          ? (rosterNames.get(profile.team_leader) ?? profile.team_leader)
          : null,
        points: calculatePoints(state).total,
        daysCompleted: DAYS.filter((d) => hasPassedQuiz(state, d.slug)).length,
        quizBest,
        quizPassed: Object.fromEntries(
          DAYS.map((day) => [day.slug, hasPassedQuiz(state, day.slug)]),
        ),
        activitiesDone: Object.keys(state.completedItems).length,
        stamps: { earned: stamps.earned, total: stamps.total },
        exercises: Object.entries(state.exercises).map(([key, sub]) => ({
          key,
          body: sub.body,
          submittedAt: sub.submittedAt,
        })),
        voucherCode: hasEarnedVoucher(state)
          ? voucherCodeFor(profile.id)
          : null,
        lastActivityAt: timestamps.at(-1) ?? null,
        activityAt: timestamps,
        attemptsAt: state.attempts.map((a) => ({
          quizSlug: a.quizSlug,
          score: a.score,
          maxScore: a.maxScore,
          passed: a.passed,
          submittedAt: a.submittedAt,
        })),
      };
    }),
  );
}
