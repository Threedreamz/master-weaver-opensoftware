/**
 * opencam — Haas (VF-series) post processor.
 *
 * Target: Haas Automation VF-series VMCs (Haas control). Structurally similar
 * to Fanuc with `%` framing and `O`-number header, but adds explicit tool-
 * change line (`T1 M06`) and coolant ON/OFF (`M8`/`M9`) in header/footer which
 * are standard on Haas production post-processors. Uses `G21` for millimeter
 * mode (swap to `G20` for inch programs).
 */

import type { PostRenderInput, PostRenderResult } from "../post-processor";
import { renderGcode } from "../post-processor";

export const dialect = "haas" as const;
export const displayName = "Haas VF-series";

export const templateGcode: string = `%
O00001 (OPENCAM {OP_KIND})
(TOOL: {TOOL_NAME} D{TOOL_DIAMETER}MM)
(FEED: {FEED} MM/MIN  RPM: {RPM})
(STOCK: {STOCK_X} X {STOCK_Y} X {STOCK_Z} MM)
G90 G94 G17 G21
G54
T1 M06 (TOOL CHANGE — VERIFY OFFSET)
M3 S{RPM}
M8 (COOLANT ON)
{TOOLPATH_GCODE}
M9 (COOLANT OFF)
M5
G0 Z{STOCK_Z}
M30
%`;

export function renderHaas(input: PostRenderInput): PostRenderResult {
  return renderGcode(templateGcode, input);
}
