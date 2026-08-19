"use client";

import { useState } from "react";
import type { TeamLeader } from "@/content/onboarding/team-leaders";

/**
 * The two ways someone arrives at onboarding. Presales associates report to a
 * team leader; admins do not - so the team-leader field is asked of presales
 * only, and the role picker below decides which one renders.
 */
const ROLES = [
  { value: "presales", label: "Presales Associate" },
  { value: "admin", label: "Admin" },
] as const;

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
 * The identity form shared by both sign-in branches. It owns just enough client
 * state to switch the team-leader field on and off by role; the submit control
 * (Google button or journey link) is passed in as `children`, and the actual
 * sign-in/redirect happens in the server `action`.
 */
export function SignInForm({
  action,
  savedName,
  savedRole,
  savedLeader,
  teamLeaders,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  savedName: string;
  savedRole: string;
  savedLeader: string;
  /** The live roster, read on the server so admin additions appear here. */
  teamLeaders: readonly TeamLeader[];
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<string>(savedRole || "presales");
  const [leader, setLeader] = useState<string>(savedLeader);

  return (
    <form className="mt-8" action={action}>
      <div className="space-y-4 text-left">
        {/* Role picker - decides whether we ask for a team leader at all. */}
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-muted">
            Role
          </span>
          <div
            role="radiogroup"
            aria-label="Role"
            className="grid grid-cols-2 gap-1 rounded-xl border border-hairline-lit p-1"
          >
            {ROLES.map((option) => {
              const active = role === option.value;
              return (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={active}
                    onChange={() => setRole(option.value)}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex h-10 items-center justify-center rounded-lg text-[14px] font-medium transition-colors peer-focus-visible:ring-1 peer-focus-visible:ring-ink-dim ${
                      active
                        ? "bg-ink text-page"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Name - always required. */}
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
            defaultValue={savedName}
            placeholder="e.g. Sana Kapoor"
            className={FIELD_CLASS}
          />
        </div>

        {/* Team leader - presales only. Unmounted for admins so its `required`
            never blocks their submit and no stale value is ever sent. */}
        {role === "presales" && (
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
                value={leader}
                onChange={(event) => setLeader(event.target.value)}
                className={`${FIELD_CLASS} appearance-none pr-11 ${
                  leader ? "" : "text-ink-dim"
                }`}
              >
                <option value="" disabled style={OPTION_PLACEHOLDER_STYLE}>
                  Select your team leader
                </option>
                {teamLeaders.map((teamLeader) => (
                  <option
                    key={teamLeader.id}
                    value={teamLeader.id}
                    style={OPTION_STYLE}
                  >
                    {teamLeader.name}
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
        )}
      </div>

      {children}
    </form>
  );
}
