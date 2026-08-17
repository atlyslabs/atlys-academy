import type { Tool } from "./types";

/**
 * Day 1 access checklist. These are accounts someone grants you - the checkbox
 * records that you have access, it does not connect to the tool.
 *
 * List is from the source doc ("Shovan Tools day 1"). The `purpose` line is
 * added for the joinee's benefit and is not in the source doc.
 */
export const TOOLS: readonly Tool[] = [
  {
    key: "tools.grafana",
    name: "Grafana",
    purpose: "Dashboards: pipeline and funnel numbers.",
  },
  {
    key: "tools.freshchat",
    name: "Freshchat",
    purpose: "Inbound customer chat.",
  },
  {
    key: "tools.retool_wt",
    name: "Retool (WT, Walkie Talkie)",
    purpose:
      "Internal tooling: look up an application's real state. Day 4 runs on it.",
    grantedBy: "Devesh",
  },
  {
    key: "tools.notion",
    name: "Notion",
    purpose: "Glossary, process docs, this journey's source doc.",
  },
  {
    key: "tools.exotel",
    name: "Exotel",
    purpose: "Inbound and outbound calls, call recordings.",
  },
  {
    key: "tools.whatsapp_groups",
    name: "WhatsApp groups",
    purpose: "Where Ops, Product and Sales actually talk.",
  },
];
