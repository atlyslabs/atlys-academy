import { cookies } from "next/headers";
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
 * Placeholder roster of team leaders. Swap for the real list (or a fetch)
 * once the org chart is wired up - the values are what we persist.
 */
const TEAM_LEADERS = [
  "placeholder_1",
  "placeholder_2",
  "placeholder_3",
  "placeholder_4",
  "placeholder_5",
  "placeholder_6",
] as const;

/** How long the joinee's answers ride along in cookies (one year). */
const PROFILE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Stash the name + team leader before we hand off to Google. OAuth bounces the
 * browser to Google and back, so anything typed here has to survive a full
 * round-trip - cookies do, component state does not.
 */
async function persistProfile(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  const teamLeader = (formData.get("teamLeader") ?? "").toString().trim();

  const store = await cookies();
  const opts = {
    path: "/",
    maxAge: PROFILE_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
  };
  if (name) store.set("onboarding.name", name, opts);
  if (teamLeader) store.set("onboarding.teamLeader", teamLeader, opts);
}

/**
 * Sign-in: the cold open's lockup box made permanent, with the light beam
 * walking its frame. The joinee names themselves and picks their team leader,
 * then continues through Google below. Every auth decision here - the
 * not-configured escape hatch, the already-signed-in redirect, the domain
 * restriction and the open-redirect guard - is unchanged from before.
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
  const savedLeader = store.get("onboarding.teamLeader")?.value ?? "";

  // Nothing to sign in to yet - don't strand anyone behind a dead button.
  if (!isAuthConfigured) {
    return (
      <Shell>
        <p>
          Google sign-in is not switched on yet, but tell us who you are and
          we&rsquo;ll carry it into the journey.
        </p>

        <form
          className="mt-8"
          action={async (formData: FormData) => {
            "use server";
            await persistProfile(formData);
            redirect("/onboarding");
          }}
        >
          <ProfileFields name={savedName} teamLeader={savedLeader} />
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
        </form>
      </Shell>
    );
  }

  // Already signed in: skip the page entirely.
  if (await auth()) redirect(destination);

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

      <form
        className="mt-8"
        action={async (formData: FormData) => {
          "use server";
          await persistProfile(formData);
          await signIn("google", { redirectTo: destination });
        }}
      >
        <ProfileFields name={savedName} teamLeader={savedLeader} />

        <button
          type="submit"
          className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-ink text-[15px] font-medium text-page transition-[background-color,transform] duration-200 hover:bg-ink-muted active:scale-[0.98]"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </form>
    </Shell>
  );
}

/**
 * The two identity fields shared by both branches: a name and the team-leader
 * dropdown. `required` keeps the browser from submitting an empty pass, so the
 * cookies we set are never blank.
 */
function ProfileFields({
  name,
  teamLeader,
}: {
  name: string;
  teamLeader: string;
}) {
  return (
    <div className="space-y-4 text-left">
      <div>
        <label
          htmlFor="name"
          className="mb-1.5 block text-[13px] font-medium text-ink-muted"
        >
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          defaultValue={name}
          placeholder="e.g. Sana Kapoor"
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label
          htmlFor="teamLeader"
          className="mb-1.5 block text-[13px] font-medium text-ink-muted"
        >
          Team leader
        </label>
        <div className="relative">
          <select
            id="teamLeader"
            name="teamLeader"
            required
            defaultValue={teamLeader}
            className={`${FIELD_CLASS} appearance-none pr-11 ${
              teamLeader ? "" : "text-ink-dim"
            }`}
          >
            <option value="" disabled style={OPTION_PLACEHOLDER_STYLE}>
              Select your team leader
            </option>
            {TEAM_LEADERS.map((leader) => (
              <option key={leader} value={leader} style={OPTION_STYLE}>
                {leader}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-dim"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 4.5L6 8l3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Shared field chrome so the input and select read as one control set. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-hairline-lit bg-white/[0.02] px-4 text-[15px] text-ink placeholder:text-ink-dim outline-none transition-colors focus:border-ink-dim";

/**
 * The native <select> popup is drawn by the OS with a light background, so the
 * dark theme's near-white ink token would render white-on-white and vanish
 * until hovered. Pin the option colours to fixed dark-on-light values instead.
 */
const OPTION_STYLE = { color: "#18181b", background: "#ffffff" } as const;
const OPTION_PLACEHOLDER_STYLE = {
  color: "#71717a",
  background: "#ffffff",
} as const;

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
