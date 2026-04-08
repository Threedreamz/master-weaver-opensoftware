/**
 * OpenSCAD parser — renders .scad files to mesh via the OpenSCAD CLI.
 *
 * OpenSCAD must be installed on the system:
 *   https://openscad.org/downloads.html
 *
 * Flow: write .scad to temp file -> invoke `openscad -o out.stl in.scad` -> parse STL output.
 */
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { parseSTL } from "./stl-parser";
import type { MeshData } from "../mesh-analyzer";

/** Check whether the OpenSCAD CLI is available on the system PATH. */
export function isOpenSCADInstalled(): boolean {
  try {
    execSync("openscad --version", { stdio: "pipe", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract user-defined parameters from an OpenSCAD source string.
 *
 * Recognised pattern (one per line):
 *   paramName = value; // [min:max:step]
 *   paramName = value; // [min:max]
 *   paramName = value; // description
 *   paramName = value;
 *
 * Only numeric scalar assignments on their own line are extracted.
 */
export interface ScadParameter {
  name: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export function extractParameters(source: string): ScadParameter[] {
  const params: ScadParameter[] = [];
  const lines = source.split("\n");

  // Match: `name = <number>;` with optional trailing comment
  const re = /^(\w+)\s*=\s*(-?[\d.]+)\s*;\s*(?:\/\/\s*(.*))?$/;

  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(re);
    if (!m) continue;

    const name = m[1];
    const value = parseFloat(m[2]);
    if (Number.isNaN(value)) continue;

    const param: ScadParameter = { name, value };

    const comment = m[3]?.trim();
    if (comment) {
      // Try to parse [min:max:step] or [min:max]
      const rangeMatch = comment.match(/\[(-?[\d.]+):(-?[\d.]+)(?::(-?[\d.]+))?\]/);
      if (rangeMatch) {
        param.min = parseFloat(rangeMatch[1]);
        param.max = parseFloat(rangeMatch[2]);
        if (rangeMatch[3] !== undefined) {
          param.step = parseFloat(rangeMatch[3]);
        }
        // Anything after the range pattern is a description
        const afterRange = comment.replace(/\[.*?\]/, "").trim();
        if (afterRange) param.description = afterRange;
      } else {
        param.description = comment;
      }
    }

    params.push(param);
  }

  return params;
}

/**
 * Prepend parameter overrides to an OpenSCAD source string.
 * Each override becomes a top-level variable assignment that shadows the original.
 */
export function applyParameters(
  source: string,
  overrides: Record<string, number>
): string {
  const lines: string[] = [];
  for (const [name, value] of Object.entries(overrides)) {
    lines.push(`${name} = ${value};`);
  }
  if (lines.length === 0) return source;
  return lines.join("\n") + "\n\n" + source;
}

/**
 * Render an OpenSCAD source buffer to MeshData via the OpenSCAD CLI.
 *
 * @param buffer - The raw .scad file contents.
 * @param parameterOverrides - Optional parameter overrides to prepend.
 * @throws If OpenSCAD is not installed or the render fails.
 */
export function parseOpenSCAD(
  buffer: Buffer,
  parameterOverrides?: Record<string, number>
): MeshData {
  if (!isOpenSCADInstalled()) {
    throw new Error(
      "OpenSCAD CLI not found. Install from https://openscad.org/downloads.html"
    );
  }

  const id = randomUUID();
  const scadPath = join(tmpdir(), `openslicer_${id}.scad`);
  const stlPath = join(tmpdir(), `openslicer_${id}.stl`);

  try {
    let source = buffer.toString("utf-8");

    if (parameterOverrides && Object.keys(parameterOverrides).length > 0) {
      source = applyParameters(source, parameterOverrides);
    }

    writeFileSync(scadPath, source, "utf-8");

    execSync(`openscad -o "${stlPath}" "${scadPath}"`, {
      timeout: 60_000,
      stdio: "pipe",
    });

    const stlBuffer = readFileSync(stlPath);
    return parseSTL(stlBuffer);
  } catch (err: unknown) {
    // Re-throw our own "not installed" error as-is
    if (err instanceof Error && err.message.includes("OpenSCAD CLI not found")) {
      throw err;
    }

    // Wrap OpenSCAD errors with useful context
    const message =
      err instanceof Error ? err.message : String(err);
    throw new Error(`OpenSCAD render failed: ${message}`);
  } finally {
    try {
      unlinkSync(scadPath);
    } catch {
      /* cleanup best-effort */
    }
    try {
      unlinkSync(stlPath);
    } catch {
      /* cleanup best-effort */
    }
  }
}
