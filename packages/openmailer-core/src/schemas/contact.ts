import { z } from 'zod';
import { CONTACT_STATUSES } from '../constants.js';

export const contactSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).default({}),
  score: z.number().default(0),
  status: z.enum(CONTACT_STATUSES).default('active'),
  emailConsent: z.boolean(),
  trackingConsent: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createContactSchema = contactSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateContactSchema = createContactSchema.partial();

export type Contact = z.infer<typeof contactSchema>;
export type CreateContact = z.infer<typeof createContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;
