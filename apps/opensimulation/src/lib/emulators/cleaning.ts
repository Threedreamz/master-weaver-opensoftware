/**
 * opensimulation — cleaning emulator (LEGACY FALLBACK)
 *
 * Lookup-table based predictive emulator for SLS-part depowdering cycles.
 * SUPERSEDED by the physics simulator at lib/sim/cleaning-physics.ts —
 * kept as a fast fallback for callers that don't have a meshed surface +
 * trajectory yet (e.g., upstream ODYN devices that only know strategy/mode).
 *
 * The /api/solve/cleaning route prefers cleaning-physics when the request
 * body carries `surface` + `trajectory`, and falls back to runCleaning() here
 * for the legacy `partId + strategy + mode` shape.
 */

export type CleaningStrategy = "simple" | "standard" | "thorough" | "gentle";
export type CleaningMode = "powder_saving" | "time_saving";

export interface CleaningRequest {
  partId: string;
  strategy: CleaningStrategy | string;
  mode: CleaningMode | string;
}

export interface CleaningStep {
  action: "pickup" | "brush" | "vacuum" | "tap" | "inspect" | "place";
  durationS: number;
  coverageAfter: number;
  powderLostG: number;
}

export interface CleaningResult {
  partId: string;
  mode: string;
  strategy: string;
  predictedPowderCoverage: number;
  predictedCycleTimeS: number;
  predictedPowderLossG: number;
  graspSuccessProbability: number;
  steps: CleaningStep[];
}

const STRATEGY_PARAMS: Record<string, { time: number; coverage: number; loss: number }> = {
  simple:   { time: 45,  coverage: 0.08, loss: 2.0 },
  standard: { time: 90,  coverage: 0.04, loss: 5.0 },
  thorough: { time: 150, coverage: 0.02, loss: 8.0 },
  gentle:   { time: 120, coverage: 0.05, loss: 3.0 },
};

export function runCleaning(req: CleaningRequest): CleaningResult {
  const params = { ...(STRATEGY_PARAMS[req.strategy] ?? STRATEGY_PARAMS.standard) };

  if (req.mode === "time_saving") {
    params.time *= 0.6;
    params.coverage *= 1.5;
    params.loss *= 1.3;
  } else {
    params.time *= 1.2;
    params.coverage *= 0.8;
    params.loss *= 0.6;
  }

  const steps: CleaningStep[] = [
    { action: "pickup",  durationS: 5,                   coverageAfter: 1.0,                powderLostG: 0 },
    { action: "brush",   durationS: params.time * 0.3,   coverageAfter: params.coverage * 3, powderLostG: params.loss * 0.4 },
    { action: "vacuum",  durationS: params.time * 0.25,  coverageAfter: params.coverage * 1.5, powderLostG: params.loss * 0.3 },
    { action: "tap",     durationS: params.time * 0.15,  coverageAfter: params.coverage,    powderLostG: params.loss * 0.2 },
    { action: "inspect", durationS: 3,                   coverageAfter: params.coverage,    powderLostG: 0 },
    { action: "place",   durationS: 5,                   coverageAfter: params.coverage,    powderLostG: params.loss * 0.1 },
  ];

  return {
    partId: req.partId,
    mode: req.mode,
    strategy: req.strategy,
    predictedPowderCoverage: params.coverage,
    predictedCycleTimeS: params.time,
    predictedPowderLossG: params.loss,
    graspSuccessProbability: 0.92,
    steps,
  };
}
