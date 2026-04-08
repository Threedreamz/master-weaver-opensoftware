/**
 * HTTP client for OpenSlicer integration API.
 * OpenSlicer runs on port 4175.
 */

import { readFile } from "node:fs/promises";

const OPENSLICER_URL =
  process.env.OPENSLICER_URL || "http://localhost:4175";

export interface SlicerSendResult {
  slicerModelId: string;
  status: string;
  analysisResult: Record<string, unknown> | null;
  farmJobId: string;
}

export interface SliceStatusResult {
  farmJobId: string;
  slicerModelId?: string;
  historyId?: string;
  status: string;
  gcodeUrl?: string | null;
  estimatedTime?: number | null;
  estimatedMaterial?: number | null;
  layerCount?: number | null;
  errorMessage?: string | null;
}

export interface GcodeResult {
  farmJobId: string;
  gcodeBase64: string;
  fileSizeBytes: number;
  metadata?: { time?: number; material?: number; layers?: number } | null;
}

export interface ConnectionStatus {
  connected: boolean;
  version?: string;
}

/**
 * Send a model from OpenFarm to OpenSlicer for slicing.
 */
export async function sendToSlicer(
  modelId: string,
  filePath: string,
  modelName: string,
  fileFormat: "stl" | "3mf" | "obj" | "step",
  profileId?: string,
): Promise<SlicerSendResult> {
  // Read model file from openfarm storage
  const fileBuffer = await readFile(filePath);
  const modelData = fileBuffer.toString("base64");

  const res = await fetch(`${OPENSLICER_URL}/api/integration/farm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modelName,
      modelData,
      fileFormat,
      profileId,
      farmJobId: modelId,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `OpenSlicer send failed (${res.status}): ${error.error || "Unknown error"}`,
    );
  }

  return res.json();
}

/**
 * Get the slice result for a farm job from OpenSlicer.
 */
export async function getSliceResult(
  farmJobId: string,
): Promise<SliceStatusResult> {
  const res = await fetch(
    `${OPENSLICER_URL}/api/integration/farm/${farmJobId}`,
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `OpenSlicer status check failed (${res.status}): ${error.error || "Unknown error"}`,
    );
  }

  return res.json();
}

/**
 * Retrieve the G-code for a completed farm job from OpenSlicer.
 */
export async function getGcode(farmJobId: string): Promise<GcodeResult> {
  const res = await fetch(
    `${OPENSLICER_URL}/api/integration/farm/${farmJobId}`,
    { method: "POST" },
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `OpenSlicer gcode retrieval failed (${res.status}): ${error.error || "Unknown error"}`,
    );
  }

  return res.json();
}

/**
 * Generate a deep-link URL to open a model in OpenSlicer.
 */
export function openInSlicer(modelId: string): string {
  return `${OPENSLICER_URL}?model=${encodeURIComponent(modelId)}&source=openfarm`;
}

/**
 * Trigger a calibration print in OpenSlicer.
 */
export async function triggerCalibrationPrint(params: {
  farmSessionId: string;
  procedureType: string;
  materialId?: string;
}): Promise<{ id: string; status: string }> {
  const res = await fetch(`${OPENSLICER_URL}/api/integration/farm/calibration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `OpenSlicer calibration request failed (${res.status}): ${error.error || "Unknown error"}`,
    );
  }

  return res.json();
}

/**
 * Get calibration print status from OpenSlicer.
 */
export async function getCalibrationPrintStatus(
  farmSessionId: string,
): Promise<{ id: string; status: string } | null> {
  const res = await fetch(
    `${OPENSLICER_URL}/api/integration/farm/calibration/${farmSessionId}`,
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `OpenSlicer calibration status failed (${res.status}): ${error.error || "Unknown error"}`,
    );
  }

  return res.json();
}

/**
 * Check if OpenSlicer is reachable and healthy.
 */
export async function checkConnection(): Promise<ConnectionStatus> {
  try {
    const res = await fetch(`${OPENSLICER_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { connected: false };
    }

    const data = await res.json();
    return {
      connected: true,
      version: data.version || data.app,
    };
  } catch {
    return { connected: false };
  }
}
