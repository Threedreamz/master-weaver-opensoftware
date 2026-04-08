import { z } from 'zod';

/**
 * Workspace schema for the OpenMailer marketing platform.
 *
 * Each app gets its own workspace. The `ownerApp` field identifies which app
 * owns this workspace, enabling per-app email marketing configuration while
 * sharing the same OpenMailer infrastructure.
 */
export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  /** Identifies the owning app */
  ownerApp: z.string().optional(),
  settings: z.object({
    brandColors: z.array(z.string()).default([]),
    defaultFromName: z.string().optional(),
    defaultFromEmail: z.string().optional(),
    defaultReplyTo: z.string().optional(),
  }),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Workspace = z.infer<typeof workspaceSchema>;
