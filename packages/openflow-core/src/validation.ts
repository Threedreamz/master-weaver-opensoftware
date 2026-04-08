import { z } from "zod";

export const flowSettingsSchema = z.object({
  theme: z.object({
    primaryColor: z.string().default("#6366f1"),
    backgroundColor: z.string().default("#0f172a"),
    textColor: z.string().default("#ffffff"),
    cardBackgroundColor: z.string().default("#1e293b"),
    borderRadius: z.string().default("1rem"),
    fontFamily: z.string().default("system-ui"),
  }),
  showProgressBar: z.boolean().default(true),
  progressBarStyle: z.enum(["dots", "bar", "steps"]).default("dots"),
  submitButtonText: z.string().default("Submit"),
  successMessage: z.string().default("Thank you for your submission!"),
  successRedirectUrl: z.string().optional(),
});

export const createFlowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(500).optional(),
  settings: flowSettingsSchema.optional(),
});

export const updateFlowSchema = createFlowSchema.partial();

export const createStepSchema = z.object({
  flowId: z.string().uuid(),
  type: z.enum(["start", "step", "end"]),
  label: z.string().min(1).max(100),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  config: z.object({
    title: z.string().default(""),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    layout: z.enum(["single-column", "two-column"]).default("single-column"),
    showProgress: z.boolean().default(true),
  }).optional(),
});

export const createComponentSchema = z.object({
  stepId: z.string().uuid(),
  componentType: z.string().min(1),
  fieldKey: z.string().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Field key must be alphanumeric"),
  label: z.string().optional(),
  config: z.record(z.string(), z.unknown()),
  validation: z.array(z.object({
    type: z.string(),
    value: z.union([z.string(), z.number()]).optional(),
    message: z.string(),
  })).optional(),
  sortOrder: z.number().int().default(0),
  required: z.boolean().default(false),
});

export const createEdgeSchema = z.object({
  flowId: z.string().uuid(),
  sourceStepId: z.string().uuid(),
  targetStepId: z.string().uuid(),
  conditionType: z.enum(["always", "equals", "not_equals", "contains", "not_contains", "gt", "lt", "gte", "lte", "regex", "is_empty", "is_not_empty"]).default("always"),
  conditionFieldKey: z.string().optional(),
  conditionValue: z.string().optional(),
  label: z.string().optional(),
  priority: z.number().int().default(0),
});

export const submitFlowSchema = z.object({
  flowId: z.string(),
  answers: z.record(z.string(), z.unknown()),
  metadata: z.object({
    userAgent: z.string().optional(),
    referrer: z.string().optional(),
    utm: z.record(z.string(), z.string()).optional(),
    durationMs: z.number().optional(),
    stepPath: z.array(z.string()).optional(),
  }).optional(),
});
