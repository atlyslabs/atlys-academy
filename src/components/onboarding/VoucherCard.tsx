"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useProgress } from "@/lib/progress/provider";
import { hasEarnedVoucher, voucherBlockers } from "@/lib/progress/voucher";
import { cn } from "@/lib/utils";

/**
 * The end-of-academy voucher.
 *
 * The code is NOT computed here and is not in any bundle: it is derived on the
 * server from `profiles.id`, a UUID that never leaves it, and this component
 * only ever displays what `GET /api/onboarding/voucher` hands back. That
 * endpoint re-checks the earning conditions against stored progress, so the
 * local check below is a rendering decision, not the authority - editing
 * localStorage into a finished state still returns nothing.
 *
 * Three states worth having, rather than just "show" and "hide":
 *
 * - **not finished** - list what is outstanding, so the card is a target rather
 *   than a locked box.
 * - **finished, no sync** - a local-only session has no server identity to
 *   derive a code from, so say that instead of silently showing nothing.
 * - **finished** - the code, and one button that copies it.
 */

/**
 * `idle` means "not answered yet". There is deliberately no `loading` member:
 * setting one synchronously inside the effect trips
 * `react-hooks/set-state-in-effect`, and it would carry no information anyway -
 * "we have asked and are waiting" is exactly `idle` while the card is earned
 * locally, which the render derives instead.
 */
type VoucherState =
  | { kind: "idle" }
  | { kind: "earned"; code: string }
  | { kind: "unavailable" };

export function VoucherCard({ className }: { className?: string }) {
  const { state, ready } = useProgress();
  const earnedLocally = hasEarnedVoucher(state);
  const [voucher, setVoucher] = useState<VoucherState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  useEffect(() => {
    // Only ask once the local state says it is worth asking. Polling an
    // endpoint that will say "not yet" for three days is noise, and the
    // endpoint is the authority either way.
    if (!ready || !earnedLocally) return;
    let cancelled = false;
    void fetch("/api/onboarding/voucher", { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          // 503 is the honest "no database or not signed in" answer.
          setVoucher({ kind: "unavailable" });
          return;
        }
        const payload = (await response.json()) as
          | { earned: true; code: string }
          | { earned: false; blockers: string[] };
        if (cancelled) return;
        setVoucher(
          payload.earned
            ? { kind: "earned", code: payload.code }
            : { kind: "unavailable" },
        );
      })
      .catch(() => {
        if (!cancelled) setVoucher({ kind: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [ready, earnedLocally]);

  function copy(code: string) {
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setAnnouncement(`Voucher code ${code} copied.`);
        window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setAnnouncement(`Could not copy. The code is ${code}.`);
      });
  }

  // Nothing at all until the store has been read, so the card cannot flash
  // "still to do" at somebody who finished weeks ago.
  if (!ready) return null;

  const blockers = earnedLocally ? [] : voucherBlockers(state);

  return (
    <section
      className={cn(
        "animate-rise-in rounded-2xl border p-6 sm:p-7",
        voucher.kind === "earned"
          ? "border-brand/30 bg-ticket-soft/50"
          : "border-hairline bg-white/[0.02]",
        className,
      )}
    >
      <div className="border-b border-hairline pb-3">
        <Eyebrow className={voucher.kind === "earned" ? "text-brand-text" : "text-ink-dim"}>
          {voucher.kind === "earned" ? "Your voucher" : "Your voucher, once the day is done"}
        </Eyebrow>
      </div>

      {voucher.kind === "earned" ? (
        <>
          <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-ink-secondary">
            Three days, done. Take this code to your team leader - they redeem
            it with you.
          </p>

          {/* The code is set in the condensed face at a size that survives
              being read aloud across a desk, which is how it will be used. */}
          <p className="mt-5 select-all break-all font-condensed text-[30px] leading-none tracking-[0.06em] text-ink sm:text-[36px]">
            {voucher.code}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => copy(voucher.code)}>
              {copied ? "Copied" : "Copy code"}
            </Button>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
              Redeem with your team leader
            </p>
          </div>
        </>
      ) : earnedLocally && voucher.kind === "idle" ? (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Checking…
        </p>
      ) : voucher.kind === "unavailable" ? (
        <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-ink-secondary">
          Your work is done, but the code is issued against your signed-in
          account and this session is running on browser-local progress only.
          Sign in on this device and it will appear here.
        </p>
      ) : (
        <>
          <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-ink-secondary">
            Finish the final day and a voucher is issued to you here, to redeem
            with your team leader. Still outstanding:
          </p>
          <ul className="mt-3 space-y-1.5">
            {blockers.map((blocker) => (
              <li
                key={blocker}
                className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-muted"
              >
                <span
                  aria-hidden="true"
                  className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ink-dim"
                />
                {blocker}
              </li>
            ))}
          </ul>
        </>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
