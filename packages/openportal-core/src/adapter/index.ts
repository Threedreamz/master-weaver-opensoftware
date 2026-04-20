import type {
  AuditLogEntry,
  Channel,
  Invitation,
  Meeting,
  Message,
  Org,
  OrgMember,
  OrgRole,
} from "../types/index.js";

export interface PortalAdapter {
  readonly mode: "local" | "remote";
  readonly workspaceId: string;

  orgs: {
    list(): Promise<Org[]>;
    get(orgId: string): Promise<Org | null>;
    create(input: { name: string; slug: string }): Promise<Org>;
    update(orgId: string, input: Partial<Pick<Org, "name" | "slug">>): Promise<Org>;
    remove(orgId: string): Promise<void>;
  };

  members: {
    list(orgId: string): Promise<OrgMember[]>;
    updateRole(orgId: string, memberId: string, role: OrgRole): Promise<OrgMember>;
    remove(orgId: string, memberId: string): Promise<void>;
  };

  invitations: {
    list(orgId: string): Promise<Invitation[]>;
    create(orgId: string, input: { email: string; role: OrgRole }): Promise<Invitation>;
    accept(token: string): Promise<OrgMember>;
    revoke(orgId: string, invitationId: string): Promise<void>;
  };

  channels: {
    list(orgId: string): Promise<Channel[]>;
    create(
      orgId: string,
      input: { name: string; kind?: "public" | "private" | "direct" },
    ): Promise<Channel>;
    remove(orgId: string, channelId: string): Promise<void>;
  };

  messages: {
    list(channelId: string, opts?: { limit?: number; before?: Date }): Promise<Message[]>;
    post(channelId: string, body: string): Promise<Message>;
  };

  meetings: {
    list(orgId: string): Promise<Meeting[]>;
    start(orgId: string, title: string): Promise<Meeting>;
    stop(meetingId: string): Promise<Meeting>;
    attachRecording(meetingId: string, url: string): Promise<Meeting>;
  };

  audit: {
    list(orgId: string, opts?: { limit?: number }): Promise<AuditLogEntry[]>;
  };
}

export interface AdapterAuthContext {
  userId: string;
  userEmail: string;
  roles: string[];
}
