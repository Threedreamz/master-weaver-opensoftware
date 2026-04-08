import { execFile } from "child_process";
import { promisify } from "util";
import { join, basename } from "path";
import type { Slicer, SlicerOptions, SlicerResult } from "./base-slicer";

const execFileAsync = promisify(execFile);

/**
 * PrusaSlicer CLI wrapper.
 * Supports both FDM and SLA modes.
 *
 * CLI reference:
 *   prusaslicer --export-gcode --load profile.ini --output output.gcode model.stl
 *   prusaslicer --export-sla --load profile.ini --output output.sl1 model.stl
 */
export class PrusaSlicerWrapper implements Slicer {
  readonly name = "PrusaSlicer";
  readonly executable: string;

  constructor(executablePath?: string) {
    this.executable =
      executablePath ||
      process.env.PRUSASLICER_PATH ||
      "/Applications/PrusaSlicer.app/Contents/MacOS/PrusaSlicer";
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

    // Load profile if provided
    if (options.profilePath) {
      args.push("--load", options.profilePath);
    }

    // Output directory
    const outputName = basename(options.modelPath, ".stl") + ".gcode";
    const outputPath = join(options.outputDir, outputName);
    args.push("--output", outputPath);

    // Export G-code
    args.push("--export-gcode");

    // Apply overrides
    if (options.overrides) {
      for (const [key, value] of Object.entries(options.overrides)) {
        args.push(`--${key}`, String(value));
      }
    }

    // Input model
    args.push(options.modelPath);

    try {
      const { stdout, stderr } = await execFileAsync(this.executable, args, {
        timeout: 300000, // 5 min timeout
      });

      // Parse estimated time and filament from stdout/stderr
      const timeMatch = (stdout + stderr).match(
        /estimated printing time.*?(\d+)h\s*(\d+)m/i,
      );
      const filamentMatch = (stdout + stderr).match(
        /total filament used\s*\[g\]:\s*([\d.]+)/i,
      );

      return {
        success: true,
        outputPath,
        estimatedTime: timeMatch
          ? parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60
          : undefined,
        estimatedMaterial: filamentMatch
          ? parseFloat(filamentMatch[1])
          : undefined,
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
        errors: [error.message || "PrusaSlicer failed"],
        stdout: error.stdout,
        stderr: error.stderr,
      };
    }
  }
}
