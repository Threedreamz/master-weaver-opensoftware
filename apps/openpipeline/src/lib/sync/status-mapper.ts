/** Status mapping between OpenPipeline, Teams, and OpenBounty */

// OpenPipeline -> Teams
const STATUS_TO_TEAMS: Record<string, string> = {
  offen: "OPEN",
  in_arbeit: "IN_PROGRESS",
  blockiert: "OPEN",
  erledigt: "RESOLVED",
  abgebrochen: "CLOSED",
};

// Teams -> OpenPipeline
const TEAMS_TO_STATUS: Record<string, string> = {
  OPEN: "offen",
  IN_PROGRESS: "in_arbeit",
  RESOLVED: "erledigt",
  CLOSED: "abgebrochen",
};

// OpenPipeline -> OpenBounty
const STATUS_TO_BOUNTY: Record<string, string> = {
  offen: "offen",
  in_arbeit: "in_arbeit",
  blockiert: "offen",
  erledigt: "erledigt",
  abgebrochen: "abgebrochen",
};

// Priority mapping
const PRIORITY_TO_TEAMS: Record<string, string> = {
  kritisch: "URGENT",
  hoch: "HIGH",
  mittel: "MEDIUM",
  niedrig: "LOW",
};

const TEAMS_TO_PRIORITY: Record<string, string> = {
  URGENT: "kritisch",
  HIGH: "hoch",
  MEDIUM: "mittel",
  LOW: "niedrig",
};

const PRIORITY_TO_BOUNTY: Record<string, string> = {
  kritisch: "hoch",
  hoch: "hoch",
  mittel: "mittel",
  niedrig: "niedrig",
};

export function toTeamsStatus(status: string): string {
  return STATUS_TO_TEAMS[status] ?? "OPEN";
}

export function fromTeamsStatus(status: string): string {
  return TEAMS_TO_STATUS[status] ?? "offen";
}

export function toBountyStatus(status: string): string {
  return STATUS_TO_BOUNTY[status] ?? "offen";
}

export function toTeamsPriority(prio: string): string {
  return PRIORITY_TO_TEAMS[prio] ?? "MEDIUM";
}

export function fromTeamsPriority(prio: string): string {
  return TEAMS_TO_PRIORITY[prio] ?? "mittel";
}

export function toBountyPriority(prio: string): string {
  return PRIORITY_TO_BOUNTY[prio] ?? "mittel";
}
