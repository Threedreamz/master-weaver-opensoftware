import {
  type IntensityChannels,
  type LithoConfig,
  type LithoMesh,
  type LithoResult,
  ColorCorrection,
  LayerType,
} from './types';
import { extractChannelsLinear, extractChannelsLuminance } from './color-mixing';

/**
 * 12 triangles per voxel (box): 2 per face, 6 faces.
 * Vertex indices reference 8 corners of each box:
 *   0-3 = bottom (z = previousHeight), 4-7 = top (z = nextHeight)
 *   Layout: 0=front-left, 1=front-right, 2=back-right, 3=back-left (same for 4-7 on top)
 */
const FACE_TEMPLATE: ReadonlyArray<readonly [number, number, number]> = [
  [0, 2, 1], [0, 3, 2],  // bottom
  [4, 5, 6], [4, 6, 7],  // top
  [0, 1, 5], [0, 5, 4],  // front
  [2, 3, 7], [2, 7, 6],  // back
  [0, 4, 7], [0, 7, 3],  // left
  [1, 2, 6], [1, 6, 5],  // right
];

const TRIANGLES_PER_VOXEL = FACE_TEMPLATE.length; // 12
const VERTICES_PER_VOXEL = 8;

/**
 * Create a mesh for a single layer of the lithophane.
 *
 * Each pixel in the height map becomes a box (8 vertices, 12 triangles).
 * Ported from Python `create_layer_mesh` in to_stl.py.
 *
 * @param heightMap - Per-pixel layer thickness (row-major, height x width)
 * @param width - Number of pixels horizontally
 * @param height - Number of pixels vertically
 * @param pixelSize - Physical size of each pixel in mm
 * @param previousHeights - Z-offset for the bottom of each voxel (null = ground level)
 * @param options - Additional mesh generation options
 * @returns The mesh and the cumulative heights for stacking subsequent layers
 */
export function createLayerMesh(
  heightMap: Float32Array,
  width: number,
  height: number,
  pixelSize: number,
  previousHeights: Float32Array | null,
  options?: {
    heightStepMm?: number;
    minHeight?: number;
    flatTop?: boolean;
    faceUp?: boolean;
  },
): { mesh: LithoMesh; nextHeights: Float32Array } {
  const pixelCount = width * height;
  const heightStepMm = options?.heightStepMm ?? 0;
  const minHeight = options?.minHeight ?? 0;
  const flatTop = options?.flatTop ?? false;
  const faceUp = options?.faceUp ?? false;

  // Resolve previous heights
  const prevH = previousHeights ?? new Float32Array(pixelCount);

  // Compute effective z (layer thickness after quantization)
  const z = new Float32Array(pixelCount);
  if (flatTop) {
    // Flat top: all voxels rise to the same total height
    let maxPrev = 0;
    for (let i = 0; i < pixelCount; i++) {
      if (prevH[i]! > maxPrev) maxPrev = prevH[i]!;
    }
    const targetZ = maxPrev + minHeight;
    for (let i = 0; i < pixelCount; i++) {
      z[i] = targetZ - prevH[i]!;
    }
  } else {
    for (let i = 0; i < pixelCount; i++) {
      let h = heightMap[i]!;
      if (heightStepMm > 0) {
        h = Math.round(h / heightStepMm) * heightStepMm;
      }
      z[i] = Math.max(h, minHeight);
    }
  }

  // Cumulative heights for next layer
  const nextHeights = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    nextHeights[i] = z[i]! + prevH[i]!;
  }

  // Total width for face-up mirroring
  const totalWidth = width * pixelSize;

  // Allocate buffers
  const posCount = pixelCount * VERTICES_PER_VOXEL * 3;
  const idxCount = pixelCount * TRIANGLES_PER_VOXEL * 3;
  const positions = new Float32Array(posCount);
  const indices = new Uint32Array(idxCount);

  // Build per-voxel geometry
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const pi = row * width + col;
      const botZ = prevH[pi]!;
      const topZ = nextHeights[pi]!;

      let x0 = col * pixelSize;
      let x1 = (col + 1) * pixelSize;
      const y0 = row * pixelSize;
      const y1 = (row + 1) * pixelSize;

      // Mirror X for face-up orientation (matching Python behavior)
      if (faceUp) {
        const tmp = totalWidth - x0;
        x0 = totalWidth - x1;
        x1 = tmp;
      }

      const vBase = pi * VERTICES_PER_VOXEL * 3;
      // Bottom 4 vertices: 0=front-left, 1=front-right, 2=back-right, 3=back-left
      positions[vBase + 0] = x0; positions[vBase + 1] = y0; positions[vBase + 2] = botZ;
      positions[vBase + 3] = x1; positions[vBase + 4] = y0; positions[vBase + 5] = botZ;
      positions[vBase + 6] = x1; positions[vBase + 7] = y1; positions[vBase + 8] = botZ;
      positions[vBase + 9] = x0; positions[vBase + 10] = y1; positions[vBase + 11] = botZ;
      // Top 4 vertices
      positions[vBase + 12] = x0; positions[vBase + 13] = y0; positions[vBase + 14] = topZ;
      positions[vBase + 15] = x1; positions[vBase + 16] = y0; positions[vBase + 17] = topZ;
      positions[vBase + 18] = x1; positions[vBase + 19] = y1; positions[vBase + 20] = topZ;
      positions[vBase + 21] = x0; positions[vBase + 22] = y1; positions[vBase + 23] = topZ;

      // Indices: offset each face template by the voxel's vertex base
      const iBase = pi * TRIANGLES_PER_VOXEL * 3;
      const vOffset = pi * VERTICES_PER_VOXEL;
      for (let f = 0; f < TRIANGLES_PER_VOXEL; f++) {
        const face = FACE_TEMPLATE[f]!;
        indices[iBase + f * 3 + 0] = vOffset + face[0];
        indices[iBase + f * 3 + 1] = vOffset + face[1];
        indices[iBase + f * 3 + 2] = vOffset + face[2];
      }
    }
  }

  // Compute per-face normals, stored per-vertex of each triangle
  const normals = new Float32Array(posCount);
  for (let t = 0; t < idxCount; t += 3) {
    const i0 = indices[t]! * 3;
    const i1 = indices[t + 1]! * 3;
    const i2 = indices[t + 2]! * 3;

    // Edge vectors
    const e1x = positions[i1]! - positions[i0]!;
    const e1y = positions[i1 + 1]! - positions[i0 + 1]!;
    const e1z = positions[i1 + 2]! - positions[i0 + 2]!;
    const e2x = positions[i2]! - positions[i0]!;
    const e2y = positions[i2 + 1]! - positions[i0 + 1]!;
    const e2z = positions[i2 + 2]! - positions[i0 + 2]!;

    // Cross product
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;

    // Normalize
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    } else {
      nx = 0;
      ny = 0;
      nz = 1;
    }

    // Assign to all 3 vertices of this triangle (flat shading)
    // Note: normals are stored per-vertex-index-position, matching the positions array.
    // For shared vertices we just overwrite (last write wins), which is acceptable
    // for flat-shaded voxel geometry.
    for (let v = 0; v < 3; v++) {
      const vi = indices[t + v]! * 3;
      normals[vi] = nx;
      normals[vi + 1] = ny;
      normals[vi + 2] = nz;
    }
  }

  return {
    mesh: { positions, normals, indices },
    nextHeights,
  };
}

/**
 * Create the solid base plate mesh.
 * Ported from Python `create_base_plate`.
 */
export function createBasePlate(
  width: number,
  height: number,
  config: LithoConfig,
): LithoMesh {
  const pixelCount = width * height;
  const heightMap = new Float32Array(pixelCount).fill(config.baseHeight);
  const { mesh } = createLayerMesh(heightMap, width, height, config.pixelSize, null, {
    heightStepMm: config.heightStepMm,
    faceUp: config.faceUp,
  });
  return mesh;
}

/**
 * Generate a complete multi-layer CMYK lithophane from image data.
 *
 * Ported from Python `to_stl_cym`. Layer stacking order:
 *   base plate -> cyan -> yellow -> magenta -> white
 * Each layer sits on top of the previous one.
 *
 * @param imageData - RGBA pixel data (Uint8ClampedArray, 4 bytes per pixel)
 * @param imageWidth - Image width in pixels
 * @param imageHeight - Image height in pixels
 * @param config - Lithophane configuration
 * @returns All 5 meshes plus dimensions
 */
export function generateLithophane(
  imageData: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  config: LithoConfig,
): LithoResult {
  // Extract intensity channels based on color correction mode
  const channels =
    config.colorCorrection === ColorCorrection.LUMINANCE
      ? extractChannelsLuminance(imageData, imageWidth, imageHeight, config)
      : extractChannelsLinear(imageData, imageWidth, imageHeight, config);

  const pixelCount = imageWidth * imageHeight;

  // Base plate
  const baseMesh = createBasePlate(imageWidth, imageHeight, config);
  let prevHeights = new Float32Array(pixelCount).fill(config.baseHeight);

  // Cyan layer
  const cyanResult = createLayerMesh(channels.cChannel, imageWidth, imageHeight, config.pixelSize, prevHeights, {
    heightStepMm: config.heightStepMm,
    faceUp: config.faceUp,
  });
  prevHeights = cyanResult.nextHeights;

  // Yellow layer
  const yellowResult = createLayerMesh(channels.yChannel, imageWidth, imageHeight, config.pixelSize, prevHeights, {
    heightStepMm: config.heightStepMm,
    faceUp: config.faceUp,
  });
  prevHeights = yellowResult.nextHeights;

  // Magenta layer
  const magentaResult = createLayerMesh(channels.mChannel, imageWidth, imageHeight, config.pixelSize, prevHeights, {
    heightStepMm: config.heightStepMm,
    faceUp: config.faceUp,
  });
  prevHeights = magentaResult.nextHeights;

  // White/intensity layer (with minimum height)
  const whiteResult = createLayerMesh(channels.wChannel, imageWidth, imageHeight, config.pixelSize, prevHeights, {
    heightStepMm: config.heightStepMm,
    minHeight: config.intensityMinHeight,
    faceUp: config.faceUp,
  });

  return {
    baseMesh,
    cyanMesh: cyanResult.mesh,
    yellowMesh: yellowResult.mesh,
    magentaMesh: magentaResult.mesh,
    whiteMesh: whiteResult.mesh,
    width: imageWidth,
    height: imageHeight,
  };
}

/**
 * Convert a LithoMesh to binary STL format.
 *
 * Binary STL format:
 *   80 bytes header + 4 bytes triangle count + (50 bytes per triangle)
 *   Each triangle: 12 bytes normal + 36 bytes vertices (3x3 floats) + 2 bytes attribute
 */
export function meshToSTLBinary(mesh: LithoMesh): ArrayBuffer {
  const triangleCount = mesh.indices.length / 3;
  const bufferSize = 80 + 4 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // 80-byte header (zeros)
  let offset = 80;

  // Triangle count
  view.setUint32(offset, triangleCount, true);
  offset += 4;

  for (let t = 0; t < triangleCount; t++) {
    const i0 = mesh.indices[t * 3]!;
    const i1 = mesh.indices[t * 3 + 1]!;
    const i2 = mesh.indices[t * 3 + 2]!;

    // Compute face normal from vertex positions
    const p0x = mesh.positions[i0 * 3]!;
    const p0y = mesh.positions[i0 * 3 + 1]!;
    const p0z = mesh.positions[i0 * 3 + 2]!;
    const p1x = mesh.positions[i1 * 3]!;
    const p1y = mesh.positions[i1 * 3 + 1]!;
    const p1z = mesh.positions[i1 * 3 + 2]!;
    const p2x = mesh.positions[i2 * 3]!;
    const p2y = mesh.positions[i2 * 3 + 1]!;
    const p2z = mesh.positions[i2 * 3 + 2]!;

    const e1x = p1x - p0x, e1y = p1y - p0y, e1z = p1z - p0z;
    const e2x = p2x - p0x, e2y = p2y - p0y, e2z = p2z - p0z;
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) { nx /= len; ny /= len; nz /= len; }

    // Normal
    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    // Vertex 0
    view.setFloat32(offset, p0x, true); offset += 4;
    view.setFloat32(offset, p0y, true); offset += 4;
    view.setFloat32(offset, p0z, true); offset += 4;

    // Vertex 1
    view.setFloat32(offset, p1x, true); offset += 4;
    view.setFloat32(offset, p1y, true); offset += 4;
    view.setFloat32(offset, p1z, true); offset += 4;

    // Vertex 2
    view.setFloat32(offset, p2x, true); offset += 4;
    view.setFloat32(offset, p2y, true); offset += 4;
    view.setFloat32(offset, p2z, true); offset += 4;

    // Attribute byte count (unused)
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}
