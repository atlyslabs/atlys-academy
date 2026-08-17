"use client";

import { TOOLS } from "@/content/onboarding/tools";
import { Checklist } from "./Checklist";

/**
 * Day 1 tool access. Tick these off as someone grants you each account - the
 * app does not connect to any of them (PRD §4, non-goals).
 */
export function ToolsChecklist() {
  return (
    <Checklist
      ariaLabel="Tool access checklist"
      items={TOOLS.map((tool) => ({
        key: tool.key,
        label: tool.name,
        // Where we know who grants an account, it goes on the line with the
        // request. Chasing access is the whole point of this checklist.
        detail: tool.grantedBy
          ? `${tool.purpose} Access from ${tool.grantedBy}.`
          : tool.purpose,
      }))}
    />
  );
}
