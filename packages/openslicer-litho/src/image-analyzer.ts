export interface PixelatedImage {
  /** RGBA pixel data at reduced resolution */
  data: Uint8ClampedArray;
  /** Reduced width (number of blocks horizontally) */
  width: number;
  /** Reduced height (number of blocks vertically) */
  height: number;
  /** Original image width in pixels */
  originalWidth: number;
  /** Original image height in pixels */
  originalHeight: number;
}

/**
 * Calculate the block size needed to achieve a target physical width.
 *
 * @param imageWidth - Original image width in pixels
 * @param targetWidthMm - Desired lithophane width in mm
 * @param pixelSizeMm - Size of each output pixel in mm
 * @returns Block size (pixels per block)
 */
export function calculateBlockSize(
  imageWidth: number,
  targetWidthMm: number,
  pixelSizeMm: number,
): number {
  const targetPixels = Math.round(targetWidthMm / pixelSizeMm);
  if (targetPixels <= 0) return 1;
  const blockSize = Math.max(1, Math.round(imageWidth / targetPixels));
  return blockSize;
}

/**
 * Pixelate an RGBA image by averaging blocks of pixels.
 *
 * Each block of `blockSize x blockSize` pixels is averaged to produce a single output pixel.
 * The output is an RGBA Uint8ClampedArray at the reduced resolution.
 *
 * Ported from Python `ImageAnalyzer.pixelate` but operates on raw pixel data
 * instead of cv2 (no native dependency needed).
 *
 * @param imageData - Source RGBA pixel data (4 bytes per pixel)
 * @param srcWidth - Source image width
 * @param srcHeight - Source image height
 * @param blockSize - Number of source pixels per output pixel (must be >= 1)
 * @returns Pixelated image with reduced dimensions
 */
export function pixelate(
  imageData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  blockSize: number,
): PixelatedImage {
  if (blockSize <= 0) throw new Error('Block size must be positive');
  if (blockSize > Math.min(srcWidth, srcHeight)) {
    throw new Error('Block size too large for image dimensions');
  }

  const outWidth = Math.floor(srcWidth / blockSize);
  const outHeight = Math.floor(srcHeight / blockSize);
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);

  const blockArea = blockSize * blockSize;

  for (let by = 0; by < outHeight; by++) {
    for (let bx = 0; bx < outWidth; bx++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;

      // Average all pixels in this block
      const startY = by * blockSize;
      const startX = bx * blockSize;
      for (let dy = 0; dy < blockSize; dy++) {
        const rowOffset = (startY + dy) * srcWidth * 4;
        for (let dx = 0; dx < blockSize; dx++) {
          const srcIdx = rowOffset + (startX + dx) * 4;
          rSum += imageData[srcIdx]!;
          gSum += imageData[srcIdx + 1]!;
          bSum += imageData[srcIdx + 2]!;
          aSum += imageData[srcIdx + 3]!;
        }
      }

      const outIdx = (by * outWidth + bx) * 4;
      out[outIdx] = Math.round(rSum / blockArea);
      out[outIdx + 1] = Math.round(gSum / blockArea);
      out[outIdx + 2] = Math.round(bSum / blockArea);
      out[outIdx + 3] = Math.round(aSum / blockArea);
    }
  }

  return {
    data: out,
    width: outWidth,
    height: outHeight,
    originalWidth: srcWidth,
    originalHeight: srcHeight,
  };
}
