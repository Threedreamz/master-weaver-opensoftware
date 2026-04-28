/**
 * opencam — Mach3 post processor.
 *
 * Target: Artsoft Mach3 (Windows-based PC controller, parallel-port / smooth-
 * stepper hobby CNC). Mach3 is broadly Fanuc-compatible but with a few
 * conventions of its own:
 *
 *   - Tool change is `M6 T<n>` (NOT Fanuc's `T<n> M06`). Mach3 reads tokens
 *     left-to-right and `M6` armed before `T` is the canonical form most
 *     posts ship with.
 *   - Program end is `M30` (program end + rewind). `M2` works but `M30` is
 *     the convention for jobbing CNC controllers running Mach3.
 *   - Coolant: `M7` mist, `M8` flood, `M9` off.
 *   - Spindle: `M3 S<rpm>` CW, `M5` stop.
 *   - Comments: `(parens)` AND `;line-end` are both legal — we use `(...)`
 *     for header metadata and `;` only inline if needed.
 *   - Header: `%` start/end framing + `O<nnnn>` program-number line, same as
 *     Fanuc/Haas (Mach3 ignores both but downstream verify tools expect them).
 *   - Modal defaults: `G21 G17 G90 G94` (mm, XY plane, absolute, feed/min).
 *     Work-offset `G54`. Modal-cancel block `G49 G40 G80` at start AND end.
 */

import type { PostRenderInput, PostRenderResult } from "../post-processor";
import { renderGcode } from "../post-processor";

export const dialect = "mach3" as const;
export const displayName = "Mach3";

export const templateGcode: string = `%
O1000 (OPENCAM {OP_KIND})
(TOOL: {TOOL_NAME} D{TOOL_DIAMETER}MM)
(FEED: {FEED} MM/MIN  RPM: {RPM})
(STOCK: {STOCK_X} X {STOCK_Y} X {STOCK_Z} MM)
G21 G17 G90 G94
G49 G40 G80
G54
M6 T1 (TOOL CHANGE — VERIFY OFFSET)
M3 S{RPM}
M8 (COOLANT ON)
{TOOLPATH_GCODE}
M9 (COOLANT OFF)
M5
G0 Z{STOCK_Z}
G49 G40 G80
M30
%`;

export function renderMach3(input: PostRenderInput): PostRenderResult {
  return renderGcode(templateGcode, input);
}
