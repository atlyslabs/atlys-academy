import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { ALLOWED_EMAIL_DOMAIN, isAuthConfigured } from "@/lib/auth/config";

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

/**
 * Sign-in: the cold open's lockup box made permanent, with the light beam
 * walking its frame and the Google button inside. Every auth decision here -
 * the not-configured escape hatch, the already-signed-in redirect, the domain
 * restriction and the open-redirect guard - is unchanged from before the
 * redesign.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const destination = safeDestination(next);

  // Nothing to sign in to yet - don't strand anyone behind a dead button.
  if (!isAuthConfigured) {
    return (
      <Shell>
        <p>
          Google sign-in is not switched on yet. This deployment has no client
          credentials. Every day is open without signing in.
        </p>
        <Link
          href="/onboarding"
          className="group mt-8 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-hairline-lit px-6 text-[15px] font-medium text-ink transition-colors hover:border-ink-dim"
        >
          Go to the journey
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            &rarr;
          </span>
        </Link>
      </Shell>
    );
  }

  // Already signed in: skip the page entirely.
  if (await auth()) redirect(destination);

  return (
    <Shell>
      <p>
        Use your{" "}
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

      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: destination });
        }}
      >
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-ink text-[15px] font-medium text-page transition-[background-color,transform] duration-200 hover:bg-ink-muted active:scale-[0.98]"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </form>
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
