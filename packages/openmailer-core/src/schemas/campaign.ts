import { z } from 'zod';
import { CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from '../constants.js';

export const campaignSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  type: z.enum(CAMPAIGN_TYPES).default('regular'),
  status: z.enum(CAMPAIGN_STATUSES).default('draft'),
  templateId: z.string().uuid().optional(),
  segmentId: z.string().uuid().optional(),
  scheduledAt: z.coerce.date().optional(),
  sentAt: z.coerce.date().optional(),
  fromName: z.string(),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional(),
  subject: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createCampaignSchema = campaignSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCampaignSchema = createCampaignSchema.partial();

export type Campaign = z.infer<typeof campaignSchema>;
export type CreateCampaign = z.infer<typeof createCampaignSchema>;
export type UpdateCampaign = z.infer<typeof updateCampaignSchema>;
