/**
 * Temporary review switches.
 *
 * These exist so the whole journey can be walked end-to-end without earning
 * your way through it. Both are meant to be flipped back to `true` before this
 * is put in front of a real joinee - the gate and the countdown are features,
 * not obstacles.
 *
 * Flags rather than commented-out blocks on purpose: the gating code stays
 * compiled, typechecked and covered by `npm run lint`, so it cannot rot while
 * it is switched off.
 */

/**
 * Day N normally opens only once Day N−1's quiz is passed at 70% (PRD §8).
 *
 * `false` = every day open, nothing locked.
 * `true`  = restore the gate.
 *
 * Temporarily `false` (2026-08-17, review pass): every day open so the whole
 * journey can be tested end to end. Flip back to `true` for launch - the
 * 10:30 next-morning rule, stamp gate and seal UI are all wired and waiting.
 */
export const DAY_GATE_ENABLED = false;

/**
 * Whether a full stamp sheet is required to open the next day, on top of
 * passing the quiz.
 *
 * `true`  = every stamp on the day's passport page must be collected - read the
 *           pages, file the checklist, finish every drill, pass the quiz.
 * `false` = the quiz pass alone advances the joinee; stamps stay a souvenir.
 *
 * Only consulted while DAY_GATE_ENABLED is true. Placeholder lessons never
 * count toward a sheet, so a sheet is always collectable - see `stamps.ts`.
 */
export const STAMP_GATE_ENABLED = true;

/**
 * Whether the day's ODPAC report must be filed to open the next day, on top of
 * passing the quiz.
 *
 * The report is a required activity by design - shadow two to three live chats,
 * then write up what you saw against the five stages - so this defaults on. It
 * is a separate flag from the stamp gate because it is a separate promise: a
 * stamp sheet is the day's work, and this is evidence a joinee watched a real
 * conversation and understood what happened in it.
 *
 * Only consulted while DAY_GATE_ENABLED is true.
 */
export const ODPAC_GATE_ENABLED = true;

/**
 * The manager dashboard at `/admin`.
 *
 * `false` = the route is gone: it 404s, the admin API refuses, and nothing in
 *           the joinee UI links to it. This is the "commented out" state, kept
 *           as a flag rather than deleted code so re-adding it is one word.
 * `true`  = live, gated on Google sign-in + ADMIN_EMAILS as designed.
 */
export const ADMIN_ENABLED = true;

/**
 * Local preview of `/admin` while Google credentials do not exist yet.
 *
 * Skips the sign-in and admin-email checks so the layout can be reviewed, and
 * is hard-wired to development - `NODE_ENV` is `"production"` in any real
 * deployment, so this can never open the dashboard to the internet even if it
 * is left switched on.
 */
export const ADMIN_PREVIEW_WITHOUT_AUTH =
  process.env.NODE_ENV !== "production";

/**
 * The "come back tomorrow" rule on the roadmap: Day N+1 needs Day N's quiz
 * passed **and** the clock to reach 10:30 the next morning (see
 * `gateDayKey` in `lib/dates`).
 *
 * `false` = passing a quiz opens the next day immediately (review mode).
 * `true`  = one day per calendar day, opening at 10:30 - the launch behaviour.
 *
 * Only consulted while DAY_GATE_ENABLED is true - with the whole gate off,
 * every day is open regardless.
 */
export const CALENDAR_GATE_ENABLED = true;

/**
 * The pause drill's enforced 10-second wait (PRD §7.2).
 *
 * `false` = "Start the drill" jumps straight to the follow-up message and the
 *           composer. The drill's content is all still there; only the wait
 *           - and therefore the chance to rush and fail - is skipped.
 * `true`  = restore the countdown.
 *
 * Back on: the interactive brief asks for the on-screen counter ("wait 10
 * seconds, show the counter, then they can answer").
 */
export const PAUSE_COUNTDOWN_ENABLED = true;
