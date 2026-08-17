import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">There is nothing at this address.</h1>
      <p className="mt-2">The link may be out of date. Your progress is untouched.</p>
      <p className="mt-6">
        <Link href="/onboarding">Back to the journey</Link>
      </p>
    </main>
  );
}
