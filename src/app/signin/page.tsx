import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import {
  ALLOWED_EMAIL_DOMAIN,
  isAdminEmail,
  isAuthConfigured,
} from "@/lib/auth/config";
import { teamLeaderRoster } from "@/server/onboarding/store";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = {
  title: "Sign in · Atlys Academy",
};

/** Auth.js error codes we want to explain in the joinee's own terms. */
const ERROR_COPY: Record<string, string> = {
  AccessDenied: `That account is not on the ${ALLOWED_EMAIL_DOMAIN} domain. Sign in with your Atlys work account. A personal Gmail will not get you in.`,
  Configuration:
    "Google sign-in is not configured correctly on this deployment. This one is for whoever set up the environment variables, not for you.",
  Verification: "That sign-in link has expired. Try again.",
};

/** How long the joinee's answers ride along in cookies (one year). */
const PROFILE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Stash the name, role and (for presales) team leader before we hand off to
 * Google. OAuth bounces the browser to Google and back, so anything typed here
 * has to survive a full round-trip - cookies do, component state does not.
 *
 * Admins have no team leader, so we only persist one for presales and clear any
 * value a previous presales attempt left behind.
 */
async function persistProfile(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  const role = (formData.get("role") ?? "").toString().trim();
  const teamLeader = (formData.get("teamLeader") ?? "").toString().trim();

  const store = await cookies();
  const opts = {
    path: "/",
    maxAge: PROFILE_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
  };
  if (name) store.set("onboarding.name", name, opts);
  if (role) store.set("onboarding.role", role, opts);

  if (role === "presales" && teamLeader) {
    store.set("onboarding.teamLeader", teamLeader, opts);
  } else {
    store.delete("onboarding.teamLeader");
  }
}

/**
 * Sign-in: the cold open's lockup box made permanent, with the light beam
 * walking its frame. The joinee picks a role, names themselves, and - if they
 * are a presales associate - their team leader, then continues through Google
 * below. Admins skip the team-leader question and, once signed in, land on the
 * admin desk instead of the journey. The domain restriction and the
 * open-redirect guard are unchanged.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const destination = safeDestination(next);

  // Read anything a previous attempt saved so the fields aren't blank on retry.
  const store = await cookies();
  const savedName = store.get("onboarding.name")?.value ?? "";
  const savedRole = store.get("onboarding.role")?.value ?? "";
  const savedLeader = store.get("onboarding.teamLeader")?.value ?? "";

  // The live roster: whatever an admin has added on the desk, with the
  // built-in list as the fallback. Read here rather than imported so a leader
  // added a minute ago is already an option.
  const teamLeaders = await teamLeaderRoster();

  // Nothing to sign in to yet - don't strand anyone behind a dead button.
  if (!isAuthConfigured) {
    return (
      <Shell>
        <p>
          Google sign-in is not switched on yet, but tell us who you are and
          we&rsquo;ll carry it into the journey.
        </p>

        <SignInForm
          action={async (formData: FormData) => {
            "use server";
            await persistProfile(formData);
            const role = (formData.get("role") ?? "").toString().trim();
            redirect(landingFor(role, "/onboarding"));
          }}
          savedName={savedName}
          savedRole={savedRole}
          savedLeader={savedLeader}
          teamLeaders={teamLeaders}
        >
          <button
            type="submit"
            className="group mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-hairline-lit px-6 text-[15px] font-medium text-ink transition-colors hover:border-ink-dim"
          >
            Go to the journey
            <span
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              &rarr;
            </span>
          </button>
        </SignInForm>
      </Shell>
    );
  }

  // Already signed in: skip the page entirely. A returning admin goes to the
  // desk where they actually work; everyone else to their destination.
  const existing = await auth();
  if (existing) {
    redirect(isAdminEmail(existing.user?.email) ? "/admin" : destination);
  }

  return (
    <Shell>
      <p>
        Tell us who you are, then continue with your{" "}
        <strong className="font-medium text-ink">
          @{ALLOWED_EMAIL_DOMAIN}
        </strong>{" "}
        Google account. Access is limited to that domain.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-error/40 bg-error/5 p-3.5 text-[13px] leading-relaxed text-error"
        >
          {ERROR_COPY[error] ?? "Sign-in failed. Try again."}
        </p>
      )}

      <SignInForm
        action={async (formData: FormData) => {
          "use server";
          await persistProfile(formData);
          const role = (formData.get("role") ?? "").toString().trim();
          await signIn("google", { redirectTo: landingFor(role, destination) });
        }}
        savedName={savedName}
        savedRole={savedRole}
        savedLeader={savedLeader}
        teamLeaders={teamLeaders}
      >
        <button
          type="submit"
          className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-ink text-[15px] font-medium text-page transition-[background-color,transform] duration-200 hover:bg-ink-muted active:scale-[0.98]"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </SignInForm>
    </Shell>
  );
}

/**
 * Only ever redirect to a path inside this app. Without this, `?next=` is an
 * open redirect: an attacker mails a link that sends people to their own site
 * after a genuine Atlys sign-in.
 */
function safeDestination(next: string | undefined): string {
  if (!next) return "/onboarding";
  if (!next.startsWith("/") || next.startsWith("//")) return "/onboarding";
  return next;
}

/**
 * Where a just-identified joinee lands. Admins go straight to the desk;
 * everyone else to the journey (or the deep-link they were headed for). The
 * role is self-declared, so `/admin` still gates on the real admin allowlist -
 * a mis-picked "Admin" simply bounces off it back to the journey.
 */
function landingFor(role: string, fallback: string): string {
  return role === "admin" ? "/admin" : fallback;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-page px-6 text-ink">
      <div className="night-wash" />
      <div className="night-vignette" />
      <div className="grain" />

      <div className="stage-card relative w-[min(460px,92vw)] px-9 py-11 md:px-11">
        <svg className="beam" aria-hidden="true">
          <rect
            className="beam-hairline beam-hairline--draw"
            x="0"
            y="0"
            width="100%"
            height="100%"
            pathLength={100}
          />
          <rect
            className="beam-glow"
            x="0"
            y="0"
            width="100%"
            height="100%"
            pathLength={100}
            style={beamVars}
          />
          <rect
            className="beam-core"
            x="0"
            y="0"
            width="100%"
            height="100%"
            pathLength={100}
            style={beamVars}
          />
        </svg>

        <h1 className="lockup" style={{ "--lockup-size": "27px" } as React.CSSProperties}>
          <span className="lockup__line" style={{ "--d": "120ms" } as React.CSSProperties}>
            The
          </span>
          <span
            className="lockup__line lockup__line--serif"
            style={{ "--d": "240ms" } as React.CSSProperties}
          >
            atlys
          </span>
          <span className="lockup__line" style={{ "--d": "360ms" } as React.CSSProperties}>
            Academy
          </span>
        </h1>

        <div className="mt-7 text-sm leading-relaxed text-ink-muted">
          {children}
        </div>
      </div>
    </main>
  );
}

const beamVars = {
  "--beam-dur": "6.5s",
  "--beam-delay": "950ms",
  "--beam-len": "10",
  "--beam-gap": "90",
} as React.CSSProperties;

/** The standard multi-colour Google "G", as used on sign-in buttons. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
