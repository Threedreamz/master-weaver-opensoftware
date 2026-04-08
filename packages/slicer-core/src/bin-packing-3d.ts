/**
 * 3D bin packing for SLS build volumes.
 * Uses a shelf/layer-based heuristic.
 */

export interface PackingItem {
  id: string;
  width: number;   // X dimension in mm
  depth: number;    // Y dimension in mm
  height: number;   // Z dimension in mm
  quantity: number;
}

export interface PackedItem {
  id: string;
  instanceIndex: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // degrees (0 for SLS)
  dimensions: { width: number; depth: number; height: number };
}

export interface PackingResult {
  packed: PackedItem[];
  unpacked: string[];     // IDs that didn't fit
  utilizationPercent: number;
  totalPackedVolume: number;  // mm3
  buildVolume: number;        // mm3
  layerCount: number;
}

export interface PackingOptions {
  gap?: number;           // mm between parts (default: 3mm for SLS)
  maxLayers?: number;     // Maximum number of layers to fill
}

/**
 * Pack items into a build volume using shelf/layer heuristic.
 * Good enough for SLS (parts are self-supporting, no orientation constraints).
 */
export function pack3D(
  items: PackingItem[],
  buildVolume: { x: number; y: number; z: number },
  options: PackingOptions = {}
): PackingResult {
  const gap = options.gap ?? 3;
  const maxLayers = options.maxLayers ?? 100;

  // Expand items by quantity and sort by height descending (tallest first)
  const expanded: Array<{ id: string; instanceIndex: number; w: number; d: number; h: number }> = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      expanded.push({
        id: item.id,
        instanceIndex: i,
        w: item.width,
        d: item.depth,
        h: item.height,
      });
    }
  }

  expanded.sort((a, b) => b.h - a.h);

  const packed: PackedItem[] = [];
  const unpacked: string[] = [];
  const layers: Array<{ z: number; height: number; shelves: Shelf[] }> = [];
  let currentZ = 0;

  for (const item of expanded) {
    // Check if item fits in build volume at all
    if (item.w + gap > buildVolume.x || item.d + gap > buildVolume.y || item.h > buildVolume.z) {
      unpacked.push(item.id);
      continue;
    }

    let placed = false;

    // Try to fit in existing layers
    for (const layer of layers) {
      if (item.h > layer.height) continue; // Too tall for this layer

      for (const shelf of layer.shelves) {
        const pos = tryPlaceOnShelf(shelf, item.w, item.d, gap, buildVolume.x);
        if (pos) {
          packed.push({
            id: item.id,
            instanceIndex: item.instanceIndex,
            position: { x: pos.x, y: pos.y, z: layer.z },
            rotation: { x: 0, y: 0, z: 0 },
            dimensions: { width: item.w, depth: item.d, height: item.h },
          });
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Try new shelf in this layer
        const lastShelf = layer.shelves[layer.shelves.length - 1];
        const shelfY = lastShelf ? lastShelf.y + lastShelf.depth + gap : 0;
        if (shelfY + item.d + gap <= buildVolume.y) {
          const newShelf: Shelf = { y: shelfY, depth: item.d, nextX: 0 };
          layer.shelves.push(newShelf);
          const pos = tryPlaceOnShelf(newShelf, item.w, item.d, gap, buildVolume.x);
          if (pos) {
            packed.push({
              id: item.id,
              instanceIndex: item.instanceIndex,
              position: { x: pos.x, y: pos.y, z: layer.z },
              rotation: { x: 0, y: 0, z: 0 },
              dimensions: { width: item.w, depth: item.d, height: item.h },
            });
            placed = true;
          }
        }
      }

      if (placed) break;
    }

    // New layer
    if (!placed) {
      if (currentZ + item.h + gap > buildVolume.z || layers.length >= maxLayers) {
        unpacked.push(item.id);
        continue;
      }

      const newLayer = {
        z: currentZ,
        height: item.h,
        shelves: [{ y: 0, depth: item.d, nextX: 0 } as Shelf],
      };
      layers.push(newLayer);

      const pos = tryPlaceOnShelf(newLayer.shelves[0], item.w, item.d, gap, buildVolume.x);
      if (pos) {
        packed.push({
          id: item.id,
          instanceIndex: item.instanceIndex,
          position: { x: pos.x, y: pos.y, z: currentZ },
          rotation: { x: 0, y: 0, z: 0 },
          dimensions: { width: item.w, depth: item.d, height: item.h },
        });
        currentZ += item.h + gap;
      } else {
        unpacked.push(item.id);
      }
    }
  }

  // Calculate utilization
  const buildVolumeTotal = buildVolume.x * buildVolume.y * buildVolume.z;
  const totalPackedVolume = packed.reduce(
    (sum, p) => sum + p.dimensions.width * p.dimensions.depth * p.dimensions.height,
    0
  );
  const utilizationPercent = buildVolumeTotal > 0
    ? Math.round((totalPackedVolume / buildVolumeTotal) * 10000) / 100
    : 0;

  return {
    packed,
    unpacked: [...new Set(unpacked)],
    utilizationPercent,
    totalPackedVolume,
    buildVolume: buildVolumeTotal,
    layerCount: layers.length,
  };
}

/**
 * Estimate SLS print time based on packed volume height.
 */
export function estimateSLSPrintTime(
  totalHeight: number,
  layerHeight: number = 0.1
): number {
  // Rough SLS estimate: ~15 seconds per layer (recoat + scan)
  const layers = Math.ceil(totalHeight / layerHeight);
  return layers * 15; // seconds
}

/**
 * Estimate material cost.
 */
export function estimateMaterialCost(
  volumeMm3: number,
  materialDensity: number = 1.01,  // g/cm3 (PA12)
  costPerKg: number = 50            // EUR/kg
): number {
  const volumeCm3 = volumeMm3 / 1000;
  const weightKg = (volumeCm3 * materialDensity) / 1000;
  return Math.round(weightKg * costPerKg * 100) / 100;
}

// ==================== Internal Types ====================

interface Shelf {
  y: number;
  depth: number;
  nextX: number;
}

function tryPlaceOnShelf(
  shelf: Shelf,
  itemWidth: number,
  itemDepth: number,
  gap: number,
  maxX: number
): { x: number; y: number } | null {
  const x = shelf.nextX + (shelf.nextX > 0 ? gap : 0);
  if (x + itemWidth > maxX) return null;
  if (itemDepth > shelf.depth + gap) return null;

  shelf.nextX = x + itemWidth;
  return { x, y: shelf.y };
}
