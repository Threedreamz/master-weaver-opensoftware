/**
 * Slicer CLI Dispatcher
 *
 * Wraps external slicer binaries (BambuStudio, PrusaSlicer, OrcaSlicer)
 * to perform FDM slicing via their command-line interfaces.
 */

import { spawn } from "node:child_process";
import { access, constants } from "node:fs/promises";
import type { SlicerBackend, FDMSliceConfig, SliceOutput } from "./types";

/** Known macOS application paths for each slicer backend */
const SLICER_PATHS: Record<SlicerBackend, string[]> = {
  bambu_studio: [
    "/Applications/BambuStudio.app/Contents/MacOS/BambuStudio",
    "/usr/local/bin/bambu-studio",
  ],
  prusa_slicer: [
    "/Applications/PrusaSlicer.app/Contents/MacOS/PrusaSlicer",
    "/usr/local/bin/prusa-slicer",
  ],
  orca_slicer: [
    "/Applications/OrcaSlicer.app/Contents/MacOS/OrcaSlicer",
    "/usr/local/bin/orca-slicer",
  ],
};

export interface SlicerDetectionResult {
  backend: SlicerBackend;
  path: string;
}

export class SlicerCLI {
  private detectedSlicers: Map<SlicerBackend, string> = new Map();

  /**
   * Detect which slicer backends are installed on this system.
   * Checks known paths for each backend and returns those found.
   */
  async detectInstalledSlicers(): Promise<SlicerDetectionResult[]> {
    const results: SlicerDetectionResult[] = [];
    this.detectedSlicers.clear();

    for (const [backend, paths] of Object.entries(SLICER_PATHS) as [SlicerBackend, string[]][]) {
      for (const path of paths) {
        try {
          await access(path, constants.X_OK);
          results.push({ backend, path });
          this.detectedSlicers.set(backend, path);
          break; // Use first found path for this backend
        } catch {
          // Path not found or not executable, try next
        }
      }
    }

    return results;
  }

  /**
   * Get the executable path for a specific backend.
   * Runs detection if not already done.
   */
  async getSlicerPath(backend: SlicerBackend): Promise<string | undefined> {
    if (this.detectedSlicers.size === 0) {
      await this.detectInstalledSlicers();
    }
    return this.detectedSlicers.get(backend);
  }

  /**
   * Slice a model file using the specified backend.
   */
  async slice(
    backend: SlicerBackend,
    inputPath: string,
    outputPath: string,
    config: FDMSliceConfig,
    profilePath?: string,
  ): Promise<SliceOutput> {
    const slicerPath = await this.getSlicerPath(backend);
    if (!slicerPath) {
      return {
        success: false,
        outputPath,
        format: "gcode",
        estimatedTime: 0,
        filamentUsageG: 0,
        filamentLengthMm: 0,
        layerCount: 0,
        errors: [`Slicer backend '${backend}' is not installed or not found.`],
      };
    }

    switch (backend) {
      case "bambu_studio":
        return this.sliceBambuStudio(slicerPath, inputPath, outputPath, config, profilePath);
      case "prusa_slicer":
        return this.slicePrusaSlicer(slicerPath, inputPath, outputPath, config, profilePath);
      case "orca_slicer":
        return this.sliceOrcaSlicer(slicerPath, inputPath, outputPath, config, profilePath);
    }
  }

  /**
   * Execute a slicer process and capture output.
   */
  private executeProcess(command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const proc = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      proc.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });

      proc.on("error", (err) => {
        resolve({ stdout, stderr: err.message, exitCode: 1 });
      });
    });
  }

  /**
   * Build common slicer arguments from FDMSliceConfig.
   */
  private buildCommonArgs(config: FDMSliceConfig): string[] {
    const args: string[] = [];
    args.push(`--layer-height`, String(config.layerHeight));
    args.push(`--first-layer-height`, String(config.firstLayerHeight));
    args.push(`--fill-density`, `${Math.round(config.infillDensity * 100)}%`);
    args.push(`--fill-pattern`, config.infillPattern);
    args.push(`--perimeters`, String(config.perimeters));
    args.push(`--top-solid-layers`, String(config.topLayers));
    args.push(`--bottom-solid-layers`, String(config.bottomLayers));
    if (config.generateSupports) {
      args.push(`--support-material`);
      if (config.supportType) {
        args.push(`--support-material-style`, config.supportType);
      }
    }
    args.push(`--nozzle-temperature`, String(config.nozzleTemp));
    args.push(`--bed-temperature`, String(config.bedTemp));
    return args;
  }

  /**
   * Parse slicer stdout/stderr for slice result metadata.
   */
  private parseSliceOutput(stdout: string, stderr: string, outputPath: string, format: SliceOutput["format"]): SliceOutput {
    const combined = stdout + "\n" + stderr;

    // Attempt to extract estimated time (various formats)
    const timeMatch = combined.match(/estimated?\s*(?:print\s*)?time[:\s]*(\d+)\s*(?:s|sec)/i)
      ?? combined.match(/total\s*time[:\s]*(\d+)/i);
    const estimatedTime = timeMatch ? parseInt(timeMatch[1], 10) : 0;

    // Attempt to extract filament usage
    const usageMatch = combined.match(/filament\s*used[:\s]*([\d.]+)\s*g/i);
    const filamentUsageG = usageMatch ? parseFloat(usageMatch[1]) : 0;

    const lengthMatch = combined.match(/filament\s*used[:\s]*([\d.]+)\s*mm/i)
      ?? combined.match(/filament\s*length[:\s]*([\d.]+)/i);
    const filamentLengthMm = lengthMatch ? parseFloat(lengthMatch[1]) : 0;

    const layerMatch = combined.match(/(\d+)\s*layers?/i);
    const layerCount = layerMatch ? parseInt(layerMatch[1], 10) : 0;

    return {
      success: true,
      outputPath,
      format,
      estimatedTime,
      filamentUsageG,
      filamentLengthMm,
      layerCount,
    };
  }

  private async sliceBambuStudio(
    slicerPath: string,
    inputPath: string,
    outputPath: string,
    config: FDMSliceConfig,
    profilePath?: string,
  ): Promise<SliceOutput> {
    const args = ["--slice", "--export-gcode"];
    if (profilePath) {
      args.push("--load", profilePath);
    }
    args.push(...this.buildCommonArgs(config));
    args.push("--output", outputPath);
    args.push(inputPath);

    const result = await this.executeProcess(slicerPath, args);
    if (result.exitCode !== 0) {
      return {
        success: false,
        outputPath,
        format: "gcode",
        estimatedTime: 0,
        filamentUsageG: 0,
        filamentLengthMm: 0,
        layerCount: 0,
        errors: [`BambuStudio exited with code ${result.exitCode}: ${result.stderr}`],
      };
    }
    return this.parseSliceOutput(result.stdout, result.stderr, outputPath, "gcode");
  }

  private async slicePrusaSlicer(
    slicerPath: string,
    inputPath: string,
    outputPath: string,
    config: FDMSliceConfig,
    profilePath?: string,
  ): Promise<SliceOutput> {
    const args = ["--slice", "--gcode"];
    if (profilePath) {
      args.push("--load", profilePath);
    }
    args.push(...this.buildCommonArgs(config));
    args.push("--output", outputPath);
    args.push(inputPath);

    const result = await this.executeProcess(slicerPath, args);
    if (result.exitCode !== 0) {
      return {
        success: false,
        outputPath,
        format: "gcode",
        estimatedTime: 0,
        filamentUsageG: 0,
        filamentLengthMm: 0,
        layerCount: 0,
        errors: [`PrusaSlicer exited with code ${result.exitCode}: ${result.stderr}`],
      };
    }
    return this.parseSliceOutput(result.stdout, result.stderr, outputPath, "gcode");
  }

  private async sliceOrcaSlicer(
    slicerPath: string,
    inputPath: string,
    outputPath: string,
    config: FDMSliceConfig,
    profilePath?: string,
  ): Promise<SliceOutput> {
    const args = ["--slice", "--export-gcode"];
    if (profilePath) {
      args.push("--load", profilePath);
    }
    args.push(...this.buildCommonArgs(config));
    args.push("--output", outputPath);
    args.push(inputPath);

    const result = await this.executeProcess(slicerPath, args);
    if (result.exitCode !== 0) {
      return {
        success: false,
        outputPath,
        format: "gcode",
        estimatedTime: 0,
        filamentUsageG: 0,
        filamentLengthMm: 0,
        layerCount: 0,
        errors: [`OrcaSlicer exited with code ${result.exitCode}: ${result.stderr}`],
      };
    }
    return this.parseSliceOutput(result.stdout, result.stderr, outputPath, "gcode");
  }
}
