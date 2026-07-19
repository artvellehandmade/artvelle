// Interested-customer (lead) pipeline — shared status config.
export const LEAD_STATUSES = [
  "interested",
  "contacted",
  "ordered",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  interested: "Interested",
  contacted: "Contacted",
  ordered: "Ordered",
  lost: "Lost",
};

// Tailwind classes for the status pill (light/dark safe, matches order badges).
export const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  interested: "bg-accent/15 text-accent",
  contacted: "bg-blue-500/15 text-blue-500",
  ordered: "bg-success/15 text-success",
  lost: "bg-danger/15 text-danger",
};

export function isLeadStatus(v: string): v is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(v);
}
