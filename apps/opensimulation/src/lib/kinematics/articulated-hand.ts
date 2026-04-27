/**
 * Copied from ODYN-starter/apps/odyn-maker/src/components/simulation/ (M1 copy-first migration).
 * Do not modify here — the canonical owner is now opensimulation.
 * ODYN still has its own copy for odyn-maker UI; a future @opensoftware/sim-core package
 * will dedupe when drift becomes a problem (M2 ticket).
 */

/**
 * ODYN Sift — Articulated ORCA Hand
 *
 * Builds a Three.js Group hierarchy matching the MJCF kinematic chain.
 * Each body is a child of its parent with correct local position and euler
 * rotation from the MJCF XML. Joint angles rotate individual groups on
 * their specified axis.
 *
 * Coordinate system:
 *   - MJCF uses meters + Z-up. We multiply positions by 1000 for mm.
 *   - A single rotateX(-PI/2) on the ROOT group converts to Y-up.
 *   - Individual STL meshes are loaded as-is (no per-mesh rotation).
 *
 * 17 bone parts per hand, ~408KB total.
 */

import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HandJointAngles {
  wrist: number;
  thumb_mcp: number;
  thumb_abd: number;
  thumb_pip: number;
  thumb_dip: number;
  index_abd: number;
  index_mcp: number;
  index_pip: number;
  middle_abd: number;
  middle_mcp: number;
  middle_pip: number;
  ring_abd: number;
  ring_mcp: number;
  ring_pip: number;
  pinky_abd: number;
  pinky_mcp: number;
  pinky_pip: number;
}

/** Natural relaxed pose — slightly curled fingers, gentle abduction
 *  Based on ORCA neutral_position from config.yaml, adjusted for visual realism */
export const DEFAULT_JOINT_ANGLES: HandJointAngles = {
  wrist: -0.05,          // very slight flexion (natural droop)
  thumb_mcp: -0.1,
  thumb_abd: -0.55,      // relaxed opposition
  thumb_pip: 0.35,       // slightly bent
  thumb_dip: 0.25,
  index_abd: -0.05,      // fingers close together, natural
  index_mcp: 0.45,       // natural curl at knuckle
  index_pip: 0.5,        // relaxed bend
  middle_abd: 0,
  middle_mcp: 0.4,
  middle_pip: 0.45,
  ring_abd: 0.03,
  ring_mcp: 0.45,
  ring_pip: 0.5,
  pinky_abd: 0.08,       // close to ring, natural grouping
  pinky_mcp: 0.5,
  pinky_pip: 0.55,
};

/** Closed fist — fingers fully curled */
export const CLOSED_FIST_ANGLES: HandJointAngles = {
  wrist: 0,
  thumb_mcp: 0.5,
  thumb_abd: -0.8,
  thumb_pip: 0.8,
  thumb_dip: 0.8,
  index_abd: 0,
  index_mcp: 1.4,
  index_pip: 1.5,
  middle_abd: 0,
  middle_mcp: 1.4,
  middle_pip: 1.5,
  ring_abd: 0,
  ring_mcp: 1.4,
  ring_pip: 1.5,
  pinky_abd: 0,
  pinky_mcp: 1.4,
  pinky_pip: 1.5,
};

// ---------------------------------------------------------------------------
// Realistic ORCA grasp poses (from orca_core config + real-world patterns)
// All values in radians. Based on joint ranges from MJCF v1 spec.
// ---------------------------------------------------------------------------

/** Power grasp — full-hand grip for heavy/large SLS parts */
export const POWER_GRASP_ANGLES: HandJointAngles = {
  wrist: 0,
  thumb_mcp: 0,
  thumb_abd: -0.52,   // ~30° opposition
  thumb_pip: 0.87,
  thumb_dip: 0.87,
  index_abd: 0,
  index_mcp: 1.4,
  index_pip: 1.57,
  middle_abd: 0,
  middle_mcp: 1.3,
  middle_pip: 1.57,
  ring_abd: 0,
  ring_mcp: 1.3,
  ring_pip: 1.57,
  pinky_abd: 0,
  pinky_mcp: 1.4,
  pinky_pip: 1.57,
};

/** Precision pinch — thumb + index for small/delicate parts */
export const PRECISION_PINCH_ANGLES: HandJointAngles = {
  wrist: 0.1,
  thumb_mcp: 0.35,
  thumb_abd: -0.17,   // ~10° slight opposition
  thumb_pip: 0.6,
  thumb_dip: 0.5,
  index_abd: -0.1,
  index_mcp: 0.78,    // ~45° curl
  index_pip: 1.05,
  middle_abd: 0,
  middle_mcp: 0,      // extended
  middle_pip: 0,
  ring_abd: 0.17,
  ring_mcp: 0,
  ring_pip: 0,
  pinky_abd: 0.523,
  pinky_mcp: 0,
  pinky_pip: 0,
};

/** Tripod grasp — thumb + index + middle for medium parts */
export const TRIPOD_GRASP_ANGLES: HandJointAngles = {
  wrist: 0,
  thumb_mcp: 0.25,
  thumb_abd: -0.35,
  thumb_pip: 0.7,
  thumb_dip: 0.6,
  index_abd: -0.15,
  index_mcp: 0.9,
  index_pip: 1.1,
  middle_abd: 0.1,
  middle_mcp: 0.9,
  middle_pip: 1.1,
  ring_abd: 0.17,
  ring_mcp: 0.2,     // slightly curled, out of way
  ring_pip: 0.3,
  pinky_abd: 0.523,
  pinky_mcp: 0.2,
  pinky_pip: 0.3,
};

/** Open hand — wide spread for pre-grasp approach */
export const OPEN_HAND_ANGLES: HandJointAngles = {
  wrist: 0.15,
  thumb_mcp: -0.17,
  thumb_abd: -0.52,
  thumb_pip: 0.17,
  thumb_dip: 0.17,
  index_abd: -0.44,
  index_mcp: 0,
  index_pip: 0,
  middle_abd: -0.03,
  middle_mcp: 0,
  middle_pip: 0,
  ring_abd: 0.35,
  ring_mcp: 0,
  ring_pip: 0,
  pinky_abd: 0.96,
  pinky_mcp: 0,
  pinky_pip: 0,
};

/** Brush hold — fingers spread flat for sweeping powder off a surface */
export const BRUSH_STROKE_ANGLES: HandJointAngles = {
  wrist: -0.3,        // wrist flexed down toward brush
  thumb_mcp: 0,
  thumb_abd: -0.52,
  thumb_pip: 0.3,
  thumb_dip: 0.2,
  index_abd: -0.2,
  index_mcp: 0.6,     // partially curled to hold part against brush
  index_pip: 0.8,
  middle_abd: 0,
  middle_mcp: 0.6,
  middle_pip: 0.8,
  ring_abd: 0.1,
  ring_mcp: 0.6,
  ring_pip: 0.8,
  pinky_abd: 0.3,
  pinky_mcp: 0.6,
  pinky_pip: 0.8,
};

/** Cup shape — protective cupped hold during vacuum cleaning */
export const CUP_SHAPE_ANGLES: HandJointAngles = {
  wrist: -0.15,
  thumb_mcp: 0.2,
  thumb_abd: -0.4,
  thumb_pip: 0.5,
  thumb_dip: 0.4,
  index_abd: -0.1,
  index_mcp: 0.7,
  index_pip: 0.7,
  middle_abd: 0,
  middle_mcp: 0.65,
  middle_pip: 0.65,
  ring_abd: 0.1,
  ring_mcp: 0.65,
  ring_pip: 0.65,
  pinky_abd: 0.2,
  pinky_mcp: 0.7,
  pinky_pip: 0.7,
};

/** Tap grip — firm hold with slight wrist mobility for impact tapping */
export const TAP_GRIP_ANGLES: HandJointAngles = {
  wrist: 0.3,         // wrist extended up, ready to tap down
  thumb_mcp: 0.4,
  thumb_abd: -0.6,
  thumb_pip: 0.8,
  thumb_dip: 0.7,
  index_abd: 0,
  index_mcp: 1.2,
  index_pip: 1.3,
  middle_abd: 0,
  middle_mcp: 1.2,
  middle_pip: 1.3,
  ring_abd: 0,
  ring_mcp: 1.2,
  ring_pip: 1.3,
  pinky_abd: 0,
  pinky_mcp: 1.2,
  pinky_pip: 1.3,
};

// ---------------------------------------------------------------------------
// MJCF body definitions — left hand
// ---------------------------------------------------------------------------

/** Joint axis shorthand */
type Axis = 'x' | 'y' | 'z';

interface BodyDef {
  name: string;
  /** Local position in mm (MJCF meters * 1000) */
  pos: [number, number, number];
  /** Local euler in radians [x, y, z] — intrinsic XYZ */
  euler?: [number, number, number];
  /** STL part name (without side prefix) e.g. "palm" */
  stlPart?: string;
  /** Joint key in HandJointAngles */
  jointKey?: keyof HandJointAngles;
  /** Axis this joint rotates around */
  jointAxis?: Axis;
  /** Children */
  children?: BodyDef[];
}

/**
 * Left hand kinematic tree.
 * Positions are MJCF meters * 1000 = mm.
 * Eulers are raw MJCF radians.
 */
const LEFT_HAND_TREE: BodyDef = {
  name: 'tower',
  pos: [0, 0, 0],     // Zeroed — MJCF world offset not needed for our sim
  children: [
    {
      name: 'palm',
      pos: [0, 0, 0],  // Palm at group origin — fingers extend from here
      stlPart: 'palm',
      jointKey: 'wrist',
      jointAxis: 'x',
      children: [
        // --- Thumb chain ---
        {
          name: 'thumb_mp',
          pos: [28.21, 17.77, -13.21],
          euler: [0.539, 0.056, 1.270],
          stlPart: 'thumb_mp',
          jointKey: 'thumb_mcp',
          jointAxis: 'z',
          children: [
            {
              name: 'thumb_pp',
              pos: [30, 0, 0],
              euler: [-1.222, 0, 0],
              stlPart: 'thumb_pp',
              jointKey: 'thumb_abd',
              jointAxis: 'y', // approximation of (0,-0.342,-0.940)
              children: [
                {
                  name: 'thumb_ip',
                  pos: [0, 0, 0],
                  euler: [Math.PI, -Math.PI / 2, 0],
                  stlPart: 'thumb_ip',
                  jointKey: 'thumb_pip',
                  jointAxis: 'y',
                  children: [
                    {
                      name: 'thumb_dp',
                      pos: [-0.5, 0, 33],
                      stlPart: 'thumb_dp',
                      jointKey: 'thumb_dip',
                      jointAxis: 'y',
                    },
                  ],
                },
              ],
            },
          ],
        },
        // --- Index chain ---
        {
          name: 'index_mp',
          pos: [32.51, 2.35, 43.3],
          euler: [1.607, -1.136, 0.053],
          stlPart: 'index_mp',
          jointKey: 'index_abd',
          jointAxis: 'z',
          children: [
            {
              name: 'index_pp',
              pos: [0, 0, 0],
              euler: [0, Math.PI / 2, 0],
              stlPart: 'index_pp',
              jointKey: 'index_mcp',
              jointAxis: 'y',
              children: [
                {
                  name: 'index_ip',
                  pos: [-0.5, 0, 38],
                  stlPart: 'index_ip',
                  jointKey: 'index_pip',
                  jointAxis: 'y',
                },
              ],
            },
          ],
        },
        // --- Middle chain ---
        {
          name: 'middle_mp',
          pos: [0, 0, 50],
          euler: [Math.PI / 2, -Math.PI / 2, 0],
          stlPart: 'middle_mp',
          jointKey: 'middle_abd',
          jointAxis: 'z',
          children: [
            {
              name: 'middle_pp',
              pos: [0, 0, 0],
              euler: [0, Math.PI / 2, 0],
              stlPart: 'middle_pp',
              jointKey: 'middle_mcp',
              jointAxis: 'y',
              children: [
                {
                  name: 'middle_ip',
                  pos: [-0.5, 0, 46],
                  stlPart: 'middle_ip',
                  jointKey: 'middle_pip',
                  jointAxis: 'y',
                },
              ],
            },
          ],
        },
        // --- Ring chain ---
        {
          name: 'ring_mp',
          pos: [-26.69, 1.99, 40.14],
          euler: [-1.536, -1.308, 3.054],
          stlPart: 'ring_mp',
          jointKey: 'ring_abd',
          jointAxis: 'z',
          children: [
            {
              name: 'ring_pp',
              pos: [0, 0, 0],
              euler: [0, Math.PI / 2, 0],
              stlPart: 'ring_pp',
              jointKey: 'ring_mcp',
              jointAxis: 'y',
              children: [
                {
                  name: 'ring_ip',
                  pos: [-0.5, 0, 46],
                  stlPart: 'ring_ip',
                  jointKey: 'ring_pip',
                  jointAxis: 'y',
                },
              ],
            },
          ],
        },
        // --- Pinky chain ---
        {
          name: 'pinky_mp',
          pos: [-55.18, 8.31, 22.42],
          euler: [-1.497, -0.861, 2.884],
          stlPart: 'pinky_mp',
          jointKey: 'pinky_abd',
          jointAxis: 'z',
          children: [
            {
              name: 'pinky_pp',
              pos: [0, 0, 0],
              euler: [0, Math.PI / 2, 0],
              stlPart: 'pinky_pp',
              jointKey: 'pinky_mcp',
              jointAxis: 'y',
              children: [
                {
                  name: 'pinky_ip',
                  pos: [-0.5, 0, 33],
                  stlPart: 'pinky_ip',
                  jointKey: 'pinky_pip',
                  jointAxis: 'y',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// STL URL builder
// ---------------------------------------------------------------------------

const BASE_PATH =
  '/api/files/devices/odyn-sift/models/orca-hand/orcahand_description/assets/mjcf';

function stlUrl(side: 'left' | 'right', part: string): string {
  return `${BASE_PATH}/${side}/visual/${side}_visual_${part}.stl`;
}

// ---------------------------------------------------------------------------
// Shared material
// ---------------------------------------------------------------------------

function createBoneMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#d4ccc0',
    metalness: 0.35,
    roughness: 0.45,
  });
}

function createSkinMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#e8d8c4',
    metalness: 0.05,
    roughness: 0.85,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** Skin overlay parts — loaded on the SAME body group as the bone mesh */
const SKIN_PARTS: Record<string, string> = {
  palm: 'palm_skin',
  thumb_ip: 'thumb_ip_skin',
  thumb_dp: 'thumb_dp_skin',
  index_pp: 'index_pp_skin',
  index_ip: 'index_ip_skin',
  middle_pp: 'middle_pp_skin',
  middle_ip: 'middle_ip_skin',
  ring_pp: 'ring_pp_skin',
  ring_ip: 'ring_ip_skin',
  pinky_pp: 'pinky_pp_skin',
  pinky_ip: 'pinky_ip_skin',
};

// ---------------------------------------------------------------------------
// Builder — recursively constructs the Group hierarchy
// ---------------------------------------------------------------------------

interface JointEntry {
  group: THREE.Group;
  baseEuler: THREE.Euler;
  axis: Axis;
}

function buildHierarchy(
  def: BodyDef,
  side: 'left' | 'right',
  loader: STLLoader,
  material: THREE.MeshStandardMaterial,
  skinMaterial: THREE.MeshStandardMaterial,
  jointMap: Map<keyof HandJointAngles, JointEntry>,
  pendingLoads: Promise<void>[],
): THREE.Group {
  const group = new THREE.Group();
  group.name = `${side}_${def.name}`;

  // Set local position from MJCF (already in mm)
  group.position.set(def.pos[0], def.pos[1], def.pos[2]);

  // Set base euler from MJCF (intrinsic XYZ)
  const baseEuler = new THREE.Euler(
    def.euler?.[0] ?? 0,
    def.euler?.[1] ?? 0,
    def.euler?.[2] ?? 0,
    'XYZ',
  );
  group.rotation.copy(baseEuler);

  // Register joint for angle control
  if (def.jointKey && def.jointAxis) {
    jointMap.set(def.jointKey, {
      group,
      baseEuler: baseEuler.clone(),
      axis: def.jointAxis,
    });
  }

  // Load STL mesh if this body has a visual part
  if (def.stlPart) {
    const url = stlUrl(side, def.stlPart);
    const promise = new Promise<void>((resolve) => {
      loader.load(
        url,
        (geometry) => {
          geometry.computeVertexNormals();
          const mesh = new THREE.Mesh(geometry, material);
          mesh.name = `${side}_mesh_${def.stlPart}`;
          // STL files are already in mm — no scale needed
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
          resolve();
        },
        undefined,
        (err) => {
          console.warn(`[ArticulatedHand] Failed to load ${url}:`, err);
          resolve();
        },
      );
    });
    pendingLoads.push(promise);

    // Also load skin overlay if one exists for this part
    const skinPart = SKIN_PARTS[def.stlPart];
    if (skinPart) {
      const skinUrl = stlUrl(side, skinPart);
      const skinPromise = new Promise<void>((resolve) => {
        loader.load(
          skinUrl,
          (geometry) => {
            geometry.computeVertexNormals();
            const mesh = new THREE.Mesh(geometry, skinMaterial);
            mesh.name = `${side}_skin_${skinPart}`;
            // STL files are already in mm — no scale needed
            mesh.renderOrder = 2;
            group.add(mesh);
            resolve();
          },
          undefined,
          () => resolve(),
        );
      });
      pendingLoads.push(skinPromise);
    }
  }

  // Recurse children
  if (def.children) {
    for (const child of def.children) {
      const childGroup = buildHierarchy(
        child,
        side,
        loader,
        material,
        skinMaterial,
        jointMap,
        pendingLoads,
      );
      group.add(childGroup);
    }
  }

  return group;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createArticulatedHand(
  side: 'left' | 'right',
  onLoaded?: () => void,
): {
  group: THREE.Group;
  setJointAngles: (angles: Partial<HandJointAngles>) => void;
  dispose: () => void;
} {
  const loader = new STLLoader();
  const material = createBoneMaterial();
  const skinMat = createSkinMaterial();
  const jointMap = new Map<keyof HandJointAngles, JointEntry>();
  const pendingLoads: Promise<void>[] = [];

  const root = buildHierarchy(
    LEFT_HAND_TREE,
    side,
    loader,
    material,
    skinMat,
    jointMap,
    pendingLoads,
  );

  // Wrap in an outer group so the Z-up -> Y-up rotation is isolated
  const outerGroup = new THREE.Group();
  outerGroup.name = `orca_hand_${side}`;

  // Convert MJCF Z-up to Three.js Y-up, fingers pointing down toward parts
  // Rx(-PI/2): MJCF +Z (fingers) → Three.js -Y (down toward basket)
  //            MJCF +Y (forward) → Three.js +Z (away from viewer)
  //            MJCF +X (lateral) → Three.js +X (unchanged)
  root.rotation.set(-Math.PI / 2, 0, 0, 'XYZ');

  if (side === 'right') {
    // Mirror the entire hand along X
    root.scale.set(-1, 1, 1);
  }

  outerGroup.add(root);

  // Notify caller when all meshes are loaded
  if (pendingLoads.length > 0) {
    Promise.all(pendingLoads).then(() => onLoaded?.());
  } else {
    // No meshes to load (shouldn't happen, but handle gracefully)
    queueMicrotask(() => onLoaded?.());
  }

  // Apply default pose
  const currentAngles: HandJointAngles = { ...DEFAULT_JOINT_ANGLES };

  function applyAngles(): void {
    for (const [key, entry] of jointMap) {
      const angle = currentAngles[key];
      // Start from base euler, then add joint rotation on the joint's axis
      const e = entry.baseEuler;
      switch (entry.axis) {
        case 'x':
          entry.group.rotation.set(e.x + angle, e.y, e.z, 'XYZ');
          break;
        case 'y':
          entry.group.rotation.set(e.x, e.y + angle, e.z, 'XYZ');
          break;
        case 'z':
          entry.group.rotation.set(e.x, e.y, e.z + angle, 'XYZ');
          break;
      }
    }
  }

  // Set initial pose
  applyAngles();

  function setJointAngles(angles: Partial<HandJointAngles>): void {
    for (const [key, value] of Object.entries(angles)) {
      if (key in currentAngles) {
        currentAngles[key as keyof HandJointAngles] = value as number;
      }
    }
    applyAngles();
  }

  function dispose(): void {
    outerGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
      }
    });
    material.dispose();
    skinMat.dispose();
    jointMap.clear();
  }

  return { group: outerGroup, setJointAngles, dispose };
}

// ---------------------------------------------------------------------------
// Animation helper
// ---------------------------------------------------------------------------

/** Linearly interpolate between two joint angle sets */
export function lerpJointAngles(
  a: HandJointAngles,
  b: HandJointAngles,
  t: number,
): HandJointAngles {
  const clamped = Math.max(0, Math.min(1, t));
  const result = {} as HandJointAngles;
  for (const key of Object.keys(a) as (keyof HandJointAngles)[]) {
    result[key] = a[key] + (b[key] - a[key]) * clamped;
  }
  return result;
}

/** Ease-in-out cubic for smoother animations */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
