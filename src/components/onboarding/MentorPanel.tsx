"use client";

import { useEffect, useRef, useState } from "react";
import { MENTORS_BY_DAY, type Mentor } from "@/content/onboarding/mentors";
import type { DayId } from "@/content/onboarding/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

// Inlined at build time by Next. Optional: without it the DM button falls
// back to slack.com/app_redirect, which works fine.
const SLACK_TEAM_ID = process.env.NEXT_PUBLIC_SLACK_TEAM_ID;

/**
 * Who to follow on a given day, with a Slack DM deep link where there is a
 * member ID to link to.
 *
 * An entry without one renders no button at all. That is a reversal: the panel
 * used to show a disabled "ID pending" pill, on the reasoning that a gap should
 * look like a gap. It was right while the list was a directory of people whose
 * IDs were still being collected, and wrong now that the only entry without one
 * is the joinee's own team leader - who is not a pending lookup but a person
 * they already know, and for whom a permanently greyed-out button reads as
 * something broken.
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
                {/* The amber "Name pending · §7" badge that used to sit beside
                    the name is gone with the entries that carried it - every
                    name on the panel is now a real one. */}
                <p className="font-medium text-ink">{mentor.name}</p>
                <p className="mt-1 text-sm text-ink-secondary">{mentor.owns}</p>
              </div>

              {/* No ID, no button. There used to be a disabled "ID pending"
                  pill here, which made sense while the panel was a directory
                  waiting on member IDs. The only entry without an ID now is the
                  joinee's own team leader - a different person for each of
                  them, and one they already know - so a greyed-out button would
                  be promising a link that is never coming. */}
              {dmHref && mentor.slackMemberId && (
                <div className="flex shrink-0 items-center gap-2">
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
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-dashed border-ink/25 pt-4 text-xs text-ink-muted">
        Every ID here was copied from a real profile. Nothing is guessed. Your
        team leader has no button because they are your own - message them
        wherever you already do.
      </p>

      {/* Copy feedback for screen readers; sighted users see the button flip. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </Card>
  );
}
