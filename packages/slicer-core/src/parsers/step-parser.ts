/**
 * STEP/STP file parser using opencascade.js (OpenCascade compiled to WebAssembly).
 *
 * Reads STEP (ISO 10303-21) and STP files, tessellates B-rep geometry into
 * triangle meshes compatible with @opensoftware/slicer-core mesh analyzer.
 *
 * The WASM module (~63MB) loads once and is cached for subsequent calls.
 */
import type { Triangle, MeshData } from "../mesh-analyzer";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

// CJS require for loading the OpenCascade WASM glue (ESM module context)
const require_ = createRequire(import.meta.url);

// Cached OpenCascade instance — loaded once, reused across calls
let ocPromise: Promise<any> | null = null;

/**
 * Initialize the OpenCascade WASM module.
 * Cached: first call loads WASM (~63MB), subsequent calls return instantly.
 */
function getOpenCascade(): Promise<any> {
  if (ocPromise) return ocPromise;

  ocPromise = (async () => {
    // Resolve the opencascade.js dist directory.
    // The package's index.js uses ESM `import ... from` for the WASM file,
    // which relies on bundler magic. We load the factory directly from dist/.
    const ocMainPath = require_.resolve("opencascade.js");
    const ocDistDir = join(dirname(ocMainPath), "dist");
    const wasmPath = join(ocDistDir, "opencascade.wasm.wasm");

    // Load the factory function from the JS glue file.
    // opencascade.wasm.js is a CJS-compatible IIFE (var opencascade = function(){...}).
    const opencascadeFactory = require_(join(ocDistDir, "opencascade.wasm.js"));

    // Initialize with explicit WASM file location
    const oc = await opencascadeFactory({
      locateFile(path: string) {
        if (path.endsWith(".wasm")) {
          return wasmPath;
        }
        return path;
      },
    });

    return oc;
  })();

  // If initialization fails, clear the cache so the next call can retry
  ocPromise.catch(() => {
    ocPromise = null;
  });

  return ocPromise;
}

/**
 * Parse a STEP/STP file buffer into MeshData.
 *
 * @param buffer - Raw file contents of a .step or .stp file
 * @param linearDeflection - Tessellation accuracy (smaller = more triangles, default 0.1mm)
 * @param angularDeflection - Angular deflection for curves (default 0.5 rad)
 * @returns MeshData with triangles, vertex count, and bounding box
 */
export async function parseSTEP(
  buffer: Buffer,
  linearDeflection = 0.1,
  angularDeflection = 0.5,
): Promise<MeshData> {
  const oc = await getOpenCascade();

  // Write buffer to the Emscripten virtual filesystem (unique name for concurrency safety)
  const fileName = `/model_${randomUUID().slice(0, 8)}.step`;
  oc.FS.writeFile(fileName, new Uint8Array(buffer));

  let reader: any;
  let shape: any;
  let mesh: any;
  let explorer: any;

  try {
    // Read the STEP file
    reader = new oc.STEPControl_Reader_1();
    const readStatus = reader.ReadFile(fileName);

    if (readStatus !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
      throw new Error(
        `Failed to read STEP file (status: ${readStatus}). The file may be corrupt or not a valid STEP file.`,
      );
    }

    // Transfer all roots (top-level shapes) from the STEP file
    reader.TransferRoots(new oc.Message_ProgressRange_1());
    shape = reader.OneShape();

    if (shape.IsNull()) {
      throw new Error("STEP file contains no geometry");
    }

    // Tessellate the B-rep shape into triangles
    mesh = new oc.BRepMesh_IncrementalMesh_2(
      shape,
      linearDeflection,
      false, // isRelative
      angularDeflection,
      false, // isInParallel
    );

    if (!mesh.IsDone()) {
      throw new Error("Tessellation failed — the geometry may be too complex or degenerate");
    }

    // Extract triangles by iterating over all faces
    const triangles: Triangle[] = [];
    const vertexSet = new Set<string>();
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    explorer = new oc.TopExp_Explorer_2(
      shape,
      oc.TopAbs_ShapeEnum.TopAbs_FACE,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
    );

    while (explorer.More()) {
      const face = oc.TopoDS.Face_1(explorer.Current());
      const location = new oc.TopLoc_Location_1();
      const triangulation = oc.BRep_Tool.Triangulation(face, location, 0);

      if (!triangulation.IsNull()) {
        const tri = triangulation.get();
        const transform = location.Transformation();
        const nbTriangles = tri.NbTriangles();

        // Check face orientation for normal direction
        const faceOrientation = face.Orientation_1();
        const isReversed = faceOrientation === oc.TopAbs_Orientation.TopAbs_REVERSED;

        for (let i = 1; i <= nbTriangles; i++) {
          const triangle = tri.Triangle(i);

          // Get vertex indices (1-based in OpenCascade)
          let n1 = triangle.Value(1);
          let n2 = triangle.Value(2);
          let n3 = triangle.Value(3);

          // Reverse winding if face is reversed
          if (isReversed) {
            [n2, n3] = [n3, n2];
          }

          // Get vertices and apply the location transform
          const verts: [number, number, number][] = [];
          for (const idx of [n1, n2, n3]) {
            const node = tri.Node(idx);
            const transformed = node.Transformed(transform);
            const v: [number, number, number] = [
              transformed.X(),
              transformed.Y(),
              transformed.Z(),
            ];
            verts.push(v);

            // Update bounding box
            for (let k = 0; k < 3; k++) {
              if (v[k] < min[k]) min[k] = v[k];
              if (v[k] > max[k]) max[k] = v[k];
            }
            vertexSet.add(`${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`);
          }

          // Compute face normal from cross product
          const e1: [number, number, number] = [
            verts[1][0] - verts[0][0],
            verts[1][1] - verts[0][1],
            verts[1][2] - verts[0][2],
          ];
          const e2: [number, number, number] = [
            verts[2][0] - verts[0][0],
            verts[2][1] - verts[0][1],
            verts[2][2] - verts[0][2],
          ];
          const nx = e1[1] * e2[2] - e1[2] * e2[1];
          const ny = e1[2] * e2[0] - e1[0] * e2[2];
          const nz = e1[0] * e2[1] - e1[1] * e2[0];
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
          const normal: [number, number, number] =
            len > 0 ? [nx / len, ny / len, nz / len] : [0, 0, 1];

          triangles.push({
            v0: verts[0],
            v1: verts[1],
            v2: verts[2],
            normal,
          });
        }
      }

      location.delete();
      explorer.Next();
    }

    if (triangles.length === 0) {
      throw new Error("STEP file produced no triangles after tessellation — the geometry may be empty or degenerate");
    }

    return {
      triangles,
      vertexCount: vertexSet.size,
      boundingBox: { min, max },
    };
  } finally {
    // Clean up OpenCascade objects to prevent memory leaks
    try { oc.FS.unlink(fileName); } catch { /* ignore */ }
    if (explorer) try { explorer.delete(); } catch { /* ignore */ }
    if (mesh) try { mesh.delete(); } catch { /* ignore */ }
    if (shape) try { shape.delete(); } catch { /* ignore */ }
    if (reader) try { reader.delete(); } catch { /* ignore */ }
  }
}
