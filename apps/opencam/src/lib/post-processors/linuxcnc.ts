/**
 * opencam — LinuxCNC (EMC2) post processor.
 *
 * Target: LinuxCNC / EMC2 interpreter. Uses path-blending (`G64 P0.01`) so the
 * planner smooths corners within 0.01 mm tolerance — avoids the dwell-per-corner
 * behaviour of exact-stop mode on long CAM toolpaths. Emits both `;` and
 * `(…)`-style comments; LinuxCNC supports both but many community scripts
 * expect the parenthesis form, so we dual-annotate key lines.
 */

import type { PostRenderInput, PostRenderResult } from "../post-processor";
import { renderGcode } from "../post-processor";

export const dialect = "linuxcnc" as const;
export const displayName = "LinuxCNC (EMC2)";

export const templateGcode: string = `; OpenCAM — LinuxCNC (EMC2) post
(info: op={OP_KIND} tool={TOOL_NAME} d={TOOL_DIAMETER}mm feed={FEED} rpm={RPM})
(info: stock={STOCK_X}x{STOCK_Y}x{STOCK_Z}mm)
G21      ; mm
G90      ; absolute
G17      ; XY plane
G94      ; feed mm/min
G64 P0.01  (path blending, 0.01mm tolerance)
G54      (work offset 1)
M3 S{RPM}  (spindle on CW)
{TOOLPATH_GCODE}
M5       (spindle off)
G53 G0 Z{STOCK_Z}  (machine-absolute safe retract)
M2       ; end`;

export function renderLinuxcnc(input: PostRenderInput): PostRenderResult {
  return renderGcode(templateGcode, input);
}
