"use client";

import { DAYS } from "@/content/onboarding/days";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { JoineeAvatar } from "@/components/ui/JoineeAvatar";
import { api } from "@/lib/api-client";
import type { AvatarConfig } from "@/lib/progress/types";
import { cn } from "@/lib/utils";

interface LeaderboardRow {
  name: string;
  /** Null until the joinee picks one - JoineeAvatar renders its default. */
  avatar: AvatarConfig | null;
  points: number;
  daysCompleted: number;
  isYou: boolean;
}

interface LeaderboardData {
  cohortDate: string;
  rows: LeaderboardRow[];
}

type Status = "loading" | "ready" | "unavailable";

/**
 * Cohort leaderboard, fetched on mount.
 *
 * The API answers 503 until Google auth and Supabase are both configured, so
 * every non-200 collapses into one honest "not switched on yet" state rather
 * than a scary error - local points still work either way.
 */
export function LeaderboardPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [board, setBoard] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await api.api.onboarding.leaderboard.$get();
        if (!response.ok) throw new Error(`Leaderboard unavailable (${response.status})`);
        const data = (await response.json()) as LeaderboardData;
        if (cancelled) return;
        setBoard(data);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="animate-rise-in">
      <header>
        <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand-text">
          <span aria-hidden="true" className="h-px w-6 bg-brand-text/50" />
          {status === "ready" && board
            ? `Your cohort, started ${formatCohortDate(board.cohortDate)}`
            : "The standings"}
        </p>
        <h1 className="mt-3 font-display text-[40px] italic leading-tight tracking-[-0.01em] sm:text-[48px]">
          Cohort leaderboard
        </h1>
      </header>

      {/* Live region so the swap from skeleton to rows is announced. */}
      <div aria-live="polite" aria-busy={status === "loading"} className="mt-6">
        {status === "loading" && <SkeletonRows />}
        {status === "unavailable" && (
          <Card tone="soft" className="p-6">
            <p className="max-w-xl text-sm text-ink-secondary">
              The leaderboard switches on when sign-in and the database are
              connected. Your points already count. See the tally in the
              corner.
            </p>
          </Card>
        )}
        {status === "ready" && board && <Board board={board} />}
      </div>
    </section>
  );
}

function Board({ board }: { board: LeaderboardData }) {
  return (
    <>
      <ol className="space-y-3">
        {board.rows.map((row, index) => (
          <li
            key={`${index}-${row.name}`}
            className={cn(
              "flex items-center gap-4 rounded-xl border border-hairline bg-white/[0.02] px-5 py-4",
              // Your own row is picked out with the brand wash.
              row.isYou && "border-brand-text/50 bg-brand/10",
            )}
          >
            <span className="w-8 shrink-0 font-mono text-sm text-ink-muted">
              {index + 1}
            </span>

            <JoineeAvatar config={row.avatar} size={32} className="shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{row.name}</span>
                {index < 3 && (
                  <span aria-hidden="true" className="text-accent">
                    {"✦".repeat(3 - index)}
                  </span>
                )}
                {row.isYou && (
                  <Badge className="border-accent/40 bg-accent-soft text-accent">
                    You
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">
                {row.daysCompleted}/{DAYS.length} days
              </p>
            </div>

            <p className="shrink-0 text-right">
              <span className="text-lg font-semibold tabular-nums">
                {row.points}
              </span>{" "}
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                pts
              </span>
            </p>
          </li>
        ))}
      </ol>

      {board.rows.length === 1 && (
        <p className="mt-4 text-sm text-ink-muted">
          You are the only one in this cohort so far. The board fills as
          people join.
        </p>
      )}
    </>
  );
}

function SkeletonRows() {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">Loading the leaderboard…</span>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          aria-hidden="true"
          className="h-[76px] animate-pulse rounded-xl border border-hairline bg-white/[0.02]"
        />
      ))}
    </div>
  );
}

/** Runs only after the client fetch, so a fixed locale cannot mismatch SSR. */
function formatCohortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
