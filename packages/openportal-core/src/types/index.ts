export type OrgRole = "owner" | "admin" | "member" | "guest";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface Ticket {
  id: string;
  orgId: string;
  title: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  externalRef: string | null;
  guestEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

export interface GuestSession {
  id: string;
  guestToken: string;
  orderId: string;
  guestEmail: string | null;
  expiresAt: Date;
  joinedCallId: string | null;
  createdAt: Date;
}

export interface CallRecording {
  id: string;
  meetingId: string;
  r2Url: string;
  gobdLockedAt: Date | null;
  durationMs: string | null;
  createdAt: Date;
}

export interface Org {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  joinedAt: Date;
}

export interface Invitation {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
}

export interface Channel {
  id: string;
  orgId: string;
  name: string;
  kind: "public" | "private" | "direct";
  createdAt: Date;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
}

export interface Meeting {
  id: string;
  orgId: string;
  title: string;
  startedAt: Date;
  endedAt: Date | null;
  recordingUrl: string | null;
  transcriptId: string | null;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  actorId: string | null;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
