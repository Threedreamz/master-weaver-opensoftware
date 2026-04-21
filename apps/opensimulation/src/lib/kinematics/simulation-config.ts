/**
 * Copied from ODYN-starter/apps/odyn-maker/src/components/simulation/ (M1 copy-first migration).
 * Do not modify here — the canonical owner is now opensimulation.
 * ODYN still has its own copy for odyn-maker UI; a future @opensoftware/sim-core package
 * will dedupe when drift becomes a problem (M2 ticket).
 */

/**
 * ODYN Sift 3D Simulation — Simplified Assembly
 *
 * Strategy: Use the FULL SCAD assembly as ground truth (everything already
 * positioned correctly), then overlay the real ORCA hand STLs on top.
 *
 * Coordinate system: All STLs are Z-up (SCAD). Viewer applies rotateX(-PI/2).
 */

// ---------------------------------------------------------------------------
// Dimension constants (mm)
// ---------------------------------------------------------------------------
export const SIFT_WIDTH = 1015;
export const SIFT_DEPTH = 610;
export const SIFT_HEIGHT = 1545;
export const SIFT_WALL_THICKNESS = 3;
export const SIFT_GLOVE_PORT_Y_OFFSET = 180;
export const SIFT_GLOVE_PORT_Z = 900;
export const ADAPTER_FLANGE_THICKNESS = 12;
export const PASSTHROUGH_LENGTH = 80;
export const SIFT_BASKET_DIAMETER = 450;
export const SIFT_BASKET_DEPTH = 250;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimMaterialConfig {
  color: string;
  opacity: number;
  transparent: boolean;
  metalness: number;
  roughness: number;
  wireframe?: boolean;
  side?: 'front' | 'double';
}

export interface SimPartConfig {
  id: string;
  label: string;
  group: (typeof PART_GROUPS)[number];
  stlUrl?: string;
  procedural?: 'box' | 'cylinder';
  proceduralSize?: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  skipZUpRotation?: boolean;
  material: SimMaterialConfig;
  visible: boolean;
}

export type CleaningMode = 'powder_saving' | 'time_saving';
export type CleaningStrategy = 'simple' | 'standard' | 'thorough' | 'gentle';

export interface SimResultData {
  partId: string;
  mode: CleaningMode;
  strategy: CleaningStrategy;
  predictedPowderCoverage: number;
  predictedCycleTimeS: number;
  predictedPowderLossG: number;
  graspSuccessProbability: number;
  steps: Array<{
    action: string;
    durationS: number;
    coverageAfter: number;
    powderLostG: number;
  }>;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export const PART_GROUPS = [
  'sift',
  'hands',
  'tools',
  'parts',
] as const;

export const GROUP_LABELS: Record<string, string> = {
  sift: 'Fuse Sift Body',
  hands: 'ORCA Hands',
  tools: 'Tool Dock',
  parts: 'SLS Sample Parts',
};

// ---------------------------------------------------------------------------
// Hand wrist offset — 20mm gap from passthrough end to hand start (SCAD +20)
// ---------------------------------------------------------------------------
const HAND_WRIST_GAP = 20;

// ---------------------------------------------------------------------------
// STL URL helpers — use decimated/binary versions for fast loading
// ---------------------------------------------------------------------------

const hw = (name: string) =>
  `/api/files/devices/odyn-sift/scad/hardware/${name}.stl`;
const asm = (name: string) =>
  `/api/files/devices/odyn-sift/scad/assemblies/${name}.stl`;

// ---------------------------------------------------------------------------
// Positions
// After rotateX(-PI/2): SCAD(X,Y,Z) → Three.js(X, Z, -Y)
// SCAD front face Y=-305 → Three.js Z = +305
// SCAD port height Z=900 → Three.js Y = 900
// ---------------------------------------------------------------------------

const PORT_Z = SIFT_GLOVE_PORT_Z; // 900 → Three.js Y
const FRONT = SIFT_DEPTH / 2;      // 305 → Three.js Z (front face)

// ORCA hand wrist position in SCAD: (±180, -213, 900)
// -213 = -305 + 12 (adapter) + 80 (passthrough)
// → Three.js: (±180, 900, 213)
// Hand geometry centers: left X≈-96, right X≈+96
// Offset: port X (±180) - geometry center (±96) = ±84

export const SIMULATION_PARTS: SimPartConfig[] = [

  // =========================================================================
  // FUSE SIFT BODY — transparent envelope (171KB, 1K tris)
  // SCAD coords at origin, viewer rotateX(-PI/2) converts Z-up → Y-up
  // =========================================================================

  {
    id: 'sift-body',
    label: 'Fuse Sift Enclosure',
    group: 'sift',
    stlUrl: hw('fuse_sift_envelope_rendered'),
    position: [0, 0, 0],
    material: {
      color: '#8899aa',
      opacity: 0.15,
      transparent: true,
      metalness: 0.3,
      roughness: 0.5,
      side: 'double' as const,
    },
    visible: true,
  },

  // =========================================================================
  // ORCA HANDS — decimated real hand STLs (721KB each, ~15K tris)
  //
  // Positioning math:
  //   SCAD hand placement: translate([±180, -193, 900]) rotate([90,0,0])
  //   where -193 = -sift_depth/2 + adapter_flange + passthrough + 20mm gap
  //
  //   Viewer applies geometry.rotateX(-PI/2) converting Z-up → Y-up.
  //   Config rotation [-90,0,0] then tilts fingers from Y+ (up) to -Z (into sift).
  //
  //   Hand STL wrist at Z≈0, X center at ±96 (left=-96, right=+96).
  //   After both rotations, wrist vertex stays on X axis (unaffected).
  //   Target wrist in Three.js: (±180, 900, 193)
  //   → pos.x = ±180 ∓ 96 = ±84
  //   → pos.y = 900 (port height)
  //   → pos.z = 193 (= FRONT - flange - passthrough - wrist_gap)
  // =========================================================================

  // ORCA hands are loaded as articulated multi-mesh groups
  // via createArticulatedHand() in the viewer — not as single STL configs.

  // =========================================================================
  // TOOL DOCK — fixed cleaning tools inside sift (right side)
  // Position: Right side of sift interior, accessible by both hands
  // Tool positions from firmware/orchestrator/primitives.py (relative to sift)
  // =========================================================================

  // Brush station — rotating cylindrical brush for powder removal
  {
    id: 'tool-brush-base',
    label: 'Brush Station Base',
    group: 'tools',
    procedural: 'box',
    proceduralSize: [120, 30, 80],
    position: [300, 650, -150],
    material: {
      color: '#2a2a2a',
      opacity: 1,
      transparent: false,
      metalness: 0.7,
      roughness: 0.3,
    },
    visible: true,
  },
  {
    id: 'tool-brush-roller',
    label: 'Rotating Brush',
    group: 'tools',
    procedural: 'cylinder',
    proceduralSize: [25, 100, 24],   // r=25mm, h=100mm
    position: [300, 700, -150],
    rotation: [0, 0, 90],            // Horizontal orientation
    material: {
      color: '#8B6914',
      opacity: 1,
      transparent: false,
      metalness: 0.1,
      roughness: 0.95,
    },
    visible: true,
  },

  // Vacuum nozzle — suction extraction for loose powder
  {
    id: 'tool-vacuum-base',
    label: 'Vacuum Station',
    group: 'tools',
    procedural: 'box',
    proceduralSize: [80, 30, 80],
    position: [300, 650, -30],
    material: {
      color: '#2a2a2a',
      opacity: 1,
      transparent: false,
      metalness: 0.7,
      roughness: 0.3,
    },
    visible: true,
  },
  {
    id: 'tool-vacuum-nozzle',
    label: 'Vacuum Nozzle',
    group: 'tools',
    procedural: 'cylinder',
    proceduralSize: [12, 80, 16],    // r=12mm, h=80mm
    position: [300, 710, -30],
    material: {
      color: '#555555',
      opacity: 1,
      transparent: false,
      metalness: 0.8,
      roughness: 0.2,
    },
    visible: true,
  },

  // Tap edge — hard surface for impact-based powder removal
  {
    id: 'tool-tap-edge',
    label: 'Tap Edge',
    group: 'tools',
    procedural: 'box',
    proceduralSize: [150, 8, 40],
    position: [300, 680, 80],
    material: {
      color: '#404040',
      opacity: 1,
      transparent: false,
      metalness: 0.9,
      roughness: 0.15,
    },
    visible: true,
  },

  // Vacuum hose (visual — connecting nozzle to extraction)
  {
    id: 'tool-vacuum-hose',
    label: 'Vacuum Hose',
    group: 'tools',
    procedural: 'cylinder',
    proceduralSize: [18, 200, 12],   // r=18mm, h=200mm
    position: [400, 750, -30],
    rotation: [30, 0, 0],
    material: {
      color: '#333333',
      opacity: 0.7,
      transparent: true,
      metalness: 0.3,
      roughness: 0.6,
    },
    visible: true,
  },

  // =========================================================================
  // SLS SAMPLE PARTS — in the sieve basket area
  // =========================================================================

  {
    id: 'part-turbine-bracket',
    label: 'Turbine Bracket',
    group: 'parts',
    procedural: 'box',
    proceduralSize: [120, 60, 85],
    position: [-40, 680, 30],
    material: {
      color: '#ffffff',
      opacity: 1,
      transparent: false,
      metalness: 0.0,
      roughness: 0.9,
    },
    visible: true,
  },

  {
    id: 'part-gear',
    label: 'SLS Gear',
    group: 'parts',
    procedural: 'cylinder',
    proceduralSize: [20, 30, 24],
    position: [60, 670, -20],
    material: {
      color: '#f0f0f0',
      opacity: 1,
      transparent: false,
      metalness: 0.0,
      roughness: 0.85,
    },
    visible: true,
  },

  {
    id: 'part-l-bracket',
    label: 'L-Bracket',
    group: 'parts',
    procedural: 'box',
    proceduralSize: [80, 40, 60],
    position: [20, 690, -50],
    material: {
      color: '#e8e8e8',
      opacity: 1,
      transparent: false,
      metalness: 0.0,
      roughness: 0.9,
    },
    visible: true,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getPartById(id: string): SimPartConfig | undefined {
  return SIMULATION_PARTS.find((p) => p.id === id);
}

export function getPartsByGroup(
  group: (typeof PART_GROUPS)[number],
): SimPartConfig[] {
  return SIMULATION_PARTS.filter((p) => p.group === group);
}

export const TOTAL_PARTS = SIMULATION_PARTS.length;

// ---------------------------------------------------------------------------
// Articulated hand placement — where the hand root group goes in Three.js
// Same math as before but applied to the group, not the mesh
// ---------------------------------------------------------------------------
export const HAND_LEFT_POSITION: [number, number, number] = [
  -SIFT_GLOVE_PORT_Y_OFFSET,
  SIFT_GLOVE_PORT_Z,
  SIFT_DEPTH / 2 - ADAPTER_FLANGE_THICKNESS - PASSTHROUGH_LENGTH - 20,
];
export const HAND_RIGHT_POSITION: [number, number, number] = [
  SIFT_GLOVE_PORT_Y_OFFSET,
  SIFT_GLOVE_PORT_Z,
  SIFT_DEPTH / 2 - ADAPTER_FLANGE_THICKNESS - PASSTHROUGH_LENGTH - 20,
];

// ---------------------------------------------------------------------------
// Tool dock positions (Three.js Y-up, mm) — used by frame-calculator
// ---------------------------------------------------------------------------
export const TOOL_BRUSH_POSITION: [number, number, number] = [300, 700, -150];
export const TOOL_VACUUM_POSITION: [number, number, number] = [300, 710, -30];
export const TOOL_TAP_POSITION: [number, number, number] = [300, 680, 80];

// ---------------------------------------------------------------------------
// Animation — now driven by frame-calculator.ts
// The old keyframe system is replaced by pre-computed frame tables.
// See frame-calculator.ts for the 40-frame pick-pass-place sequence.
// ---------------------------------------------------------------------------

export { FRAME_TABLE, TOTAL_FRAMES, FRAME_DURATION_MS, STEP_LABELS } from './frame-calculator';
export type { SimFrame } from './frame-calculator';
