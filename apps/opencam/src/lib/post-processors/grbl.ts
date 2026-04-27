/**
 * opencam — GRBL 1.1 post processor.
 *
 * Target: GRBL 1.1 firmware (Arduino-class 3-axis controllers). Uses the
 * modal group defaults GRBL expects and emits `;`-style line comments which
 * GRBL parses without issue. No program-number / `%` framing — GRBL streams
 * line-by-line from a serial sender.
 */

import type { PostRenderInput, PostRenderResult } from "../post-processor";
import { renderGcode } from "../post-processor";

export const dialect = "grbl" as const;
export const displayName = "GRBL 1.1";

export const templateGcode: string = `; OpenCAM — GRBL 1.1 post
; Op: {OP_KIND} | Tool: {TOOL_NAME} Ø{TOOL_DIAMETER}mm | Feed: {FEED} mm/min | RPM: {RPM}
; Stock: {STOCK_X} x {STOCK_Y} x {STOCK_Z} mm
G21      ; mm
G90      ; absolute
G17      ; XY plane
G94      ; feed mm/min
M3 S{RPM}  ; spindle on CW
{TOOLPATH_GCODE}
M5       ; spindle off
G0 Z{STOCK_Z}  ; safe retract
M2       ; end`;

export function renderGrbl(input: PostRenderInput): PostRenderResult {
  return renderGcode(templateGcode, input);
}
