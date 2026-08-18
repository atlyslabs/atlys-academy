import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAuthConfigured, isAdminEmail } from "@/lib/auth/config";
import { ADMIN_ENABLED, ADMIN_PREVIEW_WITHOUT_AUTH } from "@/lib/dev-flags";
import { isSupabaseConfigured } from "@/server/onboarding/db";
import { adminOverview } from "@/server/onboarding/store";
import {
  AdminDesk,
  AdminNotice,
  EnvKey,
} from "@/components/admin/AdminDesk";
import { AdminTable } from "@/components/admin/AdminTable";

export const metadata = {
  title: "Admin · Atlys Academy",
};

// Everything here depends on who is asking - never serve one viewer's page
// from a cache to another.
export const dynamic = "force-dynamic";

/**
 * The manager dashboard.
 *
 * Every access decision below - the kill switch, the development-only preview,
 * the sign-in requirement, the admin-email check and the no-database state - is
 * unchanged; only the staging is. The desk rides the same night stage as the
 * journey rooms, so a manager who walks in from the day desk stays in one
 * building. All of that staging lives in `AdminDesk`.
 */
export default async function AdminPage() {
  // Switched off: behave as though the route does not exist.
  if (!ADMIN_ENABLED) notFound();

  // Local preview while Google credentials are still missing. Development
  // only - see the flag.
  if (ADMIN_PREVIEW_WITHOUT_AUTH && !isAuthConfigured) {
    const rows = isSupabaseConfigured ? await adminOverview() : null;
    return (
      <AdminDesk>
        <p className="mb-6 border-l border-brand-text/40 pl-4 text-[13px] leading-relaxed text-ink-dim">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-text">
            Local preview
          </span>
          <br />
          Sign-in checks are skipped because Google credentials are not set.
          This bypass is development-only and cannot run in a deployment.
        </p>
        <AdminTable rows={rows ?? []} />
      </AdminDesk>
    );
  }

  // No auth means no admin, full stop - this page never falls back to an
  // open mode the way the journey does.
  if (!isAuthConfigured) {
    return (
      <AdminDesk>
        <AdminNotice heading="Sign-in is not configured yet.">
          The admin dashboard is Google-sign-in only by design. It unlocks when{" "}
          <EnvKey>AUTH_GOOGLE_ID</EnvKey> and <EnvKey>AUTH_GOOGLE_SECRET</EnvKey>{" "}
          are set.
        </AdminNotice>
      </AdminDesk>
    );
  }

  const session = await auth();
  if (!session) redirect("/signin?next=/admin");

  // A curious joinee lands here eventually. Tell them plainly instead of
  // bouncing them somewhere and leaving them wondering what happened.
  if (!isAdminEmail(session.user?.email)) {
    return (
      <AdminDesk
        title="This page is for the onboarding manager."
        standfirst="Access is limited to the configured admin emails, and yours is not on that list."
      >
        <AdminNotice heading="Your own progress lives on the journey.">
          Nothing is missing from your account. The chapters, your passport and
          the leaderboard are all where you left them.
          <span className="mt-5 block">
            <Link
              href="/onboarding"
              className="text-ink underline decoration-hairline-lit underline-offset-4 transition-colors hover:decoration-ink-dim"
            >
              Back to your journey
            </Link>
          </span>
        </AdminNotice>
      </AdminDesk>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AdminDesk>
        <AdminNotice heading="The database is not connected yet.">
          You are signed in as an admin, but there is nothing to read: progress
          still lives in each joinee&apos;s own browser. Rows appear here once
          Supabase is configured.
        </AdminNotice>
      </AdminDesk>
    );
  }

  const rows = await adminOverview();
  return (
    <AdminDesk>
      <AdminTable rows={rows ?? []} />
    </AdminDesk>
  );
}
