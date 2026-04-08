import type { BatchParameterMatrix } from "./types";

export interface BatchCombination {
  index: number;
  label: string;
  params: Record<string, unknown>;
}

/**
 * Expand a parameter matrix into all combinations (cartesian product).
 * Max 200 combinations to prevent runaway.
 */
export function expandParameterMatrix(matrix: BatchParameterMatrix): BatchCombination[] {
  const axes: { key: string; values: unknown[] }[] = [];

  if (matrix.nozzleDiameters?.length) axes.push({ key: "nozzleDiameter", values: matrix.nozzleDiameters });
  if (matrix.layerHeights?.length) axes.push({ key: "layerHeight", values: matrix.layerHeights });
  if (matrix.infillDensities?.length) axes.push({ key: "infillDensity", values: matrix.infillDensities });
  if (matrix.materialIds?.length) axes.push({ key: "materialId", values: matrix.materialIds });
  if (matrix.exposureTimes?.length) axes.push({ key: "exposureTime", values: matrix.exposureTimes });
  if (matrix.liftSpeeds?.length) axes.push({ key: "liftSpeed", values: matrix.liftSpeeds });
  if (matrix.laserPowers?.length) axes.push({ key: "laserPower", values: matrix.laserPowers });
  if (matrix.scanSpeeds?.length) axes.push({ key: "scanSpeed", values: matrix.scanSpeeds });
  if (matrix.profileIds?.length) axes.push({ key: "profileId", values: matrix.profileIds });
  if (matrix.printerIds?.length) axes.push({ key: "printerId", values: matrix.printerIds });

  if (axes.length === 0) return [];

  const totalCombinations = axes.reduce((acc, axis) => acc * axis.values.length, 1);
  if (totalCombinations > 200) {
    throw new Error(`Parameter matrix produces ${totalCombinations} combinations (max 200)`);
  }

  const combinations: BatchCombination[] = [];

  function generate(axisIndex: number, current: Record<string, unknown>) {
    if (axisIndex === axes.length) {
      const label = axes.map((a) => `${a.key}=${current[a.key]}`).join(", ");
      combinations.push({
        index: combinations.length,
        label,
        params: { ...current },
      });
      return;
    }
    const axis = axes[axisIndex];
    for (const value of axis.values) {
      generate(axisIndex + 1, { ...current, [axis.key]: value });
    }
  }

  generate(0, {});
  return combinations;
}

/**
 * Count how many combinations a parameter matrix would produce.
 */
export function countCombinations(matrix: BatchParameterMatrix): number {
  let count = 1;
  if (matrix.nozzleDiameters?.length) count *= matrix.nozzleDiameters.length;
  if (matrix.layerHeights?.length) count *= matrix.layerHeights.length;
  if (matrix.infillDensities?.length) count *= matrix.infillDensities.length;
  if (matrix.materialIds?.length) count *= matrix.materialIds.length;
  if (matrix.exposureTimes?.length) count *= matrix.exposureTimes.length;
  if (matrix.liftSpeeds?.length) count *= matrix.liftSpeeds.length;
  if (matrix.laserPowers?.length) count *= matrix.laserPowers.length;
  if (matrix.scanSpeeds?.length) count *= matrix.scanSpeeds.length;
  if (matrix.profileIds?.length) count *= matrix.profileIds.length;
  if (matrix.printerIds?.length) count *= matrix.printerIds.length;
  return count;
}
