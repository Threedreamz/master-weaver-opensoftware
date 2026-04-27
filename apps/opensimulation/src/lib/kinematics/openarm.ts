/**
 * Copied from ODYN-starter/apps/odyn-maker/src/components/simulation/ (M1 copy-first migration).
 * Do not modify here — the canonical owner is now opensimulation.
 * ODYN still has its own copy for odyn-maker UI; a future @opensoftware/sim-core package
 * will dedupe when drift becomes a problem (M2 ticket).
 */

/**
 * ODYN Sift — OpenArm v10 Kinematic Chain
 *
 * Builds a Three.js scene-graph arm for left/right sides.
 * Positions in mm (matching the simulation coordinate system).
 * Uses CCD IK to track the hand (wrist) position each frame.
 *
 * Arm root sits outside the Fuse Sift front face, pointing inward (-Z).
 */

import * as THREE from 'three';

const D2R = Math.PI / 180;

// ---------------------------------------------------------------------------
// Chain definition — OpenArm v10, positions in mm
// ---------------------------------------------------------------------------

interface JointDef {
  /** Offset from parent joint origin to this joint origin (mm) */
  p: [number, number, number];
  /** Rotation axis in local frame */
  ax: [number, number, number];
  lo: number; // rad
  hi: number; // rad
}

// J1–J3 sind starr (Alurohr durch ATEX-Port) — kumulierter Offset bis J4-Ansatz
const RIGID_OFFSET: [number, number, number] = [0, 0, 188.75]; // mm

// Nur J4–J7 aktiv
const CHAIN: JointDef[] = [
  { p: [  0.0,  31.5,   153.75 ], ax: [0,1,0], lo:   0,      hi: 140*D2R },
  { p: [  0.0, -31.5,    95.5  ], ax: [0,0,1], lo: -90*D2R,  hi:  90*D2R },
  { p: [ 37.5,   0.0,   120.5  ], ax: [1,0,0], lo: -45*D2R,  hi:  45*D2R },
  { p: [-37.5,   0.0,     0.0  ], ax: [0,1,0], lo: -90*D2R,  hi:  90*D2R },
];

// Wrist-to-TCP offset (mm) — matches articulated-hand wrist offset
const WRIST_OFFSET: [number, number, number] = [40.63, 0, 104.87];

// Arm root position (mm) — outside machine, through port
const ROOT_POS: Record<'left' | 'right', [number, number, number]> = {
  right: [ 180, 900, 685],
  left:  [-180, 900, 685],
};

// Arm root faces into machine: local +Z → world -Z
const ROOT_ROT_Y = Math.PI;

// ---------------------------------------------------------------------------
// Segment material
// ---------------------------------------------------------------------------

const SEG_COLOR: Record<'left' | 'right', number> = {
  right: 0x7a3820,
  left:  0x1e3a6e,
};

const JOINT_COLOR: Record<'left' | 'right', number> = {
  right: 0xff5500,
  left:  0x2266ff,
};

// ---------------------------------------------------------------------------
// CCD IK
// ---------------------------------------------------------------------------

const MAX_IK_ITERS = 20;
const IK_TOL = 2; // mm

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface OpenArm {
  group: THREE.Group;
  setWristTarget(worldPos: THREE.Vector3): void;
  dispose(): void;
}

export function createOpenArm(side: 'left' | 'right'): OpenArm {
  // Einheitliches Material für alle Glieder (starr + aktiv)
  const segMat = new THREE.MeshStandardMaterial({
    color: SEG_COLOR[side], metalness: 0.65, roughness: 0.35,
  });

  // Root group — positioned at port, rotated to face chamber
  const root = new THREE.Group();
  root.position.set(...ROOT_POS[side]);
  root.rotation.y = ROOT_ROT_Y;

  // STL-Loader (lazy import — Three.js STLLoader)
  // Wir verwenden einen einfachen fetch+parse Ansatz falls STLLoader nicht importiert ist.
  // In diesem Modul gehen wir davon aus dass STLLoader über den Build verfügbar ist.
  const MESH_BASE = '/devices/odyn-sift/ros2/src/odyn_sift_description/meshes/arm/';
  const segMeshes: THREE.Mesh[] = [];

  // Hilfsfunktion: STL laden (async, Fallback-Mesh sofort hinzufügen)
  function loadSTL(
    idx: number,
    target: THREE.Object3D,
    mat: THREE.MeshStandardMaterial,
    fallback: THREE.BufferGeometry
  ) {
    const placeholder = new THREE.Mesh(fallback, mat.clone());
    target.add(placeholder);
    segMeshes.push(placeholder);

    fetch(MESH_BASE + 'link' + idx + '.stl')
      .then(r => r.ok ? r.arrayBuffer() : Promise.reject())
      .then(buf => {
        // Minimal STL binary parser
        const view  = new DataView(buf);
        const nTri  = view.getUint32(80, true);
        const pos: number[] = [];
        const norm: number[] = [];
        for (let t = 0; t < nTri; t++) {
          const base = 84 + t * 50;
          const nx = view.getFloat32(base,     true);
          const ny = view.getFloat32(base + 4, true);
          const nz = view.getFloat32(base + 8, true);
          for (let v = 0; v < 3; v++) {
            const vb = base + 12 + v * 12;
            pos.push(
              view.getFloat32(vb,     true) * 0.001,
              view.getFloat32(vb + 4, true) * 0.001,
              view.getFloat32(vb + 8, true) * 0.001
            );
            norm.push(nx, ny, nz);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('normal',   new THREE.Float32BufferAttribute(norm, 3));
        placeholder.geometry.dispose();
        placeholder.geometry = geo;
      })
      .catch(() => {}); // Fallback bleibt
  }

  // ── link0: Sockel (starr am Port) ─────────────────────────────────
  loadSTL(0, root, segMat, new THREE.CylinderGeometry(38, 38, 40, 16));

  // ── link1–link3: starrer Ausleger (fixed Groups) ──────────────────
  // Offsets aus RIGID_OFFSET aufgeteilt in die originalen J1–J3-Segmente:
  const RIGID_SEGS: [number,number,number][] = [
    [0,       0,       62.5  ],  // J1-Offset (mm)
    [-30.1,   0,       60.0  ],  // J2-Offset
    [ 30.1,   0,       66.25 ],  // J3-Offset
  ];
  let rigidParent: THREE.Object3D = root;
  RIGID_SEGS.forEach((p, i) => {
    const grp = new THREE.Group();
    grp.position.set(p[0] * 0.001, p[1] * 0.001, p[2] * 0.001);
    rigidParent.add(grp);
    const segLen = Math.sqrt(p[0]**2 + p[1]**2 + p[2]**2) * 0.001;
    loadSTL(i + 1, grp, segMat,
      new THREE.CylinderGeometry(20, 20, Math.max(segLen, 0.030), 10)
    );
    rigidParent = grp;
  });

  // ── Aktive Gelenke J4–J7: Pivots + link4–link7 ───────────────────
  const pivots: THREE.Group[] = [];
  const angles: number[] = CHAIN.map(() => 0);
  let parent: THREE.Object3D = rigidParent;

  CHAIN.forEach((j, i) => {
    const piv = new THREE.Group();
    piv.position.set(...j.p);
    parent.add(piv);
    pivots.push(piv);

    // Gelenkkugel (farbig — aktives Gelenk)
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(16, 10, 8), segMat.clone());
    piv.add(sphere);

    // STL link4…link7 am Pivot
    const nextP = i < CHAIN.length - 1 ? CHAIN[i+1].p : WRIST_OFFSET;
    const fallbackLen = Math.max(vec3(...nextP).length(), 25);
    loadSTL(i + 4, piv, segMat,
      new THREE.CylinderGeometry(14, 14, fallbackLen, 8)
    );

    parent = piv;
  });

  // Wrist group (TCP offset after last joint)
  const wristGrp = new THREE.Group();
  wristGrp.position.set(...WRIST_OFFSET);
  parent.add(wristGrp);

  // Apply current angles to pivots
  function applyAngles() {
    CHAIN.forEach((j, i) => {
      pivots[i].setRotationFromAxisAngle(
        new THREE.Vector3(...j.ax),
        angles[i]
      );
    });
  }

  // Get world position of TCP (wrist group)
  function getTCPWorld(): THREE.Vector3 {
    root.updateWorldMatrix(true, true);
    wristGrp.updateWorldMatrix(true, false);
    const wp = new THREE.Vector3();
    wristGrp.getWorldPosition(wp);
    return wp;
  }

  // CCD IK — iterates tip→base, clamps to limits
  function setWristTarget(worldPos: THREE.Vector3) {
    for (let iter = 0; iter < MAX_IK_ITERS; iter++) {
      applyAngles();
      const tcp = getTCPWorld();
      if (tcp.distanceTo(worldPos) < IK_TOL) break;

      // Iterate from tip (joint 6) to base (joint 0)
      for (let i = pivots.length - 1; i >= 0; i--) {
        applyAngles();

        pivots[i].updateWorldMatrix(true, false);
        wristGrp.updateWorldMatrix(true, false);

        const pivWorld = new THREE.Vector3();
        pivots[i].getWorldPosition(pivWorld);
        const tcpWorld = new THREE.Vector3();
        wristGrp.getWorldPosition(tcpWorld);

        const toTCP = tcpWorld.clone().sub(pivWorld).normalize();
        const toTarget = worldPos.clone().sub(pivWorld).normalize();

        // Rotation in world space
        const q = new THREE.Quaternion().setFromUnitVectors(toTCP, toTarget);

        // Convert to local axis angle
        const axisWorld = new THREE.Vector3(...CHAIN[i].ax);
        // Transform axis to world frame of parent
        const parentWorld = new THREE.Quaternion();
        if (pivots[i].parent) {
          pivots[i].parent!.getWorldQuaternion(parentWorld);
        }
        const axisWorldFrame = axisWorld.clone().applyQuaternion(parentWorld);

        // Project rotation onto joint axis
        const dot = q.w > 1 ? 1 : q.w < -1 ? -1 : q.w;
        const angle = 2 * Math.acos(Math.abs(dot));
        const rotAxis = new THREE.Vector3(q.x, q.y, q.z).normalize();
        const proj = rotAxis.dot(axisWorldFrame);
        const delta = angle * proj * (dot < 0 ? -1 : 1);

        angles[i] = clamp(angles[i] + delta, CHAIN[i].lo, CHAIN[i].hi);
      }
    }
    applyAngles();
  }

  function dispose() {
    segMeshes.forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    segMat.dispose();
  }

  return { group: root, setWristTarget, dispose };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function vec3(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z);
}

function makeCylinder(len: number, r: number, mat: THREE.MeshStandardMaterial) {
  const geo = new THREE.CylinderGeometry(r, r, len, 8);
  return new THREE.Mesh(geo, mat);
}

function alignCylinder(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  const mid = from.clone().add(dir.clone().multiplyScalar(0.5));
  mesh.position.copy(mid);
  if (len > 0.001) {
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
  }
}
