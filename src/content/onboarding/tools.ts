import type { Tool } from "./types";
export const TOOLS: readonly Tool[] = [

  {
    key: "tools.freshchat",
    name: "Freshchat",
    purpose: "Inbound customer chat.",
  },
  {
    key: "tools.retool_wt",
    name: "Walkie Talkie (WT)",
    purpose: "Calling guests. It is a phone, not a dashboard.",
    grantedBy: "Devesh",
  },
  {
    key: "tools.cadence",
    name: "Cadence",
    purpose:
      "The dashboard: guest history, AI overview, document status, journey status. Also where every interaction and lead status is logged.",
  },
  {
    key: "tools.notion",
    name: "Notion",
    purpose: "Glossary, process docs, this journey's source doc.",
  },
];
