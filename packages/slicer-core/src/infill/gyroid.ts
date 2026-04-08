/**
 * Gyroid infill pattern generator.
 *
 * Approximates the gyroid minimal surface as intersecting sinusoidal waves.
 * The gyroid is a triply periodic minimal surface that creates an extremely
 * strong, isotropic structure. It distributes stress evenly in all directions
 * and provides excellent layer adhesion due to its continuously varying angle.
 *
 * For each layer:
 * - Even layers: x-varying sine curves: y = A * sin(2pi * x / period + phaseZ)
 * - Odd layers:  y-varying sine curves: x = A * sin(2pi * y / period + phaseZ)
 *
 * The phase shifts with Z height to create the 3D gyroid structure.
 */

import type { InfillBounds, InfillPath } from "./types";

const TWO_PI = 2 * Math.PI;
/** Number of sample points per period of the sine wave */
const SAMPLES_PER_PERIOD = 16;

export function generateGyroidInfill(
  bounds: InfillBounds,
  layerIndex: number,
  spacing: number,
  layerHeight: number,
  extrusionWidth: number,
): InfillPath[] {
  const paths: InfillPath[] = [];

  // Period of the sine wave (distance between crests), derived from spacing
  const period = Math.max(spacing * 2, extrusionWidth * 4);
  // Amplitude of the sine wave — half the spacing
  const amplitude = period * 0.4;

  // Phase offset based on Z height to create the 3D structure
  const z = layerIndex * layerHeight;
  const phaseZ = TWO_PI * z / period;

  // Step size for sampling the sine curve
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const span = layerIndex % 2 === 0 ? width : height;
  const numSamples = Math.max(
    Math.ceil((span / period) * SAMPLES_PER_PERIOD),
    8,
  );

  if (layerIndex % 2 === 0) {
    // Even layers: curves running along X axis
    // Generate multiple curves offset along Y
    for (let yOff = bounds.minY + spacing; yOff < bounds.maxY; yOff += spacing) {
      const path: InfillPath = [];
      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const x = bounds.minX + t * width;
        const y = yOff + amplitude * Math.sin(TWO_PI * x / period + phaseZ);

        // Clamp to bounds
        if (y >= bounds.minY && y <= bounds.maxY) {
          path.push({ x: r2(x), y: r2(y) });
        } else if (path.length > 1) {
          // Went outside bounds, end this path segment and start a new one
          paths.push(path.slice());
          path.length = 0;
        }
      }
      if (path.length > 1) {
        paths.push(path);
      }
    }
  } else {
    // Odd layers: curves running along Y axis
    for (let xOff = bounds.minX + spacing; xOff < bounds.maxX; xOff += spacing) {
      const path: InfillPath = [];
      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const y = bounds.minY + t * height;
        const x = xOff + amplitude * Math.sin(TWO_PI * y / period + phaseZ);

        if (x >= bounds.minX && x <= bounds.maxX) {
          path.push({ x: r2(x), y: r2(y) });
        } else if (path.length > 1) {
          paths.push(path.slice());
          path.length = 0;
        }
      }
      if (path.length > 1) {
        paths.push(path);
      }
    }
  }

  return paths;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
