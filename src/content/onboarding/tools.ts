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
    name: "Walkie Talkie (WT)",
    purpose: "Calling guests. It is a phone, not a dashboard.",
    grantedBy: "Devesh",
  },
  // Cadence and Freshdesk come from the Pre Sales Mastery Playbook, not the
  // original source doc, which predates both. Cadence is the tool Day 4 is
  // actually built on, so a Day 1 list without it sends joinees into Day 4
  // unable to do the work. Neither has a named granter yet.
  {
    key: "tools.cadence",
    name: "Cadence",
    purpose:
      "The dashboard: guest history, AI overview, document status, journey status. Also where every interaction and lead status is logged.",
  },
  {
    key: "tools.freshdesk",
    name: "Freshdesk",
    purpose: "Inbound tickets: email and chat inquiries that need resolving.",
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
