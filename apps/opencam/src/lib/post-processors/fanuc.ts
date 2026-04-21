/**
 * opencam — Fanuc-style post processor.
 *
 * Target: Fanuc 0i/30i-series controllers (and compatible: Mitsubishi Meldas,
 * some Siemens). Emits traditional `%` program framing with an `O`-number
 * header, and the Fanuc-standard modal-cancel group (`G49 G40 G80`) at start
 * plus a `G54` work-offset selection. Ends with `M30` (program end + rewind),
 * not `M2`.
 */

import type { PostRenderInput, PostRenderResult } from "../post-processor";
import { renderGcode } from "../post-processor";

export const dialect = "fanuc" as const;
export const displayName = "Fanuc 0i/30i";

export const templateGcode: string = `%
O1000 (OPENCAM {OP_KIND})
(TOOL: {TOOL_NAME} D{TOOL_DIAMETER}MM)
(FEED: {FEED} MM/MIN  RPM: {RPM})
(STOCK: {STOCK_X} X {STOCK_Y} X {STOCK_Z} MM)
G21
G90
G17
G94
G49 G40 G80
G54
M3 S{RPM}
{TOOLPATH_GCODE}
M5
G0 Z{STOCK_Z}
G49 G40 G80
M30
%`;

export function renderFanuc(input: PostRenderInput): PostRenderResult {
  return renderGcode(templateGcode, input);
}
