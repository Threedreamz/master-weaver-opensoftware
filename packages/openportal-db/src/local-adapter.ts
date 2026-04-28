import { and, desc, eq, lt } from "drizzle-orm";
import type {
  AuditLogEntry,
  CallRecording,
  Channel,
  GuestSession,
  Invitation,
  Meeting,
  Message,
  Org,
  OrgMember,
  OrgRole,
  PortalAdapter,
  Ticket,
} from "@opensoftware/openportal-core";
import { generateInvitationToken, invitationExpiry } from "./local-helpers.js";
import {
  auditLog,
  callRecordings,
  channels,
  channelMembers,
  guestSessions,
  invitations,
  meetings,
  messages,
  orgs,
  orgMembers,
  tickets,
  users,
} from "./schema.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./schema.js";

export interface LocalAdapterOptions {
  db: NodePgDatabase<typeof schema>;
  workspaceId: string;
  actorUserId?: string;
}

type OrgRow = typeof orgs.$inferSelect;
type OrgMemberRow = typeof orgMembers.$inferSelect;
type InvitationRow = typeof invitations.$inferSelect;
type ChannelRow = typeof channels.$inferSelect;
type MessageRow = typeof messages.$inferSelect;
type MeetingRow = typeof meetings.$inferSelect;
type AuditRow = typeof auditLog.$inferSelect;
type TicketRow = typeof tickets.$inferSelect;
type GuestSessionRow = typeof guestSessions.$inferSelect;
type CallRecordingRow = typeof callRecordings.$inferSelect;

function toOrg(row: OrgRow): Org {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toOrgMember(row: OrgMemberRow): OrgMember {
  return {
    id: row.id,
    orgId: row.orgId,
    userId: row.userId,
    role: row.role as OrgRole,
    joinedAt: row.joinedAt,
  };
}

function toInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    orgId: row.orgId,
    email: row.email,
    role: row.role as OrgRole,
    token: row.token,
    invitedBy: row.invitedBy,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
  };
}

function toChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    kind: row.kind as Channel["kind"],
    createdAt: row.createdAt,
  };
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    channelId: row.channelId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
  };
}

function toMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    orgId: row.orgId,
    title: row.title,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    recordingUrl: row.recordingUrl,
    transcriptId: row.transcriptId,
  };
}

function toAudit(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    orgId: row.orgId,
    actorId: row.actorId,
    action: row.action,
    target: row.target,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
  };
}

function toTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    orgId: row.orgId,
    title: row.title,
    body: row.body,
    status: row.status as Ticket["status"],
    priority: row.priority as Ticket["priority"],
    assigneeId: row.assigneeId ?? null,
    externalRef: row.externalRef ?? null,
    guestEmail: row.guestEmail ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    closedAt: row.closedAt ?? null,
  };
}

function toGuestSession(row: GuestSessionRow): GuestSession {
  return {
    id: row.id,
    guestToken: row.guestToken,
    orderId: row.orderId,
    guestEmail: row.guestEmail ?? null,
    expiresAt: row.expiresAt,
    joinedCallId: row.joinedCallId ?? null,
    createdAt: row.createdAt,
  };
}

function toCallRecording(row: CallRecordingRow): CallRecording {
  return {
    id: row.id,
    meetingId: row.meetingId,
    r2Url: row.r2Url,
    gobdLockedAt: row.gobdLockedAt ?? null,
    durationMs: row.durationMs ?? null,
    createdAt: row.createdAt,
  };
}

export function createLocalAdapter(opts: LocalAdapterOptions): PortalAdapter {
  const { db, workspaceId, actorUserId } = opts;

  async function writeAudit(
    orgId: string,
    action: string,
    target: string,
    metadata: Record<string, unknown> = {},
  ) {
    await db.insert(auditLog).values({
      orgId,
      actorId: actorUserId ?? null,
      action,
      target,
      metadata,
    });
  }

  return {
    mode: "local",
    workspaceId,
    orgs: {
      async list() {
        const rows = await db
          .select()
          .from(orgs)
          .where(eq(orgs.workspaceId, workspaceId));
        return rows.map(toOrg);
      },
      async get(orgId: string) {
        const row = await db.query.orgs.findFirst({
          where: and(eq(orgs.id, orgId), eq(orgs.workspaceId, workspaceId)),
        });
        return row ? toOrg(row) : null;
      },
      async create(input) {
        const [row] = await db
          .insert(orgs)
          .values({ ...input, workspaceId })
          .returning();
        await writeAudit(row.id, "org.created", row.id, input);
        return toOrg(row);
      },
      async update(orgId, input) {
        const [row] = await db
          .update(orgs)
          .set({ ...input, updatedAt: new Date() })
          .where(and(eq(orgs.id, orgId), eq(orgs.workspaceId, workspaceId)))
          .returning();
        await writeAudit(orgId, "org.updated", orgId, input);
        return toOrg(row);
      },
      async remove(orgId) {
        await db
          .delete(orgs)
          .where(and(eq(orgs.id, orgId), eq(orgs.workspaceId, workspaceId)));
        await writeAudit(orgId, "org.removed", orgId, {});
      },
    },
    members: {
      async list(orgId) {
        const rows = await db
          .select()
          .from(orgMembers)
          .where(eq(orgMembers.orgId, orgId));
        return rows.map(toOrgMember);
      },
      async updateRole(orgId, memberId, role) {
        const [row] = await db
          .update(orgMembers)
          .set({ role })
          .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.id, memberId)))
          .returning();
        await writeAudit(orgId, "member.role_changed", memberId, { role });
        return toOrgMember(row);
      },
      async remove(orgId, memberId) {
        await db
          .delete(orgMembers)
          .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.id, memberId)));
        await writeAudit(orgId, "member.removed", memberId, {});
      },
    },
    invitations: {
      async list(orgId) {
        const rows = await db
          .select()
          .from(invitations)
          .where(eq(invitations.orgId, orgId));
        return rows.map(toInvitation);
      },
      async create(orgId, input) {
        const token = generateInvitationToken();
        const expiresAt = invitationExpiry();
        const [row] = await db
          .insert(invitations)
          .values({
            orgId,
            email: input.email,
            role: input.role,
            token,
            invitedBy: actorUserId ?? "00000000-0000-0000-0000-000000000000",
            expiresAt,
          })
          .returning();
        await writeAudit(orgId, "invitation.created", row.id, {
          email: input.email,
          role: input.role,
        });
        return toInvitation(row);
      },
      async accept(token) {
        const invite = await db.query.invitations.findFirst({
          where: eq(invitations.token, token),
        });
        if (!invite) throw new Error("Invitation not found");
        if (invite.acceptedAt) throw new Error("Invitation already accepted");
        if (invite.expiresAt < new Date()) throw new Error("Invitation expired");

        // Find or create user by email
        let user = await db.query.users.findFirst({
          where: eq(users.email, invite.email),
        });
        if (!user) {
          const [u] = await db
            .insert(users)
            .values({ email: invite.email })
            .returning();
          user = u;
        }

        const [member] = await db
          .insert(orgMembers)
          .values({ orgId: invite.orgId, userId: user.id, role: invite.role })
          .returning();

        await db
          .update(invitations)
          .set({ acceptedAt: new Date() })
          .where(eq(invitations.id, invite.id));

        await writeAudit(invite.orgId, "invitation.accepted", member.id, {});
        return toOrgMember(member);
      },
      async revoke(orgId, invitationId) {
        await db
          .delete(invitations)
          .where(
            and(eq(invitations.orgId, orgId), eq(invitations.id, invitationId)),
          );
        await writeAudit(orgId, "invitation.revoked", invitationId, {});
      },
    },
    channels: {
      async list(orgId) {
        const rows = await db
          .select()
          .from(channels)
          .where(eq(channels.orgId, orgId));
        return rows.map(toChannel);
      },
      async create(orgId, input) {
        const [row] = await db
          .insert(channels)
          .values({ orgId, name: input.name, kind: input.kind ?? "public" })
          .returning();
        await writeAudit(orgId, "channel.created", row.id, { name: input.name });
        return toChannel(row);
      },
      async remove(orgId, channelId) {
        await db
          .delete(channelMembers)
          .where(eq(channelMembers.channelId, channelId));
        await db
          .delete(messages)
          .where(eq(messages.channelId, channelId));
        await db
          .delete(channels)
          .where(and(eq(channels.orgId, orgId), eq(channels.id, channelId)));
        await writeAudit(orgId, "channel.removed", channelId, {});
      },
    },
    messages: {
      async list(channelId, opts2) {
        const limit = opts2?.limit ?? 50;
        const whereClause = opts2?.before
          ? and(
              eq(messages.channelId, channelId),
              lt(messages.createdAt, opts2.before),
            )
          : eq(messages.channelId, channelId);
        const rows = await db
          .select()
          .from(messages)
          .where(whereClause)
          .orderBy(desc(messages.createdAt))
          .limit(limit);
        return rows.map(toMessage).reverse();
      },
      async post(channelId, body) {
        const [row] = await db
          .insert(messages)
          .values({
            channelId,
            authorId: actorUserId ?? "00000000-0000-0000-0000-000000000000",
            body,
          })
          .returning();
        return toMessage(row);
      },
    },
    meetings: {
      async list(orgId) {
        const rows = await db
          .select()
          .from(meetings)
          .where(eq(meetings.orgId, orgId))
          .orderBy(desc(meetings.startedAt));
        return rows.map(toMeeting);
      },
      async start(orgId, title) {
        const [row] = await db
          .insert(meetings)
          .values({ orgId, title })
          .returning();
        await writeAudit(orgId, "meeting.started", row.id, { title });
        return toMeeting(row);
      },
      async stop(meetingId) {
        const [row] = await db
          .update(meetings)
          .set({ endedAt: new Date() })
          .where(eq(meetings.id, meetingId))
          .returning();
        await writeAudit(row.orgId, "meeting.ended", meetingId, {});
        return toMeeting(row);
      },
      async attachRecording(meetingId, url) {
        const [row] = await db
          .update(meetings)
          .set({ recordingUrl: url })
          .where(eq(meetings.id, meetingId))
          .returning();
        return toMeeting(row);
      },
    },
    audit: {
      async list(orgId, opts2) {
        const limit = opts2?.limit ?? 100;
        const rows = await db
          .select()
          .from(auditLog)
          .where(eq(auditLog.orgId, orgId))
          .orderBy(desc(auditLog.createdAt))
          .limit(limit);
        return rows.map(toAudit);
      },
    },

    tickets: {
      async list(orgId, opts2) {
        const limit = opts2?.limit ?? 100;
        const conditions = opts2?.status
          ? and(eq(tickets.orgId, orgId), eq(tickets.status, opts2.status as string))
          : eq(tickets.orgId, orgId);
        const rows = await db
          .select()
          .from(tickets)
          .where(conditions)
          .orderBy(desc(tickets.createdAt))
          .limit(limit);
        return rows.map(toTicket);
      },
      async get(ticketId) {
        const row = await db.query.tickets.findFirst({
          where: eq(tickets.id, ticketId),
        });
        return row ? toTicket(row) : null;
      },
      async create(orgId, input) {
        const [row] = await db
          .insert(tickets)
          .values({
            orgId,
            title: input.title,
            body: input.body ?? "",
            priority: (input.priority ?? "normal") as string,
            assigneeId: input.assigneeId ?? null,
            externalRef: input.externalRef ?? null,
            guestEmail: input.guestEmail ?? null,
          })
          .returning();
        await writeAudit(orgId, "ticket.created", row.id, { title: input.title });
        return toTicket(row);
      },
      async update(ticketId, input) {
        const now = new Date();
        const closedAt =
          input.status === "closed" || input.status === "resolved" ? now : undefined;
        const [row] = await db
          .update(tickets)
          .set({
            ...input,
            updatedAt: now,
            ...(closedAt ? { closedAt } : {}),
          })
          .where(eq(tickets.id, ticketId))
          .returning();
        return toTicket(row);
      },
      async listByExternalRef(externalRef) {
        const rows = await db
          .select()
          .from(tickets)
          .where(eq(tickets.externalRef, externalRef))
          .orderBy(desc(tickets.createdAt));
        return rows.map(toTicket);
      },
    },

    guest: {
      async upsertSession(input) {
        const ttl = input.ttlSeconds ?? 86400;
        const expiresAt = new Date(Date.now() + ttl * 1000);
        const existing = await db.query.guestSessions.findFirst({
          where: eq(guestSessions.guestToken, input.guestToken),
        });
        if (existing) {
          const [row] = await db
            .update(guestSessions)
            .set({ expiresAt, guestEmail: input.guestEmail ?? existing.guestEmail })
            .where(eq(guestSessions.id, existing.id))
            .returning();
          return toGuestSession(row);
        }
        const [row] = await db
          .insert(guestSessions)
          .values({
            guestToken: input.guestToken,
            orderId: input.orderId,
            guestEmail: input.guestEmail ?? null,
            expiresAt,
          })
          .returning();
        return toGuestSession(row);
      },
      async getSession(guestToken) {
        const row = await db.query.guestSessions.findFirst({
          where: eq(guestSessions.guestToken, guestToken),
        });
        return row ? toGuestSession(row) : null;
      },
      async recordCallJoin(guestToken, meetingId) {
        await db
          .update(guestSessions)
          .set({ joinedCallId: meetingId })
          .where(eq(guestSessions.guestToken, guestToken));
      },
      async attachRecording(input) {
        const [row] = await db
          .insert(callRecordings)
          .values({
            meetingId: input.meetingId,
            r2Url: input.r2Url,
            durationMs: input.durationMs ?? null,
          })
          .returning();
        return toCallRecording(row);
      },
      async lockRecording(recordingId) {
        const [row] = await db
          .update(callRecordings)
          .set({ gobdLockedAt: new Date() })
          .where(eq(callRecordings.id, recordingId))
          .returning();
        return toCallRecording(row);
      },
      async listRecordings(meetingId) {
        const rows = await db
          .select()
          .from(callRecordings)
          .where(eq(callRecordings.meetingId, meetingId))
          .orderBy(desc(callRecordings.createdAt));
        return rows.map(toCallRecording);
      },
    },
  };
}

