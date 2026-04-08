import {
  type FilamentLibrary,
  type IntensityChannels,
  type LithoConfig,
  type LuminanceConfig,
  LayerType,
} from './types';

const EPSILON = 1e-2;

/**
 * Convert a hex color string to RGB tuple [0-255].
 */
export function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length !== 6) {
    throw new Error(`Invalid hex color code: #${hex}. Must be 3 or 6 characters long.`);
  }
  return [
    Math.max(parseInt(hex.slice(0, 2), 16), 0),
    Math.max(parseInt(hex.slice(2, 4), 16), 0),
    Math.max(parseInt(hex.slice(4, 6), 16), 0),
  ];
}

/**
 * Calculate CMYK layer thicknesses for a single pixel using Beer-Lambert law.
 *
 * Ported from Python `calculate_color_thicknesses` + `calculate_exact_thicknesses`.
 * Uses CMYK decomposition, then maps each channel to a physical filament thickness
 * via Beer-Lambert: thickness = -ln(1 - channel) * transmissionDistance * scale * darkBoost
 */
export function calculateColorThicknesses(
  r: number,
  g: number,
  b: number,
  filaments: FilamentLibrary,
  luminanceConfig: LuminanceConfig,
): { c: number; m: number; y: number; w: number } {
  // Normalize to 0-1
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  // RGB → CMYK decomposition
  const k = 1 - Math.max(rn, gn, bn);
  const denom = 1 - k + EPSILON;
  const c = (1 - rn - k) / denom;
  const m = (1 - gn - k) / denom;
  const y = (1 - bn - k) / denom;

  // Darkness boost: darker pixels get thicker layers
  const darkBoost = 1 + k * 0.3;
  const cymScale = luminanceConfig.cymTargetThickness;
  const wScale = luminanceConfig.whiteTargetThickness;

  // Filament transmission distances (physical property)
  const cDist = filaments[LayerType.CYAN].transmissionDistance;
  const mDist = filaments[LayerType.MAGENTA].transmissionDistance;
  const yDist = filaments[LayerType.YELLOW].transmissionDistance;
  const wDist = filaments[LayerType.WHITE].transmissionDistance;

  // Beer-Lambert: thickness = -ln(transmission) * distance * scale * boost
  // Clamp to [0, transmissionDistance]
  return {
    c: Math.min(-Math.log(Math.max(1 - c, EPSILON)) * cDist * cymScale * darkBoost, cDist),
    m: Math.min(-Math.log(Math.max(1 - m, EPSILON)) * mDist * cymScale * darkBoost, mDist),
    y: Math.min(-Math.log(Math.max(1 - y, EPSILON)) * yDist * cymScale * darkBoost, yDist),
    w: Math.min(-Math.log(Math.max(1 - k, EPSILON)) * wDist * wScale * darkBoost, wDist),
  };
}

/**
 * Extract CMYK intensity channels from an entire RGBA image using luminance-based
 * Beer-Lambert color mixing.
 *
 * VECTORIZED: processes all pixels in a single flat loop over TypedArrays instead of
 * the Python O(n^2) nested-loop approach with per-pixel function calls.
 */
export function extractChannelsLuminance(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  config: LithoConfig,
): IntensityChannels {
  const pixelCount = width * height;
  const cChannel = new Float32Array(pixelCount);
  const mChannel = new Float32Array(pixelCount);
  const yChannel = new Float32Array(pixelCount);
  const wChannel = new Float32Array(pixelCount);

  const { filaments, luminanceConfig } = config;
  const cDist = filaments[LayerType.CYAN].transmissionDistance;
  const mDist = filaments[LayerType.MAGENTA].transmissionDistance;
  const yDist = filaments[LayerType.YELLOW].transmissionDistance;
  const wDist = filaments[LayerType.WHITE].transmissionDistance;
  const cymScale = luminanceConfig.cymTargetThickness;
  const wScale = luminanceConfig.whiteTargetThickness;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4; // RGBA stride
    const rn = imageData[idx]! / 255;
    const gn = imageData[idx + 1]! / 255;
    const bn = imageData[idx + 2]! / 255;

    const k = 1 - Math.max(rn, gn, bn);
    const denom = 1 - k + EPSILON;
    const c = (1 - rn - k) / denom;
    const m = (1 - gn - k) / denom;
    const y = (1 - bn - k) / denom;
    const darkBoost = 1 + k * 0.3;

    cChannel[i] = Math.min(-Math.log(Math.max(1 - c, EPSILON)) * cDist * cymScale * darkBoost, cDist);
    mChannel[i] = Math.min(-Math.log(Math.max(1 - m, EPSILON)) * mDist * cymScale * darkBoost, mDist);
    yChannel[i] = Math.min(-Math.log(Math.max(1 - y, EPSILON)) * yDist * cymScale * darkBoost, yDist);
    wChannel[i] = Math.min(-Math.log(Math.max(1 - k, EPSILON)) * wDist * wScale * darkBoost, wDist);
  }

  return { cChannel, mChannel, yChannel, wChannel, width, height };
}

/**
 * Linear thickness mapping: intensity 0 (black) = maxDistance, intensity 255 (white) = minThickness.
 * Ported from Python `normalize_thickness_linear`.
 */
function normalizeThicknessLinear(
  intensity: number,
  maxDistance: number,
  minThickness: number,
): number {
  const normalized = intensity / 255;
  return (1 - normalized) * (maxDistance - minThickness) + minThickness;
}

/**
 * Extract CMYK intensity channels using simple linear mapping.
 *
 * Ported from Python `extract_and_invert_channels_linear`.
 * - R channel -> cyan thickness
 * - G channel -> yellow thickness (note: Python maps G to yellow, not magenta)
 * - B channel -> magenta thickness
 * - Average RGB -> white/intensity thickness
 *
 * VECTORIZED: single pass over all pixels.
 */
export function extractChannelsLinear(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  config: LithoConfig,
): IntensityChannels {
  const pixelCount = width * height;
  const cChannel = new Float32Array(pixelCount);
  const mChannel = new Float32Array(pixelCount);
  const yChannel = new Float32Array(pixelCount);
  const wChannel = new Float32Array(pixelCount);

  const { filaments, intensityMinHeight } = config;
  const cDist = filaments[LayerType.CYAN].transmissionDistance;
  const mDist = filaments[LayerType.MAGENTA].transmissionDistance;
  const yDist = filaments[LayerType.YELLOW].transmissionDistance;
  const wDist = filaments[LayerType.WHITE].transmissionDistance;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4; // RGBA stride
    const r = imageData[idx]!;
    const g = imageData[idx + 1]!;
    const b = imageData[idx + 2]!;

    // R -> cyan, G -> yellow, B -> magenta (matching Python mapping)
    cChannel[i] = normalizeThicknessLinear(r, cDist, 0);
    yChannel[i] = normalizeThicknessLinear(g, yDist, 0);
    mChannel[i] = normalizeThicknessLinear(b, mDist, 0);

    // Average intensity -> white layer (with minimum height)
    const avg = (r + g + b) / 3;
    wChannel[i] = normalizeThicknessLinear(avg, wDist, intensityMinHeight);
  }

  return { cChannel, mChannel, yChannel, wChannel, width, height };
}
