import { type FilamentLibrary, type LithoResult, LayerType } from './types';

/**
 * A material definition for 3MF multi-material assembly.
 */
export interface Material3MF {
  name: string;
  color: string;
}

/**
 * A single model/part in the 3MF assembly.
 */
export interface Model3MF {
  name: string;
  vertices: Float32Array;
  triangles: Uint32Array;
  materialIndex: number;
}

/**
 * Complete 3MF assembly structure with materials and models.
 */
export interface Assembly3MF {
  materials: Material3MF[];
  models: Model3MF[];
}

/**
 * Combine the 5 lithophane meshes (base + CMYW) into a multi-material 3MF assembly structure.
 *
 * This produces the data structure needed to write a 3MF file with per-part material assignments.
 * The actual 3MF XML serialization is left to the consumer (e.g., openslicer package).
 *
 * Layer order (bottom to top): base (white), cyan, yellow, magenta, white
 */
export function assembleLithophane3MF(
  result: LithoResult,
  filaments: FilamentLibrary,
): Assembly3MF {
  const materials: Material3MF[] = [
    { name: filaments[LayerType.WHITE].name, color: filaments[LayerType.WHITE].hex },
    { name: filaments[LayerType.CYAN].name, color: filaments[LayerType.CYAN].hex },
    { name: filaments[LayerType.YELLOW].name, color: filaments[LayerType.YELLOW].hex },
    { name: filaments[LayerType.MAGENTA].name, color: filaments[LayerType.MAGENTA].hex },
  ];

  const models: Model3MF[] = [
    {
      name: 'base',
      vertices: result.baseMesh.positions,
      triangles: result.baseMesh.indices,
      materialIndex: 0, // white
    },
    {
      name: 'cyan',
      vertices: result.cyanMesh.positions,
      triangles: result.cyanMesh.indices,
      materialIndex: 1,
    },
    {
      name: 'yellow',
      vertices: result.yellowMesh.positions,
      triangles: result.yellowMesh.indices,
      materialIndex: 2,
    },
    {
      name: 'magenta',
      vertices: result.magentaMesh.positions,
      triangles: result.magentaMesh.indices,
      materialIndex: 3,
    },
    {
      name: 'white',
      vertices: result.whiteMesh.positions,
      triangles: result.whiteMesh.indices,
      materialIndex: 0, // white (same material as base)
    },
  ];

  return { materials, models };
}
