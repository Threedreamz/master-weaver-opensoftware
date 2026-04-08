import { z } from 'zod';

export const formFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'email', 'select', 'checkbox', 'textarea', 'hidden']),
  label: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const formSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  fields: z.array(formFieldSchema),
  settings: z.object({
    doubleOptIn: z.boolean(),
    redirectUrl: z.string().optional(),
    successMessage: z.string().optional(),
  }),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type Form = z.infer<typeof formSchema>;
