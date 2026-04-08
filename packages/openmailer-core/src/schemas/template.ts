import { z } from 'zod';
import { TEMPLATE_CATEGORIES } from '../constants.js';

export const templateSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  subject: z.string(),
  htmlBody: z.string(),
  jsonBody: z.unknown().optional(),
  category: z.enum(TEMPLATE_CATEGORIES).default('other'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createTemplateSchema = templateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTemplateSchema = createTemplateSchema.partial();

export type Template = z.infer<typeof templateSchema>;
export type CreateTemplate = z.infer<typeof createTemplateSchema>;
export type UpdateTemplate = z.infer<typeof updateTemplateSchema>;
