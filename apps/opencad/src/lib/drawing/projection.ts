/**
 * opencad — orthographic 3D→2D projection for engineering drawings.
 *
 * Projects a Three.BufferGeometry onto a 2D drafting plane using a
 * view-aligned orthonormal basis, and extracts feature edges via
 * {@link THREE.EdgesGeometry} (crease-angle threshold). Hidden-edge
 * visibility is determined by raycasting each edge midpoint toward the
 * camera and testing whether the mesh occludes the segment.
 *
 * Standard engineering views:
 *  - **front**  — look along −Y, up = +Z → projects onto the XZ plane
 *  - **top**    — look along −Z, up = +Y → projects onto the XY plane
 *  - **right**  — look along −X, up = +Z → projects onto the YZ plane
 *  - **iso**    — look along (1,1,1)/√3, up = +Z → axonometric iso plane
 *
 * Pure Node — no DOM, no WebGL context, safe inside server routes.
 */
import * as THREE from "three";

/* ---------------------------------------------------------------- types */

export interface Point2 {
  x: number;
  y: number;
}

export interface Line2 {
  p0: Point2;
  p1: Point2;
}

export type StandardView = "front" | "top" | "right" | "iso";

export interface ProjectionResult {
  view: StandardView;
  /** Edges visible directly from the camera (solid lines in the drawing). */
  visibleEdges: Line2[];
  /** Edges occluded by faces of the solid (dashed lines in the drawing). */
  hiddenEdges: Line2[];
  bbox2d: { min: Point2; max: Point2 };
}

export interface ProjectionOptions {
  /** Enable hidden-edge extraction via raycasting. Default: true. */
  hiddenLine?: boolean;
  /**
   * Feature-edge angle threshold (degrees) passed to {@link THREE.EdgesGeometry}.
   * Smaller values keep more edges (e.g. tessellation noise); larger values
   * keep only sharp creases. Default: 15°.
   */
  featureEdgeAngleDeg?: number;
}

/* ---------------------------------------------------------------- basis */

/**
 * Orthonormal basis for a standard view. The camera looks along `-forward`.
 * `right` and `up` span the 2D drafting plane: projected X = dot(p, right),
 * projected Y = dot(p, up).
 */
interface ViewBasis {
  right: THREE.Vector3;
  up: THREE.Vector3;
  forward: THREE.Vector3; // unit vector FROM scene TOWARD camera
}

function basisFor(view: StandardView): ViewBasis {
  switch (view) {
    case "front":
      // Look along -Y, up = +Z → 2D plane = (X, Z)
      return {
        right: new THREE.Vector3(1, 0, 0),
        up: new THREE.Vector3(0, 0, 1),
        forward: new THREE.Vector3(0, -1, 0),
      };
    case "top":
      // Look along -Z, up = +Y → 2D plane = (X, Y)
      return {
        right: new THREE.Vector3(1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
        forward: new THREE.Vector3(0, 0, -1),
      };
    case "right":
      // Look along -X, up = +Z → 2D plane = (Y, Z)
      return {
        right: new THREE.Vector3(0, 1, 0),
        up: new THREE.Vector3(0, 0, 1),
        forward: new THREE.Vector3(-1, 0, 0),
      };
    case "iso": {
      // Look along (1,1,1)/√3 toward origin → forward = -(1,1,1)/√3 (scene→cam)
      // Choose up = +Z projected onto the view plane, then normalized.
      const forward = new THREE.Vector3(-1, -1, -1).normalize();
      const worldUp = new THREE.Vector3(0, 0, 1);
      // Remove forward component from worldUp to get an in-plane up vector.
      const up = worldUp
        .clone()
        .sub(forward.clone().multiplyScalar(worldUp.dot(forward)))
        .normalize();
      const right = new THREE.Vector3().crossVectors(up, forward).normalize();
      return { right, up, forward };
    }
    default: {
      const exhaustive: never = view;
      throw new Error(`projectSolid: unknown view "${String(exhaustive)}"`);
    }
  }
}

/* ----------------------------------------------------------- helpers */

function projectPoint(p: THREE.Vector3, basis: ViewBasis): Point2 {
  return { x: p.dot(basis.right), y: p.dot(basis.up) };
}

/** Walk an EdgesGeometry to produce ordered pairs of 3D endpoints. */
function extractEdgeEndpoints(
  edges: THREE.BufferGeometry
): Array<{ a: THREE.Vector3; b: THREE.Vector3 }> {
  const pos = edges.getAttribute("position");
  if (!pos) return [];
  const out: Array<{ a: THREE.Vector3; b: THREE.Vector3 }> = [];
  // EdgesGeometry emits a non-indexed line list: every 2 consecutive
  // vertices form one edge.
  for (let i = 0; i + 1 < pos.count; i += 2) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    out.push({ a, b });
  }
  return out;
}

/**
 * Build a Mesh that shares `geom` so a raycaster can intersect it. We do
 * NOT clone the geometry — the caller still owns it.
 */
function buildOccluder(geom: THREE.BufferGeometry): THREE.Mesh {
  // Raycaster needs a material; MeshBasicMaterial is the cheapest (no shading
  // or texture lookups). `side: THREE.DoubleSide` so we catch back-facing
  // intersections for non-closed meshes.
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geom, mat);
  // Raycasting reads world matrices — make sure they're populated.
  mesh.updateMatrixWorld(true);
  return mesh;
}

/**
 * Is the midpoint of `(a, b)` occluded by `mesh` when viewed from the
 * camera in the direction `-forward`? We place a virtual camera far along
 * `+forward` from the scene bbox, then cast a ray from camera → midpoint
 * and see whether the ray strikes the mesh BEFORE reaching the midpoint.
 */
function isEdgeHidden(
  a: THREE.Vector3,
  b: THREE.Vector3,
  basis: ViewBasis,
  raycaster: THREE.Raycaster,
  mesh: THREE.Mesh,
  cameraDistance: number
): boolean {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  // Camera origin: push the midpoint along +forward by `cameraDistance` so
  // the virtual camera sits well outside the bbox.
  const origin = mid
    .clone()
    .add(basis.forward.clone().multiplyScalar(cameraDistance));
  const direction = mid.clone().sub(origin).normalize();

  raycaster.set(origin, direction);
  raycaster.near = 0;
  raycaster.far = cameraDistance + 1; // a hair past the midpoint
  const hits = raycaster.intersectObject(mesh, false);
  if (hits.length === 0) return false;

  const midDist = origin.distanceTo(mid);
  // Nudge tolerance: treat a hit within `eps` of the midpoint as "on the
  // edge itself", not an occluder. Scale with scene size.
  const eps = Math.max(1e-3, cameraDistance * 1e-4);
  return hits[0].distance < midDist - eps;
}

/* ----------------------------------------------------------- main api */

export function projectSolid(
  geom: THREE.BufferGeometry,
  view: StandardView,
  options?: ProjectionOptions
): ProjectionResult {
  const opts: Required<ProjectionOptions> = {
    hiddenLine: options?.hiddenLine ?? true,
    featureEdgeAngleDeg: options?.featureEdgeAngleDeg ?? 15,
  };
  const basis = basisFor(view);

  const edgesGeom = new THREE.EdgesGeometry(geom, opts.featureEdgeAngleDeg);
  const edges3d = extractEdgeEndpoints(edgesGeom);

  // Pre-compute camera distance from the geometry bbox (scene-scaled).
  geom.computeBoundingBox();
  const bbox3 = geom.boundingBox ?? new THREE.Box3();
  const diag = bbox3.getSize(new THREE.Vector3()).length();
  const cameraDistance = Math.max(10, diag * 5);

  let occluder: THREE.Mesh | null = null;
  let raycaster: THREE.Raycaster | null = null;
  if (opts.hiddenLine) {
    occluder = buildOccluder(geom);
    raycaster = new THREE.Raycaster();
  }

  const visibleEdges: Line2[] = [];
  const hiddenEdges: Line2[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { a, b } of edges3d) {
    const p0 = projectPoint(a, basis);
    const p1 = projectPoint(b, basis);
    const line: Line2 = { p0, p1 };

    if (p0.x < minX) minX = p0.x;
    if (p0.y < minY) minY = p0.y;
    if (p0.x > maxX) maxX = p0.x;
    if (p0.y > maxY) maxY = p0.y;
    if (p1.x < minX) minX = p1.x;
    if (p1.y < minY) minY = p1.y;
    if (p1.x > maxX) maxX = p1.x;
    if (p1.y > maxY) maxY = p1.y;

    if (opts.hiddenLine && occluder && raycaster) {
      const hidden = isEdgeHidden(a, b, basis, raycaster, occluder, cameraDistance);
      if (hidden) hiddenEdges.push(line);
      else visibleEdges.push(line);
    } else {
      visibleEdges.push(line);
    }
  }

  // Dispose the temporary EdgesGeometry — it's a cheap line list but no
  // reason to leave it floating.
  edgesGeom.dispose();

  if (!Number.isFinite(minX)) {
    // No edges at all — emit a degenerate bbox at origin.
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  return {
    view,
    visibleEdges,
    hiddenEdges,
    bbox2d: { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } },
  };
}

/**
 * Project into all four standard views in a fixed order: front, top, right, iso.
 * Useful for generating a classic 4-up engineering drawing sheet.
 */
export function projectAllStandardViews(
  geom: THREE.BufferGeometry,
  options?: ProjectionOptions
): ProjectionResult[] {
  const views: StandardView[] = ["front", "top", "right", "iso"];
  return views.map((v) => projectSolid(geom, v, options));
}
