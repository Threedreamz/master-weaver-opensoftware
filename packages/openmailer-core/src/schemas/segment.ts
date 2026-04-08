import { z } from 'zod';
import { SEGMENT_OPERATORS } from '../constants.js';

export const segmentConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(SEGMENT_OPERATORS),
  value: z.unknown().optional(),
});

export const segmentSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  conditions: z.array(segmentConditionSchema),
  conditionLogic: z.enum(['and', 'or']).default('and'),
  isDynamic: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createSegmentSchema = segmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSegmentSchema = createSegmentSchema.partial();

export type SegmentCondition = z.infer<typeof segmentConditionSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type CreateSegment = z.infer<typeof createSegmentSchema>;
export type UpdateSegment = z.infer<typeof updateSegmentSchema>;
