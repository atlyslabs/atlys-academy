"use client";

import Link from "next/link";

/** Root error boundary. Bare while the app is redesigned. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">That page didn&apos;t load.</h1>
      <p className="mt-2">
        Your checklists and quiz results are stored separately and are fine.
      </p>

      {error.digest && <p className="mt-2">Reference: {error.digest}</p>}

      <p className="mt-6">
        <button type="button" onClick={reset}>
          Try again
        </button>
        {" · "}
        <Link href="/onboarding">Back to the journey</Link>
      </p>
    </main>
  );
}
