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
  Ticket,
} from "@opensoftware/openportal-core";
import type { PortalAdapter } from "@opensoftware/openportal-core/adapter";

export interface RemoteAdapterOptions {
  baseUrl: string;
  workspaceId: string;
  getAuthToken?: () => string | Promise<string>;
  fetchImpl?: typeof fetch;
}

export function createRemoteAdapter(opts: RemoteAdapterOptions): PortalAdapter {
  const f = opts.fetchImpl ?? fetch;

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = opts.getAuthToken ? await opts.getAuthToken() : undefined;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-workspace-id": opts.workspaceId,
    };
    if (token) headers["authorization"] = `Bearer ${token}`;

    const res = await f(`${opts.baseUrl}${path}`, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      let err: unknown;
      try {
        err = await res.json();
      } catch {
        err = await res.text();
      }
      throw new OpenPortalRemoteError(res.status, String(method), path, err);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    mode: "remote",
    workspaceId: opts.workspaceId,
    orgs: {
      list: () => call<Org[]>("GET", "/api/orgs"),
      get: (id) => call<Org | null>("GET", `/api/orgs/${id}`),
      create: (input) => call<Org>("POST", "/api/orgs", input),
      update: (id, input) => call<Org>("PATCH", `/api/orgs/${id}`, input),
      remove: (id) => call<void>("DELETE", `/api/orgs/${id}`),
    },
    members: {
      list: (orgId) => call<OrgMember[]>("GET", `/api/orgs/${orgId}/members`),
      updateRole: (orgId, memberId, role: OrgRole) =>
        call<OrgMember>("PATCH", `/api/orgs/${orgId}/members/${memberId}`, { role }),
      remove: (orgId, memberId) =>
        call<void>("DELETE", `/api/orgs/${orgId}/members/${memberId}`),
    },
    invitations: {
      list: (orgId) => call<Invitation[]>("GET", `/api/orgs/${orgId}/invitations`),
      create: (orgId, input) =>
        call<Invitation>("POST", `/api/orgs/${orgId}/invitations`, input),
      accept: (token) => call<OrgMember>("POST", `/api/invitations/accept`, { token }),
      revoke: (orgId, invitationId) =>
        call<void>("DELETE", `/api/orgs/${orgId}/invitations/${invitationId}`),
    },
    channels: {
      list: (orgId) => call<Channel[]>("GET", `/api/orgs/${orgId}/channels`),
      create: (orgId, input) =>
        call<Channel>("POST", `/api/orgs/${orgId}/channels`, input),
      remove: (orgId, channelId) =>
        call<void>("DELETE", `/api/orgs/${orgId}/channels/${channelId}`),
    },
    messages: {
      list: (channelId, opts2) => {
        const params = new URLSearchParams();
        if (opts2?.limit) params.set("limit", String(opts2.limit));
        if (opts2?.before) params.set("before", opts2.before.toISOString());
        const qs = params.toString();
        return call<Message[]>(
          "GET",
          `/api/channels/${channelId}/messages${qs ? `?${qs}` : ""}`,
        );
      },
      post: (channelId, body) =>
        call<Message>("POST", `/api/channels/${channelId}/messages`, { body }),
    },
    meetings: {
      list: (orgId) => call<Meeting[]>("GET", `/api/orgs/${orgId}/meetings`),
      start: (orgId, title) =>
        call<Meeting>("POST", `/api/orgs/${orgId}/meetings`, { title }),
      stop: (meetingId) => call<Meeting>("POST", `/api/meetings/${meetingId}/stop`),
      attachRecording: (meetingId, url) =>
        call<Meeting>("POST", `/api/meetings/${meetingId}/recording`, { url }),
    },
    audit: {
      list: (orgId, opts2) => {
        const params = new URLSearchParams();
        if (opts2?.limit) params.set("limit", String(opts2.limit));
        const qs = params.toString();
        return call<AuditLogEntry[]>(
          "GET",
          `/api/orgs/${orgId}/audit${qs ? `?${qs}` : ""}`,
        );
      },
    },
    tickets: {
      list: (orgId, opts2) => {
        const params = new URLSearchParams();
        if (opts2?.status) params.set("status", opts2.status);
        if (opts2?.limit) params.set("limit", String(opts2.limit));
        const qs = params.toString();
        return call<Ticket[]>(
          "GET",
          `/api/orgs/${orgId}/tickets${qs ? `?${qs}` : ""}`,
        );
      },
      get: (ticketId) => call<Ticket | null>("GET", `/api/tickets/${ticketId}`),
      create: (orgId, input) =>
        call<Ticket>("POST", `/api/orgs/${orgId}/tickets`, input),
      update: (ticketId, input) =>
        call<Ticket>("PATCH", `/api/tickets/${ticketId}`, input),
      listByExternalRef: (externalRef) =>
        call<Ticket[]>(
          "GET",
          `/api/tickets?externalRef=${encodeURIComponent(externalRef)}`,
        ),
    },
    guest: {
      upsertSession: (input) =>
        call<GuestSession>("POST", `/api/guest/sessions`, input),
      getSession: (guestToken) =>
        call<GuestSession | null>(
          "GET",
          `/api/guest/sessions/${encodeURIComponent(guestToken)}`,
        ),
      recordCallJoin: (guestToken, meetingId) =>
        call<void>("POST", `/api/guest/sessions/${encodeURIComponent(guestToken)}/join`, {
          meetingId,
        }),
      attachRecording: (input) =>
        call<CallRecording>("POST", `/api/recordings`, input),
      lockRecording: (recordingId) =>
        call<CallRecording>("POST", `/api/recordings/${recordingId}/lock`),
      listRecordings: (meetingId) =>
        call<CallRecording[]>("GET", `/api/meetings/${meetingId}/recordings`),
    },
  };
}


export class OpenPortalRemoteError extends Error {
  constructor(
    public status: number,
    public method: string,
    public path: string,
    public payload: unknown,
  ) {
    super(`OpenPortal ${method} ${path} failed with ${status}`);
    this.name = "OpenPortalRemoteError";
  }
}
