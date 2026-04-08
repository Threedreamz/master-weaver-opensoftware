import { z } from "zod";

export const printTechnologySchema = z.enum(["fdm", "sla", "sls"]);

export const printerProtocolSchema = z.enum([
  "moonraker", "octoprint", "bambu_mqtt", "bambu_cloud",
  "formlabs_local", "formlabs_cloud", "sls4all", "manual",
]);

export const printerStatusSchema = z.enum([
  "online", "offline", "printing", "paused", "error", "maintenance",
]);

export const jobStatusSchema = z.enum([
  "queued", "slicing", "post_processing", "ready",
  "sending", "printing", "paused",
  "washing", "curing",
  "cooling", "depowdering",
  "completed", "failed", "cancelled",
]);

export const slicerEngineSchema = z.enum([
  "prusaslicer", "orcaslicer", "bambu_studio", "preform",
  "chitubox", "lychee", "sls4all", "custom",
]);

export const createPrinterSchema = z.object({
  name: z.string().min(1).max(255),
  technology: printTechnologySchema,
  make: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  protocol: printerProtocolSchema,
  ipAddress: z.string().optional(),
  port: z.number().int().positive().optional(),
  apiKey: z.string().optional(),
  accessToken: z.string().optional(),
  serialNumber: z.string().optional(),
  buildVolumeX: z.number().positive().optional(),
  buildVolumeY: z.number().positive().optional(),
  buildVolumeZ: z.number().positive().optional(),
  nozzleDiameter: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const createMaterialSchema = z.object({
  name: z.string().min(1).max(255),
  technology: printTechnologySchema,
  type: z.string().min(1).max(100),
  manufacturer: z.string().max(255).optional(),
  color: z.string().max(100).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  totalQuantity: z.number().nonnegative().optional(),
  unit: z.enum(["g", "ml", "kg", "l"]).optional(),
  costPerUnit: z.number().nonnegative().optional(),
  diameter: z.number().positive().optional(),
  printTempMin: z.number().int().optional(),
  printTempMax: z.number().int().optional(),
  notes: z.string().optional(),
});

export const createModelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const createProfileSchema = z.object({
  name: z.string().min(1).max(255),
  technology: printTechnologySchema,
  slicerEngine: slicerEngineSchema,
  config: z.record(z.unknown()),
  layerHeight: z.number().positive().optional(),
  nozzleDiameter: z.number().positive().optional(),
  infillDensity: z.number().int().min(0).max(100).optional(),
  description: z.string().optional(),
});

export const createJobSchema = z.object({
  name: z.string().min(1).max(255),
  modelId: z.string().uuid(),
  printerId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  materialId: z.string().uuid().optional(),
  priority: z.number().int().min(0).max(10).default(0),
  notes: z.string().optional(),
});

export const createBatchSchema = z.object({
  name: z.string().min(1).max(255),
  technology: printTechnologySchema,
  modelId: z.string().uuid(),
  parameterMatrix: z.object({
    nozzleDiameters: z.array(z.number().positive()).optional(),
    layerHeights: z.array(z.number().positive()).optional(),
    infillDensities: z.array(z.number().int().min(0).max(100)).optional(),
    materialIds: z.array(z.string().uuid()).optional(),
    exposureTimes: z.array(z.number().positive()).optional(),
    liftSpeeds: z.array(z.number().positive()).optional(),
    laserPowers: z.array(z.number().positive()).optional(),
    scanSpeeds: z.array(z.number().positive()).optional(),
    profileIds: z.array(z.string().uuid()).optional(),
    printerIds: z.array(z.string().uuid()).optional(),
  }),
});
