import { z } from "zod";

export const orgRoleSchema = z.enum(["owner", "admin", "member", "guest"]);

export const createOrgSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
});

export const updateOrgSchema = createOrgSchema.partial();

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: orgRoleSchema,
});

export const updateMemberRoleSchema = z.object({
  role: orgRoleSchema,
});

export const createChannelSchema = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(["public", "private", "direct"]).default("public"),
});

export const postMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const startMeetingSchema = z.object({
  title: z.string().min(1).max(200),
});

export const ticketStatusSchema = z.enum(["open", "in_progress", "resolved", "closed"]);
export const ticketPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const createTicketSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(10000).default(""),
  priority: ticketPrioritySchema.default("normal"),
  assigneeId: z.string().uuid().nullable().default(null),
  externalRef: z.string().max(200).nullable().default(null),
  guestEmail: z.string().email().nullable().default(null),
});

export const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(10000).optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const joinCallSchema = z.object({
  orderId: z.string().min(1),
});

export const extractedTaskSchema = z.object({
  assignee: z.string().email().nullable(),
  title: z.string().min(1),
  deadline: z.string().datetime().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export type ExtractedTask = z.infer<typeof extractedTaskSchema>;

export const openPipelineWebhookPayloadSchema = z.object({
  meetingId: z.string().uuid(),
  orgId: z.string().uuid(),
  workspaceId: z.string(),
  tasks: z.array(extractedTaskSchema),
  transcriptUrl: z.string().url().nullable(),
  source: z.literal("openportal"),
});

export type OpenPipelineWebhookPayload = z.infer<
  typeof openPipelineWebhookPayloadSchema
>;
