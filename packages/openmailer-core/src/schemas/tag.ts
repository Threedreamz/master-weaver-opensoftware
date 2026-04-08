import { z } from 'zod';

export const tagSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  color: z.string().optional(),
  createdAt: z.coerce.date(),
});

export type Tag = z.infer<typeof tagSchema>;
