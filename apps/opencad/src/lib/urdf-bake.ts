/**
 * URDF → GLB baker (server-side).
 *
 * Parses a URDF file, resolves its mesh references, fetches each mesh
 * (STL binary/ASCII; OBJ support is stubbed for v1), walks the
 * link-joint tree using identity joint angles (home pose), and emits
 * a single GLB binary with every visual placed at its world position.
 *
 * v1 scope:
 *   - binary STL meshes only (urdf-loader demo robots are 99% binary STL)
 *   - ASCII STL detected and parsed
 *   - OBJ / DAE return 501-like skip (logged, not included in output)
 *   - fixed + revolute + continuous + prismatic joints resolved at home pose
 *   - `package://` URLs rewritten against a caller-supplied base
 *
 * Not in v1 (follow-up):
 *   - OBJ / DAE mesh parsing
 *   - applying a caller-supplied joint configuration
 *   - per-link materials from <material> blocks (everything uses a default gray PBR)
 */

import { XMLParser } from "fast-xml-parser";
import { Document, NodeIO, type Mesh, type Node, type Primitive } from "@gltf-transform/core";
import { mat4, quat, vec3 } from "gl-matrix";

// --- URDF XML types (minimal) ------------------------------------------------

type Origin = { xyz: [number, number, number]; rpy: [number, number, number] };
type Inertial = Origin;
type MeshRef = { filename: string; scale?: [number, number, number] };
type Visual = { origin: Origin; mesh?: MeshRef };
type Link = { name: string; visuals: Visual[] };
type Joint = {
  name: string;
  type: string;
  parent: string;
  child: string;
  origin: Origin;
  axis?: [number, number, number];
};
type UrdfRobot = {
  name: string;
  links: Link[];
  joints: Joint[];
};

// --- XML → structured URDF --------------------------------------------------

const ZERO_ORIGIN: Origin = { xyz: [0, 0, 0], rpy: [0, 0, 0] };

function parseXyz(s: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!s) return fallback;
  const parts = s.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return fallback;
  return parts as [number, number, number];
}

function parseOrigin(node: unknown): Origin {
  if (!node || typeof node !== "object") return { ...ZERO_ORIGIN };
  const attr = (node as Record<string, unknown>)["@_"] as Record<string, string> | undefined;
  const xyz = parseXyz(attr?.xyz, [0, 0, 0]);
  const rpy = parseXyz(attr?.rpy, [0, 0, 0]);
  return { xyz, rpy };
}

function parseVisual(node: unknown): Visual {
  const obj = (node ?? {}) as Record<string, unknown>;
  const origin = parseOrigin(obj.origin);
  const geomWrap = obj.geometry as Record<string, unknown> | undefined;
  const mesh = geomWrap?.mesh as Record<string, unknown> | undefined;
  const attr = mesh?.["@_"] as Record<string, string> | undefined;
  const meshRef = attr?.filename
    ? { filename: attr.filename, scale: attr.scale ? parseXyz(attr.scale, [1, 1, 1]) : undefined }
    : undefined;
  return { origin, mesh: meshRef };
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

export function parseUrdf(xml: string): UrdfRobot {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attributesGroupName: "@_",
    allowBooleanAttributes: true,
    parseAttributeValue: false,
  });
  const doc = parser.parse(xml) as { robot?: Record<string, unknown> };
  const robot = doc.robot ?? {};
  const attr = (robot["@_"] as Record<string, string>) ?? {};

  const links: Link[] = asArray(robot.link as Record<string, unknown> | Record<string, unknown>[]).map((l) => {
    const linkAttr = (l["@_"] as Record<string, string>) ?? {};
    const visuals = asArray(l.visual).map(parseVisual).filter((v) => v.mesh);
    return { name: linkAttr.name ?? "unnamed-link", visuals };
  });

  const joints: Joint[] = asArray(robot.joint as Record<string, unknown> | Record<string, unknown>[]).map((j) => {
    const jAttr = (j["@_"] as Record<string, string>) ?? {};
    const parentRec = (j.parent as Record<string, unknown>) ?? {};
    const childRec = (j.child as Record<string, unknown>) ?? {};
    const parentAttr = (parentRec["@_"] as Record<string, string>) ?? {};
    const childAttr = (childRec["@_"] as Record<string, string>) ?? {};
    const origin = parseOrigin(j.origin);
    const axisRec = (j.axis as Record<string, unknown>) ?? {};
    const axisAttr = (axisRec["@_"] as Record<string, string>) ?? {};
    const axis = axisAttr.xyz ? parseXyz(axisAttr.xyz, [1, 0, 0]) : undefined;
    return {
      name: jAttr.name ?? "unnamed-joint",
      type: jAttr.type ?? "fixed",
      parent: parentAttr.link ?? "",
      child: childAttr.link ?? "",
      origin,
      axis,
    };
  });

  return { name: attr.name ?? "robot", links, joints };
}

// --- Forward kinematics at home pose ----------------------------------------

function rpyToMat4(out: mat4, rpy: [number, number, number], xyz: [number, number, number]): void {
  const q = quat.create();
  // URDF uses RPY = roll(X) * pitch(Y) * yaw(Z) → intrinsic order
  quat.fromEuler(q, (rpy[0] * 180) / Math.PI, (rpy[1] * 180) / Math.PI, (rpy[2] * 180) / Math.PI);
  mat4.fromRotationTranslation(out, q, xyz);
}

export function computeLinkWorldTransforms(robot: UrdfRobot): Map<string, mat4> {
  const childToJoint = new Map<string, Joint>();
  const parentCounts = new Map<string, number>();
  for (const j of robot.joints) {
    childToJoint.set(j.child, j);
    parentCounts.set(j.child, (parentCounts.get(j.child) ?? 0) + 1);
  }
  const linkNames = new Set(robot.links.map((l) => l.name));
  // A root link has no incoming joint; URDF typically has exactly one.
  let rootName: string | null = null;
  for (const name of linkNames) {
    if (!childToJoint.has(name)) {
      rootName = name;
      break;
    }
  }
  const transforms = new Map<string, mat4>();
  if (!rootName) return transforms;
  transforms.set(rootName, mat4.create()); // identity

  // BFS outward from root: child = parent * joint.origin (home pose ignores axis rotation)
  const parentToChildren = new Map<string, Joint[]>();
  for (const j of robot.joints) {
    if (!parentToChildren.has(j.parent)) parentToChildren.set(j.parent, []);
    parentToChildren.get(j.parent)!.push(j);
  }
  const queue: string[] = [rootName];
  while (queue.length) {
    const parent = queue.shift()!;
    const parentM = transforms.get(parent)!;
    for (const j of parentToChildren.get(parent) ?? []) {
      const local = mat4.create();
      rpyToMat4(local, j.origin.rpy, j.origin.xyz);
      const world = mat4.create();
      mat4.multiply(world, parentM, local);
      transforms.set(j.child, world);
      queue.push(j.child);
    }
  }
  return transforms;
}

// --- Mesh URL resolution -----------------------------------------------------

/**
 * Resolves a URDF mesh filename to an absolute HTTPS URL.
 *   - `package://pkg/a/b.stl` → `${packageBases[pkg]}/a/b.stl` if pkg is mapped
 *   - bare relative path → resolved against `baseUrl`
 *   - already http(s) → passthrough, with LFS raw→media fixup for github
 */
export function resolveMeshUrl(
  filename: string,
  baseUrl: string,
  packageBases: Record<string, string>,
): string {
  const pkgMatch = /^package:\/\/([^/]+)\/(.+)$/.exec(filename);
  if (pkgMatch) {
    const [, pkg, rest] = pkgMatch;
    const base = packageBases[pkg];
    if (base) return `${base.replace(/\/$/, "")}/${rest}`;
    // Fall through to base-url rewrite
    return new URL(`${pkg}/${rest}`, baseUrl).toString();
  }
  if (/^https?:\/\//i.test(filename)) return filename;
  return new URL(filename, baseUrl).toString();
}

// --- STL parsing (binary + ASCII) -------------------------------------------

type TriMesh = {
  positions: Float32Array; // 3 floats per vertex, 3 vertices per triangle
  normals: Float32Array;
};

function parseBinaryStl(buf: ArrayBuffer): TriMesh {
  const dv = new DataView(buf);
  const triCount = dv.getUint32(80, true);
  const positions = new Float32Array(triCount * 9);
  const normals = new Float32Array(triCount * 9);
  let off = 84;
  for (let i = 0; i < triCount; i++) {
    const nx = dv.getFloat32(off, true),
      ny = dv.getFloat32(off + 4, true),
      nz = dv.getFloat32(off + 8, true);
    off += 12;
    for (let v = 0; v < 3; v++) {
      const x = dv.getFloat32(off, true),
        y = dv.getFloat32(off + 4, true),
        z = dv.getFloat32(off + 8, true);
      off += 12;
      const p = i * 9 + v * 3;
      positions[p] = x;
      positions[p + 1] = y;
      positions[p + 2] = z;
      normals[p] = nx;
      normals[p + 1] = ny;
      normals[p + 2] = nz;
    }
    off += 2; // attribute byte count
  }
  return { positions, normals };
}

function parseAsciiStl(text: string): TriMesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const re = /facet\s+normal\s+(\S+)\s+(\S+)\s+(\S+)[\s\S]*?outer\s+loop([\s\S]*?)endloop/g;
  const vre = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const nx = parseFloat(m[1]),
      ny = parseFloat(m[2]),
      nz = parseFloat(m[3]);
    const loop = m[4];
    let vm: RegExpExecArray | null;
    let verts = 0;
    while ((vm = vre.exec(loop)) && verts < 3) {
      positions.push(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
      normals.push(nx, ny, nz);
      verts++;
    }
    vre.lastIndex = 0;
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals) };
}

function parseStl(buf: ArrayBuffer): TriMesh {
  // Binary STLs are detected by file length: 80-byte header + 4-byte count + 50 bytes/tri.
  if (buf.byteLength > 84) {
    const dv = new DataView(buf);
    const triCount = dv.getUint32(80, true);
    if (buf.byteLength === 84 + triCount * 50) return parseBinaryStl(buf);
  }
  const text = new TextDecoder("utf-8").decode(new Uint8Array(buf));
  if (/^\s*solid\b/.test(text) && /facet\s+normal/.test(text)) return parseAsciiStl(text);
  // Fallback: try binary anyway
  return parseBinaryStl(buf);
}

// --- Mesh fetcher ------------------------------------------------------------

const MAX_MESH_BYTES = 30 * 1024 * 1024; // 30 MB per mesh
const FETCH_TIMEOUT_MS = 15_000;

async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText} @ ${url}`);
    const len = Number(r.headers.get("content-length") ?? "0");
    if (len && len > MAX_MESH_BYTES) throw new Error(`mesh too large: ${len} bytes @ ${url}`);
    const ab = await r.arrayBuffer();
    if (ab.byteLength > MAX_MESH_BYTES) throw new Error(`mesh too large after download: ${ab.byteLength} @ ${url}`);
    // GitHub LFS pointer detection: 132-byte text starting with "version https://git-lfs"
    if (ab.byteLength < 1024) {
      const preview = new TextDecoder().decode(new Uint8Array(ab).slice(0, 64));
      if (preview.startsWith("version https://git-lfs")) {
        // Try LFS media URL (github only)
        const lfsUrl = url.replace("raw.githubusercontent.com", "media.githubusercontent.com/media");
        if (lfsUrl !== url) return fetchBinary(lfsUrl);
        throw new Error(`LFS pointer, no media URL fallback @ ${url}`);
      }
    }
    return ab;
  } finally {
    clearTimeout(t);
  }
}

// --- GLB emission ------------------------------------------------------------

type BakeReport = {
  robotName: string;
  linkCount: number;
  visualCount: number;
  meshesBaked: number;
  meshesSkipped: { url: string; reason: string }[];
  glbBytes: number;
};

function makeGrayMaterial(doc: Document) {
  return doc
    .createMaterial("urdf-default")
    .setBaseColorFactor([0.72, 0.72, 0.74, 1])
    .setMetallicFactor(0.15)
    .setRoughnessFactor(0.8);
}

export async function bakeUrdfToGlb(opts: {
  urdfUrl: string;
  packageBases?: Record<string, string>;
}): Promise<{ glb: Uint8Array; report: BakeReport }> {
  const urdfRes = await fetch(opts.urdfUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!urdfRes.ok) throw new Error(`URDF fetch failed: ${urdfRes.status} @ ${opts.urdfUrl}`);
  const urdfText = await urdfRes.text();
  const robot = parseUrdf(urdfText);
  const world = computeLinkWorldTransforms(robot);

  const doc = new Document();
  const scene = doc.createScene(robot.name);
  const mat = makeGrayMaterial(doc);
  const skipped: BakeReport["meshesSkipped"] = [];
  let baked = 0;

  // Collect all fetch tasks with link/visual correspondence
  type Task = {
    linkName: string;
    visualLocal: mat4; // link-local transform of the visual itself
    url: string;
    scale?: [number, number, number];
  };
  const tasks: Task[] = [];
  for (const link of robot.links) {
    for (const v of link.visuals) {
      if (!v.mesh) continue;
      const url = resolveMeshUrl(v.mesh.filename, opts.urdfUrl, opts.packageBases ?? {});
      const local = mat4.create();
      rpyToMat4(local, v.origin.rpy, v.origin.xyz);
      tasks.push({ linkName: link.name, visualLocal: local, url, scale: v.mesh.scale });
    }
  }

  const results = await Promise.allSettled(tasks.map((t) => fetchBinary(t.url)));

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const res = results[i];
    if (res.status !== "fulfilled") {
      skipped.push({ url: task.url, reason: (res.reason as Error)?.message ?? "fetch failed" });
      continue;
    }
    const ext = task.url.toLowerCase().split("?")[0].split("#")[0].split(".").pop() ?? "";
    if (ext !== "stl") {
      skipped.push({ url: task.url, reason: `unsupported-mesh-ext:${ext}` });
      continue;
    }
    let tri: TriMesh;
    try {
      tri = parseStl(res.value);
    } catch (e) {
      skipped.push({ url: task.url, reason: `parse-failed:${(e as Error).message}` });
      continue;
    }
    if (tri.positions.length === 0) {
      skipped.push({ url: task.url, reason: "empty-mesh" });
      continue;
    }

    // Apply URDF scale (mesh-local), then visualLocal, then link-world.
    const linkWorld = world.get(task.linkName) ?? mat4.create();
    const scaleM = mat4.create();
    mat4.fromScaling(scaleM, task.scale ?? [1, 1, 1]);
    const composed = mat4.create();
    mat4.multiply(composed, linkWorld, task.visualLocal);
    mat4.multiply(composed, composed, scaleM);

    // Build a primitive from this mesh.
    // .slice() forces Float32Array<ArrayBuffer> (not ArrayBufferLike) which
    // gltf-transform's setArray requires on this TS version.
    const posArr = tri.positions.slice();
    const normArr = tri.normals.slice();
    const posBuf = doc.createAccessor().setType("VEC3").setArray(posArr);
    const normBuf = doc.createAccessor().setType("VEC3").setArray(normArr);
    const prim: Primitive = doc
      .createPrimitive()
      .setAttribute("POSITION", posBuf)
      .setAttribute("NORMAL", normBuf)
      .setMaterial(mat);
    const gltfMesh: Mesh = doc.createMesh(`${task.linkName}-visual-${i}`).addPrimitive(prim);

    // Flatten the composed transform directly into a node matrix (row-major is fine for gltf-transform).
    const node: Node = doc.createNode(`${task.linkName}-${i}`).setMesh(gltfMesh);
    // Decompose composed → TRS for portability
    const t = vec3.create();
    const r = quat.create();
    const s = vec3.create();
    mat4.getTranslation(t, composed);
    mat4.getRotation(r, composed);
    mat4.getScaling(s, composed);
    node.setTranslation([t[0], t[1], t[2]]);
    node.setRotation([r[0], r[1], r[2], r[3]]);
    node.setScale([s[0], s[1], s[2]]);
    scene.addChild(node);
    baked++;
  }

  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  return {
    glb,
    report: {
      robotName: robot.name,
      linkCount: robot.links.length,
      visualCount: robot.links.reduce((n, l) => n + l.visuals.length, 0),
      meshesBaked: baked,
      meshesSkipped: skipped,
      glbBytes: glb.byteLength,
    },
  };
}
