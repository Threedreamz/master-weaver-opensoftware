export type { Slicer, SlicerOptions, SlicerResult } from "./base-slicer";
export { PrusaSlicerWrapper } from "./prusaslicer";
export { OrcaSlicerWrapper } from "./orcaslicer";
export { InternalSlicer } from "./internal-slicer";
export type { InternalSlicerProfile } from "./internal-slicer";

import { PrusaSlicerWrapper } from "./prusaslicer";
import { OrcaSlicerWrapper } from "./orcaslicer";
import { InternalSlicer } from "./internal-slicer";
import type { Slicer } from "./base-slicer";

export function createSlicer(engine: string): Slicer {
  switch (engine) {
    case "internal":
      return new InternalSlicer();
    case "prusaslicer":
      return new PrusaSlicerWrapper();
    case "orcaslicer":
    case "bambu_studio":
      return new OrcaSlicerWrapper();
    default:
      throw new Error(`Unsupported slicer engine: ${engine}`);
  }
}
