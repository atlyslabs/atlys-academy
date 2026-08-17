"use client";

import { lessonsForDay, type Lesson } from "@/content/onboarding/lessons";
import type { DayId } from "@/content/onboarding/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { POINT_WEIGHTS } from "@/lib/progress/points";
import { useProgress } from "@/lib/progress/provider";

/**
 * The day's teaching content, one `<details>` page per lesson.
 *
 * Lessons whose body is still with Shovan render an honest placeholder and no
 * "mark as read" button. There are no points for reading nothing, and a fake
 * lesson taught here gets repeated to a paying guest.
 *
 * This is the one screen in the app somebody actually *reads*, several
 * paragraphs at a time, so it does not inherit the 12px mono the rest of the
 * ticket chrome is set in. Body copy runs at 16px on a capped measure; the
 * printed-field styling stays on the labels around it.
 */
export function LessonSection({ dayId }: { dayId: DayId }) {
  const lessons = lessonsForDay(dayId);
  if (lessons.length === 0) return null;

  return (
    <section className="rounded-2xl border border-hairline bg-white/[0.02] p-6 sm:p-7">
      <div className="border-b border-hairline pb-4">
        <Eyebrow className="text-ink-dim">Learn it properly</Eyebrow>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-ink-muted">
          Open a page, read it to the end, then mark it. Each one earns{" "}
          {POINT_WEIGHTS.lessonRead} points.
        </p>
      </div>

      <ul className="mt-5 space-y-3">
        {lessons.map((lesson, index) => (
          <LessonCard
            key={lesson.itemKey}
            lesson={lesson}
            page={index + 1}
            total={lessons.length}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * One page of the reading.
 *
 * The fold itself is CSS: `details::details-content` in globals.css transitions
 * its height, so opening and closing are the same motion run in either
 * direction and no JavaScript measures anything.
 */
function LessonCard({
  lesson,
  page,
  total,
}: {
  lesson: Lesson;
  page: number;
  total: number;
}) {
  const { state, toggleItem } = useProgress();
  const read = lesson.itemKey in state.completedItems;

  return (
    <li>
      <details className="group rounded-xl border border-hairline bg-white/[0.015] transition-colors open:bg-white/[0.03] hover:border-hairline-lit">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:hidden">
          {/* Page number, printed like the stub fields on the boarding pass. */}
          <span
            aria-hidden="true"
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted tabular-nums"
          >
            {String(page).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </span>

          <span
            aria-hidden="true"
            className="grid size-5 shrink-0 place-items-center text-ink-muted transition-transform duration-300 ease-out group-open:rotate-90"
          >
            <svg
              viewBox="0 0 12 12"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.5 2.5 8 6l-3.5 3.5" />
            </svg>
          </span>

          <span className="min-w-0 flex-1 font-display text-[17px] italic leading-snug text-ink">
            {lesson.title}
          </span>

          {read && <Badge tone="green">Read</Badge>}
        </summary>

        {/* Perforation, not a container edge: the body is a torn-off stub of the
            same document rather than a nested card. */}
        <div className="border-t border-dashed border-hairline-lit p-4 pt-4 sm:px-5">
          {lesson.body === null ? (
            <div className="max-w-[68ch] rounded-lg border border-dashed border-hairline-lit p-4 text-[15px] leading-relaxed text-ink-dim">
              <p>
                Being written. This page arrives with {lesson.ref} of the
                content request to Shovan. Nothing shown here is invented in the
                meantime.
              </p>

              {/* A gap with a name against it is a gap someone can close. */}
              {lesson.pendingWith && (
                <div className="mt-3 border-t border-dashed border-hairline-lit pt-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em]">
                    Who to ask
                  </p>
                  <p className="mt-1">{lesson.pendingWith}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 68ch is the measure the paragraphs are set to. The window is
                  76rem wide for the drills, and prose run edge to edge at that
                  width loses the reader a line at every wrap. */}
              <div className="max-w-[68ch] space-y-4 text-[15px] leading-[1.75] text-ink-secondary sm:text-base">
                {lesson.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {lesson.example && (
                <div className="mt-5 max-w-[68ch] border-l-2 border-brand-text/40 pl-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text">
                    In practice
                  </p>
                  <p className="mt-1.5 text-[15px] leading-[1.7] text-ink-secondary">
                    {lesson.example}
                  </p>
                </div>
              )}

              {lesson.commonMistake && (
                <div className="mt-5 max-w-[68ch] rounded-lg border border-badge-coral/30 bg-badge-coral-soft/60 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-badge-coral">
                    What new joiners get wrong
                  </p>
                  <p className="mt-1.5 text-[15px] leading-[1.7] text-ink-secondary">
                    {lesson.commonMistake}
                  </p>
                </div>
              )}

              {/* aria-live so the swap between the two buttons is announced. */}
              <div aria-live="polite" className="mt-6">
                {read ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleItem(lesson.itemKey, false)}
                  >
                    Read ✓
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => toggleItem(lesson.itemKey, true)}
                  >
                    Mark as read (+{POINT_WEIGHTS.lessonRead} pts)
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </details>
    </li>
  );
}
