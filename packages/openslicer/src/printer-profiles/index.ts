import type { ResinPrinterProfile } from "../types";

// FDM Profiles
export {
  BAMBU_X1C,
  BAMBU_P1S,
  BAMBU_A1,
  PRUSA_MK4_MMU3,
  PRUSA_XL,
  GENERIC_KLIPPER,
  FDM_PROFILES,
  getFDMProfileById,
} from "./fdm";

export const ELEGOO_MARS_3: ResinPrinterProfile = {
  id: "elegoo-mars-3",
  name: "Elegoo Mars 3",
  manufacturer: "Elegoo",
  resolutionX: 4098,
  resolutionY: 2560,
  displayWidth: 143.43,
  displayHeight: 89.6,
  buildHeight: 175,
  pixelSize: 0.035,
  mirrorX: true,
  mirrorY: false,
  outputFormat: "ctb",
};

export const ELEGOO_SATURN_3: ResinPrinterProfile = {
  id: "elegoo-saturn-3",
  name: "Elegoo Saturn 3",
  manufacturer: "Elegoo",
  resolutionX: 11520,
  resolutionY: 5120,
  displayWidth: 218.88,
  displayHeight: 122.88,
  buildHeight: 260,
  pixelSize: 0.019,
  mirrorX: true,
  mirrorY: false,
  outputFormat: "goo",
};

export const ANYCUBIC_PHOTON_MONO_X2: ResinPrinterProfile = {
  id: "anycubic-photon-mono-x2",
  name: "Anycubic Photon Mono X2",
  manufacturer: "Anycubic",
  resolutionX: 4096,
  resolutionY: 2560,
  displayWidth: 196.6,
  displayHeight: 122.9,
  buildHeight: 200,
  pixelSize: 0.048,
  mirrorX: true,
  mirrorY: false,
  outputFormat: "ctb",
};

export const PRUSA_SL1S: ResinPrinterProfile = {
  id: "prusa-sl1s",
  name: "Prusa SL1S Speed",
  manufacturer: "Prusa Research",
  resolutionX: 2560,
  resolutionY: 1620,
  displayWidth: 127.68,
  displayHeight: 80.82,
  buildHeight: 180,
  pixelSize: 0.049875,
  mirrorX: false,
  mirrorY: false,
  outputFormat: "sl1",
};

export const BUILTIN_PROFILES: ResinPrinterProfile[] = [
  ELEGOO_MARS_3,
  ELEGOO_SATURN_3,
  ANYCUBIC_PHOTON_MONO_X2,
  PRUSA_SL1S,
];

export function getProfileById(id: string): ResinPrinterProfile | undefined {
  return BUILTIN_PROFILES.find((p) => p.id === id);
}
