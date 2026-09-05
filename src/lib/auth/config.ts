
export const ALLOWED_EMAIL_DOMAIN =
  process.env.AUTH_ALLOWED_DOMAIN?.toLowerCase() || "atlys.com";

export const isAuthConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

/**
 * Whether Auth.js will trust this deployment's host, mirroring the `??` chain
 * in `@auth/core/lib/utils/env.js`.
 *
 * Exported so the check below can name the exact reason, and so a future reader
 * can see what the deploy depends on without opening node_modules.
 */
export const willTrustHost = Boolean(
  process.env.AUTH_URL ??
    process.env.AUTH_TRUST_HOST ??
    process.env.VERCEL ??
    process.env.CF_PAGES ??
    process.env.NODE_ENV !== "production",
);

/**
 * The one deploy mistake that does not announce itself.
 *
 * With sign-in configured but no trusted host, Auth.js returns a non-OK
 * session response and every reader downstream reads that as "not signed in" -
 * so the app does not error, it quietly degrades: middleware bounces joinees to
 * /signin, `currentProfile()` returns null, nothing syncs to the database and
 * /admin is unreachable. Nobody would guess the cause from the symptom, which
 * is why this prints once at startup rather than staying a line in a doc.
 *
 * A warning and not a throw on purpose: `next build` runs without production
 * environment variables in most pipelines, and failing the build for a
 * deploy-time variable would trade a silent runtime fault for a broken CI.
 *
 * Skipped during `next build` for the same reason. The build sets NODE_ENV to
 * production and evaluates this module once per worker, so without the phase
 * check it printed nine identical warnings about a variable the build machine
 * is not supposed to have - which teaches the reader to ignore it, exactly
 * where it needs to be read.
 */
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  isAuthConfigured &&
  !willTrustHost
) {
  console.error(
    "[auth] AUTH_URL is not set and this is not Vercel or Cloudflare Pages, " +
      "so Auth.js trustHost is false. Sessions will read as signed-out: " +
      "joinees get bounced to /signin, nothing syncs, /admin is unreachable. " +
      "Set AUTH_URL to this deployment's origin (see .env.example).",
  );
}

export function isAllowedEmail(
  email: unknown,
  emailVerified: unknown,
): email is string {
  if (typeof email !== "string" || emailVerified !== true) return false;
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  return email.slice(at + 1).toLowerCase() === ALLOWED_EMAIL_DOMAIN;
}

export const ADMIN_EMAILS: readonly string[] = (
  process.env.ADMIN_EMAILS || "shovan@atlys.com " 
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: unknown): boolean {
  return typeof email === "string" && ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * People who see all three days open regardless of the gate.
 *
 * TEMPORARY, and deliberately an env var rather than a constant so it can be
 * revoked by clearing one value instead of shipping code. Added 5 Sep 2026 so a
 * reviewer can walk the whole course - read every page, run every activity,
 * file each ODPAC and sit each quiz - without first earning their way through
 * three days of gating one calendar day at a time.
 *
 * It ONLY lifts the day lock. It changes nothing about how work is recorded:
 * whoever is on this list still earns stamps, points, quiz marks and the
 * voucher exactly as anyone else does, so what they do is a real rehearsal
 * rather than a special mode with its own bugs.
 *
 * Empty by default. With `FULL_ACCESS_EMAILS` unset - which is every
 * environment until someone sets it - `hasFullDayAccess` is false for
 * everybody and the app behaves precisely as it did before this existed.
 *
 * Server-only, like ADMIN_EMAILS: this module is imported by server files, and
 * the value is read in the `/onboarding` page. The browser is handed a single
 * boolean, never the list.
 */
export const FULL_ACCESS_EMAILS: readonly string[] = (
  process.env.FULL_ACCESS_EMAILS || ""
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function hasFullDayAccess(email: unknown): boolean {
  return (
    typeof email === "string" &&
    FULL_ACCESS_EMAILS.includes(email.toLowerCase())
  );
}
