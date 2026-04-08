// Types
export type {
  PrintTechnology,
  PrinterProtocol,
  PrinterStatus,
  JobStatus,
  BatchStatus,
  SlicerEngine,
  MaterialUnit,
  PrinterState,
  PrintProgress,
  PrinterConnection,
  BatchParameterMatrix,
  SlicerConfig,
  SliceRequest,
  SliceResult,
  JobTransition,
} from "./types";

// Job Pipeline
export {
  getValidTransitions,
  canTransition,
  isTerminalStatus,
  getNextAutomaticTransition,
  TRANSITIONS,
} from "./job-pipeline";

// Batch Engine
export {
  expandParameterMatrix,
  countCombinations,
  type BatchCombination,
} from "./batch-engine";

// Validation
export {
  printTechnologySchema,
  printerProtocolSchema,
  printerStatusSchema,
  jobStatusSchema,
  slicerEngineSchema,
  createPrinterSchema,
  createMaterialSchema,
  createModelSchema,
  createProfileSchema,
  createJobSchema,
  createBatchSchema,
} from "./validation";

// Notification Types
export type {
  NotificationType,
  NotificationSeverity,
  NotificationPayload,
  TypedNotificationPayload,
  PrintDonePayload,
  MaterialChangePayload,
  PartRemovalPayload,
  MaintenanceRequiredPayload,
  ErrorCheckPayload,
  PostProcessingPayload,
  PrinterAssignedPayload,
  FeasibilityWarningPayload,
  SlsPackReadyPayload,
} from "./notification-types";

export { DEFAULT_SEVERITY } from "./notification-types";

// Notification Service
export {
  buildNotification,
  buildTypedNotification,
  shouldNotify,
  getNotificationAction,
  sortNotifications,
} from "./notification-service";

// Monitoring Types
export type {
  PrinterMonitoringState,
  MonitoringOverview,
} from "./monitoring-types";

export {
  computeMonitoringSummary,
  getTimeElapsed,
  getTimeRemaining,
  formatDuration,
} from "./monitoring-types";

// Mesh Analyzer
export type {
  Triangle,
  MeshData,
  MeshMetrics,
  FeasibilityIssue,
  FeasibilityVerdict,
} from "./mesh-analyzer";

export { computeMeshMetrics } from "./mesh-analyzer";

// Feasibility Engine
export type { FeasibilityResult } from "./feasibility-engine";

export {
  checkFeasibility,
  checkAllTechnologies,
} from "./feasibility-engine";

// Orientation Engine
export type {
  OrientationCandidate,
  OrientationOptions,
} from "./orientation-engine";

export { computeOrientations } from "./orientation-engine";

// Assignment Engine
export type {
  AssignmentJob,
  AssignmentPrinter,
  AssignmentRule,
  AssignmentResult,
} from "./assignment-engine";

export { rankPrinters, assignBatch } from "./assignment-engine";

// Maintenance Scheduler
export type {
  MaintenanceTask,
  PrinterStats,
  TaskDueStatus,
  TaskEvaluation,
} from "./maintenance-scheduler";

export {
  evaluateTasks,
  getMaintenanceScore,
} from "./maintenance-scheduler";

// Calibration Types
export type {
  CalibrationTier,
  CalibrationStatus,
  CalibrationProcedureType,
  MeasurementType,
  MeasurementUnit,
  CalibrationResultType,
  CalibrationStep,
  BTMTMeasurement,
  XYMeasurement,
  ZMeasurement,
  DiagnosticGrade,
  XYScalingResult,
  ZScalingResult,
  BTMTResult,
  DiagnosticResult,
  CalibrationSessionSummary,
  PrinterCalibrationStatus,
  CalibrationTrendPoint,
} from "./calibration-types";

export {
  CALIBRATION_TRANSITIONS,
  canTransitionCalibration,
  isTerminalCalibrationStatus,
} from "./calibration-types";

// Calibration Engine
export {
  calculateXYScaling,
  calculateZScaling,
  calculateBTMTOffset,
  evaluateDiagnostic,
  validateXYMeasurements,
  validateZMeasurements,
} from "./calibration-engine";

export type { ValidationResult } from "./calibration-engine";

// 3D Bin Packing
export type {
  PackingItem,
  PackedItem,
  PackingResult,
  PackingOptions,
} from "./bin-packing-3d";

export {
  pack3D,
  estimateSLSPrintTime,
  estimateMaterialCost,
} from "./bin-packing-3d";
