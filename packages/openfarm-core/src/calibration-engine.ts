import type {
  XYMeasurement,
  ZMeasurement,
  BTMTMeasurement,
  DiagnosticGrade,
  XYScalingResult,
  ZScalingResult,
  BTMTResult,
  DiagnosticResult,
  CalibrationProcedureType,
} from "./calibration-types";

// ==================== Statistical Helpers ====================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

function detectOutliers(values: number[], threshold = 2): number[] {
  const avg = mean(values);
  const sd = stdDev(values);
  if (sd === 0) return [];
  return values
    .map((v, i) => ({ index: i, zscore: Math.abs((v - avg) / sd) }))
    .filter((v) => v.zscore > threshold)
    .map((v) => v.index);
}

// ==================== X/Y Scaling Calculation ====================

/**
 * Calculate X/Y scaling correction percentages from 24-point measurement data.
 * The Fuse 1 test piece has 24 measurement points (12 per side, Side A and Side B).
 * Each point has a nominal dimension and a measured dimension.
 *
 * Returns correction percentages: if part measures 100.6mm when nominal is 100mm,
 * the correction is -0.6% to compensate.
 */
export function calculateXYScaling(measurements: XYMeasurement[]): XYScalingResult {
  const xMeasurements = measurements.filter((m) => m.axis === "x");
  const yMeasurements = measurements.filter((m) => m.axis === "y");

  const xErrors = xMeasurements.map((m) => ((m.measuredMm - m.nominalMm) / m.nominalMm) * 100);
  const yErrors = yMeasurements.map((m) => ((m.measuredMm - m.nominalMm) / m.nominalMm) * 100);

  const xOutliers = detectOutliers(xErrors);
  const yOutliers = detectOutliers(yErrors);

  const allOutlierIndices = [
    ...xOutliers.map((i) => xMeasurements[i].pointIndex),
    ...yOutliers.map((i) => yMeasurements[i].pointIndex),
  ];

  // Filter out outliers for final calculation
  const xFiltered = xErrors.filter((_, i) => !xOutliers.includes(i));
  const yFiltered = yErrors.filter((_, i) => !yOutliers.includes(i));

  const meanErrorX = mean(xFiltered);
  const meanErrorY = mean(yFiltered);

  // Correction = negative of the mean error (if parts are 0.6% too large, correct by -0.6%)
  const xScalePercent = -meanErrorX;
  const yScalePercent = -meanErrorY;

  // Confidence based on consistency of measurements (lower stddev = higher confidence)
  const sdX = stdDev(xFiltered);
  const sdY = stdDev(yFiltered);
  const maxSD = Math.max(sdX, sdY);
  const confidence = Math.max(0, Math.min(1, 1 - maxSD / 2));

  return {
    xScalePercent: Math.round(xScalePercent * 1000) / 1000,
    yScalePercent: Math.round(yScalePercent * 1000) / 1000,
    confidence: Math.round(confidence * 100) / 100,
    measurements,
    outliers: allOutlierIndices,
    meanErrorX: Math.round(meanErrorX * 1000) / 1000,
    meanErrorY: Math.round(meanErrorY * 1000) / 1000,
    stdDevX: Math.round(sdX * 1000) / 1000,
    stdDevY: Math.round(sdY * 1000) / 1000,
  };
}

// ==================== Z Scaling Calculation ====================

/**
 * Calculate Z scaling correction factor from height measurements.
 * If a 100mm feature prints at 100.3mm, the correction factor is 99.7/100 = 0.997.
 */
export function calculateZScaling(measurements: ZMeasurement[]): ZScalingResult {
  const errors = measurements.map((m) => ((m.measuredMm - m.nominalMm) / m.nominalMm) * 100);
  const outliers = detectOutliers(errors);
  const filtered = errors.filter((_, i) => !outliers.includes(i));
  const filteredMeasurements = measurements.filter((_, i) => !outliers.includes(i));

  const meanError = mean(filtered);
  const sd = stdDev(filtered);

  // Scale factor: if mean error is +0.3%, factor is (100 - 0.3) / 100 = 0.997
  const zScaleFactor = (100 - meanError) / 100;

  const confidence = Math.max(0, Math.min(1, 1 - sd / 2));

  return {
    zScaleFactor: Math.round(zScaleFactor * 10000) / 10000,
    confidence: Math.round(confidence * 100) / 100,
    measurements: filteredMeasurements,
    meanError: Math.round(meanError * 1000) / 1000,
    stdDev: Math.round(sd * 1000) / 1000,
  };
}

// ==================== BTMT Calculation ====================

/**
 * Calculate bed temperature offset from BTMT plaque selection.
 * The user prints plaques at different temperature offsets and selects the best one.
 * Returns the selected offset in degrees Celsius.
 */
export function calculateBTMTOffset(measurement: BTMTMeasurement): BTMTResult {
  const selectedPlaque = measurement.plaqueConditions.find(
    (p) => p.index === measurement.selectedPlaqueIndex
  );

  if (!selectedPlaque) {
    return {
      offsetCelsius: measurement.offsetCelsius,
      selectedPlaqueIndex: measurement.selectedPlaqueIndex,
      confidence: 0.5,
    };
  }

  // Higher confidence if the selection is clearly the best (neighbors are worse)
  const selectedIdx = measurement.plaqueConditions.findIndex(
    (p) => p.index === measurement.selectedPlaqueIndex
  );
  const neighbors = measurement.plaqueConditions.filter(
    (_, i) => Math.abs(i - selectedIdx) === 1
  );
  const hasGoodNeighborContrast = neighbors.every((n) => n.condition !== "ideal");
  const confidence = hasGoodNeighborContrast ? 0.95 : 0.75;

  return {
    offsetCelsius: selectedPlaque.offsetCelsius,
    selectedPlaqueIndex: measurement.selectedPlaqueIndex,
    confidence,
  };
}

// ==================== Diagnostic Evaluation ====================

/**
 * Evaluate diagnostic test print results and determine which calibrations are needed.
 */
export function evaluateDiagnostic(grades: DiagnosticGrade[]): DiagnosticResult {
  const neededCalibrations: CalibrationProcedureType[] = [];

  for (const grade of grades) {
    if (grade.grade !== "pass" && grade.neededCalibration) {
      neededCalibrations.push(grade.neededCalibration);
    }
  }

  const failCount = grades.filter((g) => g.grade === "fail").length;
  const marginalCount = grades.filter((g) => g.grade === "marginal").length;

  let overallGrade: "pass" | "marginal" | "fail";
  if (failCount > 0) {
    overallGrade = "fail";
  } else if (marginalCount > 0) {
    overallGrade = "marginal";
  } else {
    overallGrade = "pass";
  }

  return {
    overallGrade,
    neededCalibrations: [...new Set(neededCalibrations)],
    grades,
  };
}

// ==================== Measurement Validation ====================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate measurement data before calculation.
 */
export function validateXYMeasurements(measurements: XYMeasurement[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (measurements.length === 0) {
    errors.push("No measurements provided");
    return { valid: false, errors, warnings };
  }

  if (measurements.length < 24) {
    warnings.push(`Expected 24 measurements, got ${measurements.length}`);
  }

  for (const m of measurements) {
    if (m.measuredMm <= 0) {
      errors.push(`Point ${m.pointIndex}: measured value must be positive`);
    }
    if (m.nominalMm <= 0) {
      errors.push(`Point ${m.pointIndex}: nominal value must be positive`);
    }
    const errorPercent = Math.abs((m.measuredMm - m.nominalMm) / m.nominalMm) * 100;
    if (errorPercent > 5) {
      warnings.push(
        `Point ${m.pointIndex} (${m.axis}): ${errorPercent.toFixed(1)}% deviation is unusually large`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateZMeasurements(measurements: ZMeasurement[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (measurements.length === 0) {
    errors.push("No measurements provided");
    return { valid: false, errors, warnings };
  }

  for (const m of measurements) {
    if (m.measuredMm <= 0) {
      errors.push(`Point ${m.pointIndex}: measured value must be positive`);
    }
    if (m.nominalMm <= 0) {
      errors.push(`Point ${m.pointIndex}: nominal value must be positive`);
    }
    const errorPercent = Math.abs((m.measuredMm - m.nominalMm) / m.nominalMm) * 100;
    if (errorPercent > 3) {
      warnings.push(
        `Point ${m.pointIndex}: ${errorPercent.toFixed(1)}% deviation exceeds typical Z tolerance (±1%)`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
