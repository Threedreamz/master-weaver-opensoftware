import { parseSTL } from "./stl-parser";
import { parseOBJ } from "./obj-parser";
import { parse3MF } from "./threemf-parser";
import { parseOpenSCAD } from "./openscad-parser";
// STEP parser uses opencascade.js WASM — lazy import to avoid breaking Turbopack
import type { MeshData } from "../mesh-analyzer";

export { parseSTL } from "./stl-parser";
export { parseOBJ } from "./obj-parser";
export { parse3MF } from "./threemf-parser";
export { parseOpenSCAD, extractParameters, applyParameters, isOpenSCADInstalled } from "./openscad-parser";
export type { ScadParameter } from "./openscad-parser";

/**
 * Parse a 3D model file into MeshData.
 *
 * Returns a Promise because some formats (STEP/STP) require async WASM initialization.
 * For synchronous formats (STL, OBJ, 3MF, SCAD), the Promise resolves immediately.
 */
export async function parseModel(buffer: Buffer, format: string): Promise<MeshData> {
  switch (format.toLowerCase()) {
    case "stl":
      return parseSTL(buffer);
    case "obj":
      return parseOBJ(buffer);
    case "3mf":
      return parse3MF(buffer);
    case "scad":
      return parseOpenSCAD(buffer);
    case "step":
    case "stp":
      // STEP support requires opencascade.js WASM (~63MB) which is incompatible with Turbopack.
      // To use STEP files, convert them to STL first using FreeCAD, Fusion360, or an online converter.
      throw new Error(
        "STEP/STP files are not yet supported in the dev server. " +
        "Please convert to STL, OBJ, or 3MF format first. " +
        "Use FreeCAD (free) or any CAD tool to export as STL."
      );
    default:
      throw new Error(`Unsupported format: ${format}. Supported formats: STL, OBJ, 3MF, SCAD, STEP, STP`);
  }
}
