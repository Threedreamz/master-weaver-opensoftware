import type { SlicerModel } from "../stores/slicer-store";

const GAP = 10; // mm gap between models

interface BBox {
  w: number;
  h: number;
}

/**
 * Simple 2D row-based bin packing.
 * Sorts models by bounding box area (largest first), then places them
 * left-to-right in rows, wrapping to the next row when exceeding bed width.
 * Returns a Map of modelId -> [x, y, z] position.
 */
export function arrangeModels2D(
  models: SlicerModel[],
  bedWidth: number,
  bedDepth: number
): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>();

  // Build bbox list with model refs
  const items: { model: SlicerModel; bbox: BBox }[] = models.map((m) => {
    const scaleX = Math.abs(m.scale?.[0] ?? 1);
    const scaleY = Math.abs(m.scale?.[1] ?? 1);
    const w = (m.boundingBox?.x ?? 30) * scaleX;
    const h = (m.boundingBox?.y ?? 30) * scaleY;
    return { model: m, bbox: { w, h } };
  });

  // Sort by area descending (largest first for better packing)
  items.sort((a, b) => b.bbox.w * b.bbox.h - a.bbox.w * a.bbox.h);

  let cursorX = GAP;
  let cursorY = GAP;
  let rowHeight = 0;

  for (const { model, bbox } of items) {
    // Wrap to next row if this model doesn't fit
    if (cursorX + bbox.w + GAP > bedWidth && cursorX > GAP) {
      cursorX = GAP;
      cursorY += rowHeight + GAP;
      rowHeight = 0;
    }

    // Place model — center of bounding box at cursor position
    const x = cursorX + bbox.w / 2;
    const y = cursorY + bbox.h / 2;
    positions.set(model.id, [x, y, model.position?.[2] ?? 0]);

    cursorX += bbox.w + GAP;
    rowHeight = Math.max(rowHeight, bbox.h);
  }

  return positions;
}
