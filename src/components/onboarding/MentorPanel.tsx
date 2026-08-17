"use client";

import { useEffect, useRef, useState } from "react";
import { MENTORS_BY_DAY, type Mentor } from "@/content/onboarding/mentors";
import type { DayId } from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

// Inlined at build time by Next; absent until Shovan answers §7.
const SLACK_TEAM_ID = process.env.NEXT_PUBLIC_SLACK_TEAM_ID;

/**
 * Who to follow on a given day, with a Slack DM deep link once the member ID
 * exists. Missing IDs render as a visibly disabled button - a gap should look
 * like a gap, not like a broken link.
 */
export function MentorPanel({ dayId }: { dayId: DayId }) {
  const mentors = MENTORS_BY_DAY[dayId];
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  function copyId(mentor: Mentor) {
    if (!mentor.slackMemberId) return;
    const id = mentor.slackMemberId;
    void navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopiedId(id);
        setAnnouncement(`Slack member ID copied for ${mentor.name}.`);
        window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        setAnnouncement(`Could not copy. The ID is ${id}.`);
      });
  }

  return (
    <Card className="animate-rise-in bg-white/[0.02] p-6 sm:p-7">
      <div className="border-b border-hairline pb-3">
        <Eyebrow className="text-ink-dim">Who to follow today</Eyebrow>
      </div>

      {/* Perforated rules between entries, like fields on a printed manifest. */}
      <ul className="mt-2 divide-y divide-dashed divide-hairline-lit">
        {mentors.map((mentor) => {
          // A member id alone is enough: `app_redirect` opens the DM in
          // whichever workspace the person is signed into, so the button works
          // before NEXT_PUBLIC_SLACK_TEAM_ID exists. With the team id set we
          // prefer the `slack://` scheme, which opens the desktop app directly
          // instead of bouncing through the browser.
          const dmHref = !mentor.slackMemberId
            ? null
            : SLACK_TEAM_ID
              ? `slack://user?team=${SLACK_TEAM_ID}&id=${mentor.slackMemberId}`
              : `https://slack.com/app_redirect?channel=${mentor.slackMemberId}`;

          return (
            <li
              key={mentor.name}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{mentor.name}</p>
                  {mentor.pending && (
                    <Badge tone="amber">Name pending · §7</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-secondary">{mentor.owns}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {dmHref && mentor.slackMemberId ? (
                  <>
                    {/* Button renders a <button>; a deep link needs an <a>,
                        so this mirrors the secondary/sm pill classes. */}
                    <a
                      href={dmHref}
                      className={cn(
                        "inline-flex h-8 items-center justify-center gap-2 rounded-full border px-4",
                        "font-sans text-[12.5px] font-medium tracking-[0.01em]",
                        "border-hairline-lit text-ink hover:border-ink-dim hover:bg-white/[0.04]",
                        "transition-[transform,background-color,border-color] duration-150 ease-out",
                        "motion-reduce:transition-none active:translate-y-[1px]",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text",
                      )}
                    >
                      Slack DM
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyId(mentor)}
                    >
                      {copiedId === mentor.slackMemberId ? "Copied" : "Copy ID"}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    disabled
                    title="Slack member ID arrives with §7 of the content request"
                  >
                    Slack DM, ID pending
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-dashed border-ink/25 pt-4 text-xs text-ink-muted">
        Every ID here was copied from a real profile. Nothing is guessed. Where we
        do not have one, the button stays disabled.
      </p>

      {/* Copy feedback for screen readers; sighted users see the button flip. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </Card>
  );
}
