/**
 * The team-leader roster - the shared source of truth for who a joinee reports
 * to during onboarding.
 *
 * This lives in `content/` rather than beside the sign-in page because three
 * places need it and they span the server/client line: the sign-in `<select>`
 * (server component), the profile write path that validates the picked value
 * (server), and the admin desk's team-leader filter (client). The sign-in
 * module imports `next/headers` and `@/auth`, and the store imports
 * `server-only`, so neither can be the shared home - a plain content module
 * can, exactly as `mentors.ts` already is for the client.
 *
 * `id` is the stable value that gets persisted and must never change once real
 * joinees have picked it; `name` is the label and is free to be edited.
 */

/**
 * The two ways someone arrives at onboarding, as persisted.
 *
 * A presales associate is a joinee: they report to a team leader and they are
 * who the admin desk is about. An admin is staff - they sign in to read the
 * desk, not to walk the journey, so they are kept out of every joinee count.
 */
export type OnboardingRole = "presales" | "admin";

export function normalizeRole(value: unknown): OnboardingRole | null {
  return value === "presales" || value === "admin" ? value : null;
}

export interface TeamLeader {
  /** Stable, persisted key. Never rename once data exists. */
  id: string;
  /** Display label - safe to edit. */
  name: string;
}

/**
 * The seed roster: **deliberately empty.**
 *
 * The live roster is the `team_leaders` table, editable from the admin desk,
 * and `teamLeaderRoster()` falls back to this list only when the database
 * cannot answer. It used to hold six entries named "Team leader 1 … 6" with ids
 * `placeholder_1 …`, and those are exactly the wrong thing to fall back to: a
 * joinee picks one at sign-in, the fake id lands in `profiles.team_leader`, and
 * the analytics tab then credits "Team leader 3" for a real team's work.
 *
 * Empty is the honest fallback. An unreachable roster shows an empty dropdown -
 * a visible problem someone fixes - rather than six plausible names that
 * silently corrupt the data behind the desk.
 *
 * Add real leaders on the admin desk, not here.
 */
export const TEAM_LEADERS: readonly TeamLeader[] = [] as const;

/** The band a joinee falls under when they have no team leader on file. */
export const UNASSIGNED_TEAM_LEADER = "Unassigned";

const BY_ID = new Map(TEAM_LEADERS.map((leader) => [leader.id, leader]));

/** True only for an id in the roster - the allowlist the write path trusts. */
export function isKnownTeamLeader(value: unknown): value is string {
  return typeof value === "string" && BY_ID.has(value);
}

/** The shape every roster id has, whether seeded here or added by an admin. */
const LEADER_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * A usable roster id, or null.
 *
 * The value arrives from a fully client-controlled cookie, so it is bounded
 * rather than trusted: anything that is not a short slug normalises to null
 * (no team leader) instead of being persisted verbatim.
 *
 * Deliberately a FORMAT check, not a membership check. The roster is editable
 * by admins and lives in the database, so a membership test against the static
 * seed list would silently drop every newly added leader - the joinee would
 * pick a real name at sign-in and land as unassigned, with nothing anywhere
 * saying why. Whether an id resolves to a name is a display question, answered
 * where the roster is actually known; whether it is safe to store is this one.
 */
export function normalizeTeamLeader(value: unknown): string | null {
  return typeof value === "string" && LEADER_ID.test(value) ? value : null;
}

/** The display label for a stored id; falls back to the id itself, never "-". */
export function teamLeaderName(id: string | null | undefined): string {
  if (!id) return UNASSIGNED_TEAM_LEADER;
  return BY_ID.get(id)?.name ?? id;
}
