import { RoomShell } from "@/components/onboarding/journey/RoomShell";
import { PassportPages } from "@/components/onboarding/StampSheet";

export const metadata = {
  title: "Your passport · Atlys Academy",
};

/**
 * The stamp pages: one cream plate per day, every earned souvenir on it.
 * `PassportPages` reads real stamp progress, so what is printed here is
 * verifiable end to end.
 */
export default function PassportPage() {
  return (
    <RoomShell room="passport">
      <header className="mb-8">
        <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand-text">
          <span aria-hidden="true" className="h-px w-6 bg-brand-text/50" />
          Souvenirs of the journey
        </p>
        <h1 className="mt-3 font-display text-[40px] italic leading-tight tracking-[-0.01em] sm:text-[48px]">
          Your passport
        </h1>
        <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-muted">
          Every stamp is earned, never given - finish the thing and the page
          remembers it. Fill a day&apos;s page and its gate is ready to open.
        </p>
      </header>

      <PassportPages />
    </RoomShell>
  );
}
