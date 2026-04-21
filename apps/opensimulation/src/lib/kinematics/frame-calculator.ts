/**
 * Copied from ODYN-starter/apps/odyn-maker/src/components/simulation/ (M1 copy-first migration).
 * Do not modify here — the canonical owner is now opensimulation.
 * ODYN still has its own copy for odyn-maker UI; a future @opensoftware/sim-core package
 * will dedupe when drift becomes a problem (M2 ticket).
 */

/**
 * ODYN Sift — Depowdering Sequence Frame Calculator
 *
 * Pre-computes 80 animation frames (~1 FPS) for the full SLS depowdering
 * simulation: PICKUP → BRUSH → VACUUM → TAP → HANDOVER → INSPECT → PLACE
 *
 * Uses real ORCA hand grasp poses from firmware documentation.
 * Coordinate system: Three.js Y-up, positions in mm.
 */

import {
  type HandJointAngles,
  DEFAULT_JOINT_ANGLES,
  OPEN_HAND_ANGLES,
  POWER_GRASP_ANGLES,
  BRUSH_STROKE_ANGLES,
  CUP_SHAPE_ANGLES,
  TAP_GRIP_ANGLES,
  lerpJointAngles,
} from './articulated-hand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimFrame {
  frameIndex: number;
  time: number;
  step: number;
  stepFrame: number;
  stepLabel: string;
  leftHandPos: [number, number, number];
  rightHandPos: [number, number, number];
  leftFingers: HandJointAngles;
  rightFingers: HandJointAngles;
  partPos: [number, number, number];
  partHolder: 'left' | 'right' | null;
  /** Part rotation in degrees [rx, ry, rz] */
  partRotation?: [number, number, number];
  /** Brush roller is active/spinning */
  brushActive?: boolean;
  /** Vacuum nozzle is active */
  vacuumActive?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TOTAL_FRAMES = 80;
export const FRAME_DURATION_MS = 800;
export const STEP_LABELS = [
  'Left hand reaches for part',
  'Left hand lifts to brush',
  'Brush cleaning — rotating part',
  'Vacuum extraction',
  'Tap — dislodge trapped powder',
  'Handover — left to right',
  'Inspect part (rotate)',
  'Right hand places clean part',
];

type Vec3 = [number, number, number];

// Key positions (Three.js Y-up, mm)
const LEFT_REST: Vec3 = [-180, 900, 193];
const RIGHT_REST: Vec3 = [180, 900, 193];
const PART_START: Vec3 = [-40, 680, 30];

// Tool dock working positions
const BRUSH_APPROACH: Vec3 = [200, 750, -150];
const BRUSH_CONTACT: Vec3 = [280, 720, -150];
const VACUUM_APPROACH: Vec3 = [200, 750, -30];
const VACUUM_CONTACT: Vec3 = [280, 720, -30];
const TAP_APPROACH: Vec3 = [250, 740, 80];
const TAP_CONTACT: Vec3 = [300, 695, 80];
const HANDOVER_POINT: Vec3 = [0, 850, 100];
const INSPECT_POS: Vec3 = [100, 900, 0];
const PART_END: Vec3 = [200, 680, -100];

// Right hand support positions
const RIGHT_SUPPORT_BRUSH: Vec3 = [350, 750, -150];
const RIGHT_SUPPORT_VACUUM: Vec3 = [350, 750, -30];

const HOLD_OFFSET: Vec3 = [0, -30, 0];

// Step frame counts — total = 80
const STEP_FRAMES = [10, 8, 15, 12, 10, 10, 8, 7];

// ---------------------------------------------------------------------------
// Interpolation helpers
// ---------------------------------------------------------------------------

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpPos(a: Vec3, b: Vec3, t: number): Vec3 {
  const e = ease(t);
  return [
    a[0] + (b[0] - a[0]) * e,
    a[1] + (b[1] - a[1]) * e,
    a[2] + (b[2] - a[2]) * e,
  ];
}

function addOffset(pos: Vec3, offset: Vec3): Vec3 {
  return [pos[0] + offset[0], pos[1] + offset[1], pos[2] + offset[2]];
}

// ---------------------------------------------------------------------------
// Frame generation
// ---------------------------------------------------------------------------

function buildFrameTable(): SimFrame[] {
  const frames: SimFrame[] = [];
  let frameOffset = 0;

  for (let stepIdx = 0; stepIdx < STEP_FRAMES.length; stepIdx++) {
    const stepLen = STEP_FRAMES[stepIdx];
    const step = stepIdx + 1;

    for (let sf = 0; sf < stepLen; sf++) {
      const i = frameOffset + sf;
      const t = stepLen > 1 ? sf / (stepLen - 1) : 1;

      let leftHandPos: Vec3;
      let rightHandPos: Vec3;
      let leftFingers: HandJointAngles;
      let rightFingers: HandJointAngles;
      let partPos: Vec3;
      let partHolder: 'left' | 'right' | null;
      let partRotation: [number, number, number] | undefined;
      let brushActive = false;
      let vacuumActive = false;

      switch (step) {
        // -----------------------------------------------------------------
        // Step 1: Left hand reaches for part (10 frames)
        // -----------------------------------------------------------------
        case 1: {
          const GRAB_POS: Vec3 = [-40, 700, 30];
          leftHandPos = lerpPos(LEFT_REST, GRAB_POS, t);
          rightHandPos = [...RIGHT_REST];

          if (sf <= 6) {
            leftFingers = lerpJointAngles(DEFAULT_JOINT_ANGLES, OPEN_HAND_ANGLES, Math.min(t * 1.4, 1));
          } else {
            const closeT = (sf - 7) / 2;
            leftFingers = lerpJointAngles(OPEN_HAND_ANGLES, POWER_GRASP_ANGLES, closeT);
          }
          rightFingers = { ...DEFAULT_JOINT_ANGLES };
          partPos = [...PART_START];
          partHolder = sf >= 9 ? 'left' : null;
          break;
        }

        // -----------------------------------------------------------------
        // Step 2: Left hand lifts part toward brush (8 frames)
        // -----------------------------------------------------------------
        case 2: {
          const LIFT_START: Vec3 = [-40, 700, 30];
          leftHandPos = lerpPos(LIFT_START, BRUSH_APPROACH, t);
          rightHandPos = lerpPos(RIGHT_REST, RIGHT_SUPPORT_BRUSH, t);
          leftFingers = { ...POWER_GRASP_ANGLES };
          rightFingers = { ...DEFAULT_JOINT_ANGLES };
          partHolder = 'left';
          partPos = addOffset(leftHandPos, HOLD_OFFSET);
          break;
        }

        // -----------------------------------------------------------------
        // Step 3: Brush cleaning — 3 rotations against spinning brush (15 frames)
        // -----------------------------------------------------------------
        case 3: {
          const contactT = Math.min(t * 3, 1);
          leftHandPos = lerpPos(BRUSH_APPROACH, BRUSH_CONTACT, contactT);
          rightHandPos = [...RIGHT_SUPPORT_BRUSH];

          if (sf <= 3) {
            leftFingers = lerpJointAngles(POWER_GRASP_ANGLES, BRUSH_STROKE_ANGLES, sf / 3);
          } else {
            leftFingers = { ...BRUSH_STROKE_ANGLES };
          }
          rightFingers = { ...DEFAULT_JOINT_ANGLES };

          partHolder = 'left';
          const rotPhase = (sf / stepLen) * 3;
          partRotation = [
            Math.sin(rotPhase * Math.PI) * 45,
            rotPhase * 120,
            Math.cos(rotPhase * Math.PI * 0.5) * 20,
          ];
          partPos = addOffset(leftHandPos, HOLD_OFFSET);
          brushActive = sf >= 2;
          break;
        }

        // -----------------------------------------------------------------
        // Step 4: Vacuum extraction — rotate near nozzle (12 frames)
        // -----------------------------------------------------------------
        case 4: {
          if (sf <= 3) {
            leftHandPos = lerpPos(BRUSH_CONTACT, VACUUM_APPROACH, sf / 3);
            leftFingers = lerpJointAngles(BRUSH_STROKE_ANGLES, CUP_SHAPE_ANGLES, sf / 3);
          } else if (sf <= 9) {
            const vacT = (sf - 4) / 5;
            leftHandPos = lerpPos(VACUUM_APPROACH, VACUUM_CONTACT, Math.min(vacT * 2, 1));
            leftFingers = { ...CUP_SHAPE_ANGLES };
          } else {
            const retractT = (sf - 10) / (stepLen - 11);
            leftHandPos = lerpPos(VACUUM_CONTACT, VACUUM_APPROACH, retractT);
            leftFingers = { ...CUP_SHAPE_ANGLES };
          }
          rightHandPos = lerpPos(RIGHT_SUPPORT_BRUSH, RIGHT_SUPPORT_VACUUM, Math.min(t * 2, 1));
          rightFingers = { ...DEFAULT_JOINT_ANGLES };

          partHolder = 'left';
          const vacRot = (sf / stepLen) * 360;
          partRotation = [0, vacRot, Math.sin(vacRot * Math.PI / 180) * 15];
          partPos = addOffset(leftHandPos, HOLD_OFFSET);
          vacuumActive = sf >= 3 && sf <= 10;
          break;
        }

        // -----------------------------------------------------------------
        // Step 5: Tap to dislodge powder (10 frames)
        // -----------------------------------------------------------------
        case 5: {
          if (sf <= 2) {
            leftHandPos = lerpPos(VACUUM_APPROACH, TAP_APPROACH, sf / 2);
            leftFingers = lerpJointAngles(CUP_SHAPE_ANGLES, TAP_GRIP_ANGLES, sf / 2);
          } else {
            const tapPhase = (sf - 3) / 6;
            const tapCycle = Math.sin(tapPhase * Math.PI * 5);
            const tapY = tapCycle > 0 ? tapCycle * 25 : 0;
            leftHandPos = [TAP_CONTACT[0], TAP_CONTACT[1] + tapY, TAP_CONTACT[2]];
            leftFingers = { ...TAP_GRIP_ANGLES };
          }
          rightHandPos = lerpPos(RIGHT_SUPPORT_VACUUM, [100, 850, 100], t);
          rightFingers = { ...DEFAULT_JOINT_ANGLES };
          partHolder = 'left';
          partPos = addOffset(leftHandPos, HOLD_OFFSET);
          break;
        }

        // -----------------------------------------------------------------
        // Step 6: Handover left to right (10 frames)
        // -----------------------------------------------------------------
        case 6: {
          const LEFT_HO_START: Vec3 = TAP_APPROACH;
          const RIGHT_HO_START: Vec3 = [100, 850, 100];

          leftHandPos = lerpPos(LEFT_HO_START, HANDOVER_POINT, t);
          rightHandPos = lerpPos(RIGHT_HO_START, HANDOVER_POINT, t);

          if (sf <= 4) {
            partHolder = 'left';
            leftFingers = { ...POWER_GRASP_ANGLES };
            rightFingers = lerpJointAngles(OPEN_HAND_ANGLES, POWER_GRASP_ANGLES, sf / 4);
            partPos = addOffset(leftHandPos, HOLD_OFFSET);
          } else {
            partHolder = 'right';
            rightFingers = { ...POWER_GRASP_ANGLES };
            leftFingers = lerpJointAngles(POWER_GRASP_ANGLES, DEFAULT_JOINT_ANGLES, (sf - 5) / 4);
            partPos = addOffset(rightHandPos, HOLD_OFFSET);
          }
          break;
        }

        // -----------------------------------------------------------------
        // Step 7: Inspect — rotate 360° for camera (8 frames)
        // -----------------------------------------------------------------
        case 7: {
          rightHandPos = sf === 0 ? [...HANDOVER_POINT] : lerpPos(HANDOVER_POINT, INSPECT_POS, Math.min(t * 2, 1));
          leftHandPos = lerpPos(HANDOVER_POINT, LEFT_REST, t);
          rightFingers = { ...POWER_GRASP_ANGLES };
          leftFingers = { ...DEFAULT_JOINT_ANGLES };
          partHolder = 'right';
          partRotation = [0, sf * 45, 0];
          partPos = addOffset(rightHandPos, HOLD_OFFSET);
          break;
        }

        // -----------------------------------------------------------------
        // Step 8: Right hand places clean part (7 frames)
        // -----------------------------------------------------------------
        case 8: {
          const PLACE_TARGET: Vec3 = [200, 700, -100];
          leftHandPos = [...LEFT_REST];
          leftFingers = { ...DEFAULT_JOINT_ANGLES };

          if (sf <= 4) {
            rightHandPos = lerpPos(INSPECT_POS, PLACE_TARGET, sf / 4);
            rightFingers = { ...POWER_GRASP_ANGLES };
            partHolder = 'right';
            partPos = addOffset(rightHandPos, HOLD_OFFSET);
          } else {
            const returnT = (sf - 5) / 1;
            rightHandPos = lerpPos(PLACE_TARGET, RIGHT_REST, Math.min(returnT, 1));
            rightFingers = lerpJointAngles(POWER_GRASP_ANGLES, DEFAULT_JOINT_ANGLES, Math.min(returnT, 1));
            partHolder = null;
            partPos = [...PART_END];
            partRotation = undefined;
          }
          break;
        }

        default:
          throw new Error(`Unexpected step: ${step}`);
      }

      frames.push({
        frameIndex: i,
        time: i,
        step,
        stepFrame: sf,
        stepLabel: STEP_LABELS[step - 1],
        leftHandPos,
        rightHandPos,
        leftFingers,
        rightFingers,
        partPos,
        partHolder,
        partRotation,
        brushActive,
        vacuumActive,
      });
    }

    frameOffset += stepLen;
  }

  return frames;
}

// ---------------------------------------------------------------------------
// Pre-computed frame table
// ---------------------------------------------------------------------------

export const FRAME_TABLE: SimFrame[] = buildFrameTable();
