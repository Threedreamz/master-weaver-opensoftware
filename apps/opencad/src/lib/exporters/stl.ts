/**
 * opencad — STL exporter (M1)
 *
 * Evaluates the project's feature tree, tessellates the final geometry via
 * the cad-kernel, and streams the STL bytes back to the API route. Never
 * buffers the whole file in memory — the BufferGeometry is tessellated and
 * serialised in chunks via a ReadableStream pull() pump.
 *
 * Consumers: `app/api/projects/[id]/export/[format]/route.ts` (format=stl).
 *
 * Contract:
 *   exportProjectSTL(projectId, { binary, tessellation }) →
 *     { stream: ReadableStream<Uint8Array>, filename, triangleCount, sizeBytes }
 *
 * Depends on (injected at runtime — see `cad-kernel.ts` and `geometry-cache.ts`):
 *   - kernel.evaluateProject(projectId, { tessellation }) → BufferGeometry
 *   - kernel.exportSTL(geometry, binary) → Uint8Array
 */
import * as THREE from "three";

type Tessellation = "coarse" | "normal" | "fine";

export interface ExportSTLOptions {
  binary?: boolean;
  tessellation: Tessellation;
  /**
   * Optional version pin — if omitted the current head version is evaluated.
   * Surfaced here so the handoff path can deterministically export a snapshot.
   */
  versionId?: string;
}

export interface ExportSTLResult {
  stream: ReadableStream<Uint8Array>;
  filename: string;
  triangleCount: number;
  sizeBytes: number;
}

/**
 * Lazy-load the CAD kernel. The sibling task is writing it; we import by path
 * so our module compiles even if the kernel isn't ready yet at `tsc` time —
 * any type narrowing happens at call-time.
 */
async function loadKernel(): Promise<{
  evaluateProject(
    projectId: string,
    opts: { tessellation: Tessellation; versionId?: string },
  ): Promise<THREE.BufferGeometry>;
  exportSTL(geometry: THREE.BufferGeometry, binary: boolean): Uint8Array;
}> {
  // evaluateProject lives in feature-timeline; exportSTL stays in cad-kernel.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [kmod, tmod]: [any, any] = await Promise.all([
    import("../cad-kernel"),
    import("../feature-timeline"),
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return {
    evaluateProject: tmod.evaluateProject ?? tmod.default?.evaluateProject,
    exportSTL: kmod.exportSTL ?? kmod.default?.exportSTL,
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function countTriangles(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) return Math.floor(index.count / 3);
  const pos = geometry.getAttribute("position");
  if (!pos) return 0;
  return Math.floor(pos.count / 3);
}

/**
 * Evaluate feature tree → tessellate → serialise to STL bytes → stream.
 *
 * The serialised Uint8Array is enqueued in ~1MB chunks so the API route can
 * back-pressure without holding the whole buffer in a single enqueue.
 */
export async function exportProjectSTL(
  projectId: string,
  opts: ExportSTLOptions,
): Promise<ExportSTLResult> {
  const { binary = true, tessellation, versionId } = opts;

  const kernel = await loadKernel();
  if (!kernel.evaluateProject || !kernel.exportSTL) {
    throw new Error("cad-kernel not available — evaluateProject/exportSTL missing");
  }

  const geometry = await kernel.evaluateProject(projectId, { tessellation, versionId });
  const triangleCount = countTriangles(geometry);
  const bytes = kernel.exportSTL(geometry, binary);
  const sizeBytes = bytes.byteLength;
  const filename = sanitizeFilename(`opencad-${projectId}${versionId ? `-${versionId}` : ""}.stl`);

  const CHUNK = 1 << 20; // 1 MiB
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close();
        return;
      }
      const end = Math.min(offset + CHUNK, bytes.byteLength);
      // Slice creates a view; copy into a fresh Uint8Array so the consumer
      // can't accidentally mutate the underlying buffer.
      controller.enqueue(new Uint8Array(bytes.subarray(offset, end)));
      offset = end;
    },
    cancel() {
      offset = bytes.byteLength;
    },
  });

  return { stream, filename, triangleCount, sizeBytes };
}

/**
 * Internal helper for the handoff path — returns the raw bytes + metadata
 * without wrapping in a stream. Used when we need to build a FormData body
 * for the openslicer upload (FormData needs a Blob, not a stream).
 */
export async function exportProjectSTLBytes(
  projectId: string,
  opts: ExportSTLOptions,
): Promise<{ bytes: Uint8Array; filename: string; triangleCount: number; sizeBytes: number }> {
  const { binary = true, tessellation, versionId } = opts;
  const kernel = await loadKernel();
  if (!kernel.evaluateProject || !kernel.exportSTL) {
    throw new Error("cad-kernel not available — evaluateProject/exportSTL missing");
  }
  const geometry = await kernel.evaluateProject(projectId, { tessellation, versionId });
  const triangleCount = countTriangles(geometry);
  const bytes = kernel.exportSTL(geometry, binary);
  const filename = sanitizeFilename(`opencad-${projectId}${versionId ? `-${versionId}` : ""}.stl`);
  return { bytes, filename, triangleCount, sizeBytes: bytes.byteLength };
}
