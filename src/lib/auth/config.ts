
export const ALLOWED_EMAIL_DOMAIN =
  process.env.AUTH_ALLOWED_DOMAIN?.toLowerCase() || "atlys.com";

export const isAuthConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

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
