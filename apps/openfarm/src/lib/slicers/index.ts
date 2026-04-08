export type { Slicer, SlicerOptions, SlicerResult } from "./base-slicer";
export { PrusaSlicerWrapper } from "./prusaslicer";
export { OrcaSlicerWrapper } from "./orcaslicer";

import { PrusaSlicerWrapper } from "./prusaslicer";
import { OrcaSlicerWrapper } from "./orcaslicer";
import type { Slicer } from "./base-slicer";

export function createSlicer(engine: string): Slicer {
  switch (engine) {
    case "prusaslicer":
      return new PrusaSlicerWrapper();
    case "orcaslicer":
    case "bambu_studio":
      return new OrcaSlicerWrapper();
    default:
      throw new Error(`Unsupported slicer engine: ${engine}`);
  }
}
