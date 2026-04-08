/**
 * OpenSlicer Engine — WebGL Stencil Buffer Slicing
 *
 * Technique based on Formlabs' hackathon slicer (MIT):
 * Uses GPU stencil buffer to determine which pixels are "inside" the mesh
 * at each Z-height, producing layer masks for LCD/DLP resin printers.
 *
 * Algorithm:
 * 1. Set orthographic camera looking down at the build plate
 * 2. For each layer Z-height:
 *    a. Configure clipping planes to only show geometry at Z
 *    b. Render mesh: front-faces increment stencil, back-faces decrement
 *    c. Non-zero stencil = pixel is inside the model
 *    d. Read back pixels as layer mask
 */

import type { SliceConfig, BoundingBox } from "./types";

export interface SlicerEngineOptions {
  config: SliceConfig;
}

/**
 * Calculate the number of layers for a given model height and layer height.
 */
export function calculateLayerCount(modelHeight: number, layerHeight: number): number {
  return Math.ceil(modelHeight / layerHeight);
}

/**
 * Calculate the Z-height for a given layer index.
 */
export function getLayerZHeight(layerIndex: number, layerHeight: number): number {
  return (layerIndex + 0.5) * layerHeight;
}

/**
 * Determine the exposure time for a given layer.
 */
export function getLayerExposure(layerIndex: number, config: SliceConfig): number {
  return layerIndex < config.bottomLayers ? config.bottomExposureTime : config.exposureTime;
}

/**
 * Calculate mesh bounding box from vertices.
 */
export function calculateBoundingBox(vertices: Float32Array): BoundingBox {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (let i = 0; i < vertices.length; i += 3) {
    min.x = Math.min(min.x, vertices[i]);
    min.y = Math.min(min.y, vertices[i + 1]);
    min.z = Math.min(min.z, vertices[i + 2]);
    max.x = Math.max(max.x, vertices[i]);
    max.y = Math.max(max.y, vertices[i + 1]);
    max.z = Math.max(max.z, vertices[i + 2]);
  }

  return { min, max };
}

/**
 * Estimate print time based on layer count and config.
 */
export function estimatePrintTime(layerCount: number, config: SliceConfig): number {
  const bottomTime = config.bottomLayers * config.bottomExposureTime;
  const normalTime = (layerCount - config.bottomLayers) * config.exposureTime;
  const liftTime = layerCount * (config.liftHeight / config.liftSpeed * 60 + config.liftHeight / config.retractSpeed * 60);
  return bottomTime + normalTime + liftTime;
}

/**
 * Estimate volume from total non-zero pixels across all layers.
 */
export function estimateVolume(
  totalFilledPixels: number,
  pixelSize: number,
  layerHeight: number
): number {
  const pixelVolumeMm3 = pixelSize * pixelSize * layerHeight;
  const totalVolumeMm3 = totalFilledPixels * pixelVolumeMm3;
  return totalVolumeMm3 / 1000; // mm3 to ml (cm3)
}

/**
 * Create default slice configuration.
 */
export function createDefaultConfig(): SliceConfig {
  return {
    layerHeight: 0.05,
    bottomLayers: 6,
    exposureTime: 2.5,
    bottomExposureTime: 30,
    liftHeight: 6,
    liftSpeed: 65,
    retractSpeed: 150,
    antiAliasingLevel: 1,
    hollow: false,
    generateSupports: false,
  };
}
