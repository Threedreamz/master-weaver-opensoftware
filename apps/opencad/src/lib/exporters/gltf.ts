/**
 * opencad — glTF/GLB exporter (M1)
 *
 * Uses `three/examples/jsm/exporters/GLTFExporter.js` in binary mode → a
 * single .glb file (ArrayBuffer). GLTFExporter runs synchronously on a Scene,
 * so we wrap the evaluated BufferGeometry in a Mesh + Scene before export.
 *
 * GLTFExporter's `parse()` is callback-based with a success + error handler;
 * we promisify it. The returned ArrayBuffer is then streamed in 1MB chunks
 * matching the STL/3MF exporters' contract.
 */
import * as THREE from "three";
// The three package ships these JSM examples under `examples/jsm/*`.
// The `.js` import path is required in modern node/ESM (next.js bundles it).
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { evaluateProject } from "../feature-timeline";

type Tessellation = "coarse" | "normal" | "fine";

export interface ExportGLTFOptions {
  tessellation: Tessellation;
  versionId?: string;
  /** GLB (binary) is default; set false to emit embedded-JSON glTF instead. */
  binary?: boolean;
}

export interface ExportGLTFResult {
  stream: ReadableStream<Uint8Array>;
  filename: string;
  triangleCount: number;
  sizeBytes: number;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function countTriangles(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) return Math.floor(index.count / 3);
  const pos = geometry.getAttribute("position");
  return pos ? Math.floor(pos.count / 3) : 0;
}

export async function exportProjectGLTF(
  projectId: string,
  opts: ExportGLTFOptions,
): Promise<ExportGLTFResult> {
  const { tessellation, versionId, binary = true } = opts;

  const geometry = await evaluateProject(projectId, { tessellation, versionId });
  const triangleCount = countTriangles(geometry);

  // GLTFExporter needs a Scene graph. Build the minimum: scene → mesh →
  // geometry + a neutral default material. No lights, no camera — this is a
  // data interchange payload, not a rendered scene.
  const scene = new THREE.Scene();
  const material = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.0 });
  // Empty-project guard: GLTFExporter throws on a geometry with no position
  // attribute. Give it a single degenerate point so it emits a valid GLB with
  // an empty-scene feel rather than failing the whole export.
  const posAttr = geometry.getAttribute("position");
  if (!posAttr || posAttr.count === 0) {
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3),
    );
  }
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exporter = new (GLTFExporter as any)();

  const bytes: Uint8Array = await new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result: ArrayBuffer | object) => {
        try {
          if (binary) {
            if (!(result instanceof ArrayBuffer)) {
              return reject(new Error("GLTFExporter: binary=true but got JSON result"));
            }
            resolve(new Uint8Array(result));
          } else {
            // JSON gltf — serialise to bytes so the stream contract stays
            // uniform across formats.
            const json = typeof result === "string" ? result : JSON.stringify(result);
            resolve(new TextEncoder().encode(json));
          }
        } catch (err) {
          reject(err);
        }
      },
      (err: unknown) => reject(err instanceof Error ? err : new Error(String(err))),
      { binary, onlyVisible: true, truncateDrawRange: true, embedImages: true },
    );
  });

  const sizeBytes = bytes.byteLength;
  const ext = binary ? "glb" : "gltf";
  const filename = sanitizeFilename(`opencad-${projectId}${versionId ? `-${versionId}` : ""}.${ext}`);

  const CHUNK = 1 << 20;
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close();
        return;
      }
      const end = Math.min(offset + CHUNK, bytes.byteLength);
      controller.enqueue(new Uint8Array(bytes.subarray(offset, end)));
      offset = end;
    },
    cancel() {
      offset = bytes.byteLength;
    },
  });

  return { stream, filename, triangleCount, sizeBytes };
}
