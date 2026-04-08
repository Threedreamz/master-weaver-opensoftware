import type { FDMPrinterProfile } from "../types";

export const BAMBU_X1C: FDMPrinterProfile = {
  id: "bambu-x1c",
  name: "Bambu Lab X1 Carbon",
  manufacturer: "Bambu Lab",
  nozzleDiameter: 0.4,
  buildVolumeX: 256,
  buildVolumeY: 256,
  buildVolumeZ: 256,
  heatedBed: true,
  enclosure: true,
  multiMaterial: { type: "ams", slots: 4 },
  defaultNozzleTemp: 220,
  defaultBedTemp: 60,
  maxSpeed: 500,
  preferredSlicer: "bambu_studio",
};

export const BAMBU_P1S: FDMPrinterProfile = {
  id: "bambu-p1s",
  name: "Bambu Lab P1S",
  manufacturer: "Bambu Lab",
  nozzleDiameter: 0.4,
  buildVolumeX: 256,
  buildVolumeY: 256,
  buildVolumeZ: 256,
  heatedBed: true,
  enclosure: true,
  multiMaterial: { type: "ams", slots: 4 },
  defaultNozzleTemp: 220,
  defaultBedTemp: 60,
  maxSpeed: 500,
  preferredSlicer: "bambu_studio",
};

export const BAMBU_A1: FDMPrinterProfile = {
  id: "bambu-a1",
  name: "Bambu Lab A1",
  manufacturer: "Bambu Lab",
  nozzleDiameter: 0.4,
  buildVolumeX: 256,
  buildVolumeY: 256,
  buildVolumeZ: 256,
  heatedBed: true,
  enclosure: false,
  multiMaterial: { type: "ams_lite", slots: 4 },
  defaultNozzleTemp: 220,
  defaultBedTemp: 60,
  maxSpeed: 500,
  preferredSlicer: "bambu_studio",
};

export const PRUSA_MK4_MMU3: FDMPrinterProfile = {
  id: "prusa-mk4-mmu3",
  name: "Prusa MK4 + MMU3",
  manufacturer: "Prusa Research",
  nozzleDiameter: 0.4,
  buildVolumeX: 250,
  buildVolumeY: 210,
  buildVolumeZ: 220,
  heatedBed: true,
  enclosure: false,
  multiMaterial: { type: "mmu", slots: 5 },
  defaultNozzleTemp: 215,
  defaultBedTemp: 60,
  maxSpeed: 200,
  preferredSlicer: "prusa_slicer",
};

export const PRUSA_XL: FDMPrinterProfile = {
  id: "prusa-xl",
  name: "Prusa XL",
  manufacturer: "Prusa Research",
  nozzleDiameter: 0.4,
  buildVolumeX: 360,
  buildVolumeY: 360,
  buildVolumeZ: 360,
  heatedBed: true,
  enclosure: true,
  multiMaterial: { type: "toolchanger", tools: 5 },
  defaultNozzleTemp: 215,
  defaultBedTemp: 60,
  maxSpeed: 200,
  preferredSlicer: "prusa_slicer",
};

export const GENERIC_KLIPPER: FDMPrinterProfile = {
  id: "generic-klipper",
  name: "Generic Klipper Printer",
  manufacturer: "Generic",
  nozzleDiameter: 0.4,
  buildVolumeX: 300,
  buildVolumeY: 300,
  buildVolumeZ: 300,
  heatedBed: true,
  enclosure: false,
  multiMaterial: { type: "none" },
  defaultNozzleTemp: 200,
  defaultBedTemp: 60,
  maxSpeed: 300,
  preferredSlicer: "orca_slicer",
};

export const FDM_PROFILES: FDMPrinterProfile[] = [
  BAMBU_X1C,
  BAMBU_P1S,
  BAMBU_A1,
  PRUSA_MK4_MMU3,
  PRUSA_XL,
  GENERIC_KLIPPER,
];

export function getFDMProfileById(id: string): FDMPrinterProfile | undefined {
  return FDM_PROFILES.find((p) => p.id === id);
}
