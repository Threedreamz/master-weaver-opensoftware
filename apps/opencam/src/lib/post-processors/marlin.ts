/**
 * opencam — Marlin post processor.
 *
 * Target: Marlin firmware (3D printers) operating in CNC / spindle mode. Uses
 * `M3 S{RPM}` for spindle-on via laser/spindle-kit firmware builds, and
 * includes `M82` (absolute extruder positioning) so any inherited extruder
 * state from prior 3D-print jobs doesn't drift during a CNC run. `M400` flushes
 * the planner buffer before spindle-off to guarantee the tool finishes motion
 * before the spindle stops — important on printers that buffer aggressively.
 */

import type { PostRenderInput, PostRenderResult } from "../post-processor";
import { renderGcode } from "../post-processor";

export const dialect = "marlin" as const;
export const displayName = "Marlin (CNC mode)";

export const templateGcode: string = `; OpenCAM — Marlin (CNC mode) post
; Op: {OP_KIND} | Tool: {TOOL_NAME} Ø{TOOL_DIAMETER}mm | Feed: {FEED} mm/min | RPM: {RPM}
; Stock: {STOCK_X} x {STOCK_Y} x {STOCK_Z} mm
G21      ; mm
G90      ; absolute positioning
M82      ; absolute extruder (no-op in CNC mode, defensive)
G17      ; XY plane
; G0 F3000 hint — rapid feedrate managed by firmware JERK/ACCEL
M3 S{RPM}  ; spindle on CW
{TOOLPATH_GCODE}
M400     ; wait for moves to complete
M5       ; spindle off
G0 Z{STOCK_Z}  ; safe retract
M84      ; disable steppers
; end of program`;

export function renderMarlin(input: PostRenderInput): PostRenderResult {
  return renderGcode(templateGcode, input);
}
