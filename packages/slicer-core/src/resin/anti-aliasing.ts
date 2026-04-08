/**
 * Anti-aliasing for resin layer masks.
 *
 * Applies edge detection and grayscale smoothing to reduce
 * stairstepping on printed surfaces. Works by detecting edge pixels
 * (boundary between filled and empty) and applying sub-pixel coverage
 * as grayscale values.
 */

/**
 * Apply anti-aliasing to a layer mask (grayscale Uint8Array).
 * Edge pixels get intermediate gray values based on neighbor coverage.
 *
 * @param pixels - Raw pixel data (grayscale, 0 or 255)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param level - AA level (1 = off, 2-8 = smoothing levels)
 * @returns Modified pixel data with anti-aliased edges
 */
export function applyAntiAliasing(
  pixels: Uint8Array,
  width: number,
  height: number,
  level: number
): Uint8Array {
  if (level <= 1) return pixels;

  const result = new Uint8Array(pixels.length);
  result.set(pixels);

  const steps = Math.min(level, 8);
  const stepSize = 255 / steps;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const current = pixels[idx];

      // Only process edge pixels
      if (current === 0 || current === 255) {
        // Count filled neighbors in 3x3 kernel
        let filledNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ni = (y + dy) * width + (x + dx);
            if (pixels[ni] > 127) filledNeighbors++;
          }
        }

        // If this is an edge pixel (has both filled and empty neighbors)
        if (filledNeighbors > 0 && filledNeighbors < 8) {
          // Calculate sub-pixel coverage
          const coverage = filledNeighbors / 8;
          result[idx] = Math.round(coverage * steps) * stepSize;
        }
      }
    }
  }

  return result;
}

/**
 * Detect edge pixels in a layer mask.
 * Returns a boolean array where true = edge pixel.
 */
export function detectEdges(
  pixels: Uint8Array,
  width: number,
  height: number
): boolean[] {
  const edges = new Array(pixels.length).fill(false);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const current = pixels[idx] > 127;

      // Check 4-connected neighbors
      const neighbors = [
        pixels[(y - 1) * width + x] > 127,
        pixels[(y + 1) * width + x] > 127,
        pixels[y * width + (x - 1)] > 127,
        pixels[y * width + (x + 1)] > 127,
      ];

      // Edge if current differs from any neighbor
      if (neighbors.some((n) => n !== current)) {
        edges[idx] = true;
      }
    }
  }

  return edges;
}
