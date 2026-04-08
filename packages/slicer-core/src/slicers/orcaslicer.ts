import { execFile } from "child_process";
import { promisify } from "util";
import { readdir } from "fs/promises";
import { join, basename } from "path";
import type { Slicer, SlicerOptions, SlicerResult } from "./base-slicer";

const execFileAsync = promisify(execFile);

/**
 * OrcaSlicer CLI wrapper.
 * Forked from BambuStudio, compatible with Bambu Lab printers.
 *
 * CLI reference:
 *   orcaslicer --slice --config profile.json --output output.gcode model.3mf
 */
export class OrcaSlicerWrapper implements Slicer {
  readonly name = "OrcaSlicer";
  readonly executable: string;

  constructor(executablePath?: string) {
    this.executable =
      executablePath ||
      process.env.ORCASLICER_PATH ||
      "/Applications/OrcaSlicer.app/Contents/MacOS/OrcaSlicer";
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync(this.executable, ["--help"]);
      return true;
    } catch {
      return false;
    }
  }

  async slice(options: SlicerOptions): Promise<SlicerResult> {
    const args: string[] = [];

    // Load config
    if (options.profilePath) {
      args.push("--load-settings", options.profilePath);
    }

    // Export G-code
    args.push("--export-gcode");

    // Output directory
    const outputName =
      basename(options.modelPath).replace(/\.\w+$/, "") + ".gcode";
    const outputPath = join(options.outputDir, outputName);
    args.push("--output", outputPath);

    // Apply overrides as temporary config
    if (options.overrides) {
      for (const [key, value] of Object.entries(options.overrides)) {
        args.push(`--${key.replace(/_/g, "-")}`, String(value));
      }
    }

    // Input model
    args.push(options.modelPath);

    try {
      const { stdout, stderr } = await execFileAsync(this.executable, args, {
        timeout: 300000,
      });

      // Find the newest gcode file in output dir
      let finalOutput = outputPath;
      try {
        const files = await readdir(options.outputDir);
        const gcodeFiles = files.filter((f) => f.endsWith(".gcode"));
        if (gcodeFiles.length > 0) {
          finalOutput = join(
            options.outputDir,
            gcodeFiles[gcodeFiles.length - 1],
          );
        }
      } catch {
        // Fall back to expected output path
      }

      return {
        success: true,
        outputPath: finalOutput,
        stdout,
        stderr,
      };
    } catch (err: unknown) {
      const error = err as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      return {
        success: false,
        errors: [error.message || "OrcaSlicer failed"],
        stdout: error.stdout,
        stderr: error.stderr,
      };
    }
  }
}
