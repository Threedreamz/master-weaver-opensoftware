// ==================== Calibration Types ====================

export type CalibrationTier = "core" | "mechanical" | "maintenance" | "service" | "software";

export type CalibrationStatus =
  | "initiated"
  | "printing"
  | "cooling"
  | "measuring"
  | "calculating"
  | "review"
  | "applying"
  | "applied"
  | "verifying"
  | "verified"
  | "completed"
  | "failed"
  | "cancelled";

export type CalibrationProcedureType =
  | "btmt"
  | "xy_scaling"
  | "z_scaling"
  | "diagnostic"
  | "leveling"
  | "doser"
  | "powder_flipper"
  | "optical_cassette_clean"
  | "ir_sensor_clean"
  | "laser_window_clean"
  | "camera_lens_clean"
  | "exhaust_filter_clean"
  | "enclosure_clean"
  | "exhaust_purge"
  | "laser_module"
  | "galvo_alignment"
  | "piston_seal"
  | "ir_sensor_replace"
  | "accelerometer_recal"
  | "powder_refresh_rate"
  | "bed_temp_override"
  | "nitrogen_setup";

export type MeasurementType = "btmt_offset" | "xy_point" | "z_height" | "diagnostic_grade";

export type MeasurementUnit = "mm" | "celsius" | "percent" | "grade";

export type CalibrationResultType =
  | "bed_temp_offset"
  | "x_scale_percent"
  | "y_scale_percent"
  | "z_scale_factor"
  | "diagnostic_report";

// ==================== Calibration Step ====================

export interface CalibrationStep {
  stepNumber: number;
  title: string;
  description: string;
  type: "instruction" | "print" | "measure" | "enter_on_touchscreen" | "wait" | "verify";
  durationMinutes?: number;
  imageUrl?: string;
}

// ==================== Measurement Interfaces ====================

export interface BTMTMeasurement {
  selectedPlaqueIndex: number;
  offsetCelsius: number;
  plaqueConditions: Array<{
    index: number;
    offsetCelsius: number;
    condition: "too_cold" | "ideal" | "too_hot" | "failed";
    notes?: string;
  }>;
}

export interface XYMeasurement {
  pointIndex: number;
  axis: "x" | "y";
  side: "a" | "b";
  nominalMm: number;
  measuredMm: number;
}

export interface ZMeasurement {
  pointIndex: number;
  nominalMm: number;
  measuredMm: number;
  positionInBuild?: "top" | "middle" | "bottom";
}

export interface DiagnosticGrade {
  category: string;
  grade: "pass" | "marginal" | "fail";
  neededCalibration?: CalibrationProcedureType;
  notes?: string;
}

// ==================== Calculation Results ====================

export interface XYScalingResult {
  xScalePercent: number;
  yScalePercent: number;
  confidence: number;
  measurements: XYMeasurement[];
  outliers: number[];
  meanErrorX: number;
  meanErrorY: number;
  stdDevX: number;
  stdDevY: number;
}

export interface ZScalingResult {
  zScaleFactor: number;
  confidence: number;
  measurements: ZMeasurement[];
  meanError: number;
  stdDev: number;
}

export interface BTMTResult {
  offsetCelsius: number;
  selectedPlaqueIndex: number;
  confidence: number;
}

export interface DiagnosticResult {
  overallGrade: "pass" | "marginal" | "fail";
  neededCalibrations: CalibrationProcedureType[];
  grades: DiagnosticGrade[];
}

// ==================== Session Summary ====================

export interface CalibrationSessionSummary {
  sessionId: string;
  procedureId: string;
  procedureName: string;
  printerId: string;
  printerName: string;
  materialId?: string;
  materialName?: string;
  status: CalibrationStatus;
  startedAt: Date;
  completedAt?: Date;
  resultSummary?: string;
}

// ==================== Calibration Status Per Printer ====================

export interface PrinterCalibrationStatus {
  printerId: string;
  printerName: string;
  procedures: Array<{
    procedureId: string;
    procedureName: string;
    tier: CalibrationTier;
    lastCalibrated?: Date;
    lastResult?: string;
    isDue: boolean;
    isOverdue: boolean;
    nextDueAt?: Date;
    sessionCount: number;
  }>;
  overallScore: number;
}

// ==================== Trend Data ====================

export interface CalibrationTrendPoint {
  sessionId: string;
  date: Date;
  value: number;
  materialId?: string;
  materialName?: string;
}

// ==================== Valid Status Transitions ====================

export const CALIBRATION_TRANSITIONS: Record<CalibrationStatus, CalibrationStatus[]> = {
  initiated: ["printing", "measuring", "cancelled"],
  printing: ["cooling", "failed", "cancelled"],
  cooling: ["measuring", "failed", "cancelled"],
  measuring: ["calculating", "failed", "cancelled"],
  calculating: ["review", "failed"],
  review: ["applying", "cancelled"],
  applying: ["applied", "failed", "cancelled"],
  applied: ["verifying", "completed"],
  verifying: ["verified", "failed", "cancelled"],
  verified: ["completed"],
  completed: [],
  failed: ["initiated"],
  cancelled: ["initiated"],
};

export function canTransitionCalibration(from: CalibrationStatus, to: CalibrationStatus): boolean {
  return CALIBRATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminalCalibrationStatus(status: CalibrationStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}
