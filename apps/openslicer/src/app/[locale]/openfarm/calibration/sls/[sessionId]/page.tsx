"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  ExternalLink,
  Thermometer,
  Ruler,
  Box,
  Scan,
} from "lucide-react";

/* ---------- Types ---------- */

interface SessionInfo {
  id: string;
  procedureName: string;
  procedureType: string;
  printerName: string;
  materialName?: string;
  status: string;
}

interface BtmtPlaque {
  offset: number;
  label: string;
  condition: "too_cold" | "ideal" | "too_hot" | "failed" | "";
  notes: string;
}

interface XyMeasurement {
  pointNumber: number;
  side: "A" | "B";
  axis: "X" | "Y";
  nominal: number;
  measured: string;
}

interface ZMeasurement {
  pointNumber: number;
  position: string;
  nominal: number;
  measured: string;
}

interface DiagnosticCategory {
  category: string;
  grade: "pass" | "marginal" | "fail" | "";
  notes: string;
}

interface ComputedResults {
  results: Array<{ key: string; label: string; value: string | number; unit?: string }>;
  recommendation?: string;
}

const OPENFARM_URL = "http://localhost:4174";

/* ================================================================== */
/*  BTMT Form                                                         */
/* ================================================================== */

function BtmtForm({ sessionId, onComplete }: { sessionId: string; onComplete: (r: ComputedResults) => void }) {
  const defaultPlaques: BtmtPlaque[] = [
    { offset: -3, label: "-3 \u00B0C", condition: "", notes: "" },
    { offset: -2, label: "-2 \u00B0C", condition: "", notes: "" },
    { offset: -1, label: "-1 \u00B0C", condition: "", notes: "" },
    { offset: 0, label: "0 \u00B0C (Baseline)", condition: "", notes: "" },
    { offset: 1, label: "+1 \u00B0C", condition: "", notes: "" },
    { offset: 2, label: "+2 \u00B0C", condition: "", notes: "" },
    { offset: 3, label: "+3 \u00B0C", condition: "", notes: "" },
  ];

  const [plaques, setPlaques] = useState<BtmtPlaque[]>(defaultPlaques);
  const [submitting, setSubmitting] = useState(false);

  const updatePlaque = (i: number, field: keyof BtmtPlaque, value: string) => {
    setPlaques((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  const conditionColors: Record<string, string> = {
    too_cold: "border-blue-500 bg-blue-950/30",
    ideal: "border-green-500 bg-green-950/30",
    too_hot: "border-red-500 bg-red-950/30",
    failed: "border-zinc-600 bg-zinc-800/50",
    "": "border-zinc-700",
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Submit measurements
      await fetch(`${OPENFARM_URL}/api/calibration/sessions/${sessionId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "btmt",
          plaques: plaques.map((p) => ({
            offset: p.offset,
            condition: p.condition,
            notes: p.notes,
          })),
        }),
      });
      // Trigger calculation
      const res = await fetch(`${OPENFARM_URL}/api/calibration/sessions/${sessionId}/results`, {
        method: "POST",
      });
      const data = await res.json();
      onComplete(data);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const hasIdeal = plaques.some((p) => p.condition === "ideal");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">BTMT Plaque Evaluation</h2>
        <p className="text-sm text-zinc-400">
          Evaluate each temperature plaque. Select the condition that best describes each plaque,
          then mark the ideal one.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plaques.map((plaque, i) => (
          <div
            key={plaque.offset}
            className={`rounded-lg border-2 ${conditionColors[plaque.condition]} p-4 transition-colors`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-zinc-100">{plaque.label}</span>
              {plaque.condition === "ideal" && (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              )}
            </div>

            <label className="block text-xs font-medium text-zinc-500 mb-1">Condition</label>
            <select
              value={plaque.condition}
              onChange={(e) => updatePlaque(i, "condition", e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            >
              <option value="">-- Select --</option>
              <option value="too_cold">Too Cold</option>
              <option value="ideal">Ideal</option>
              <option value="too_hot">Too Hot</option>
              <option value="failed">Failed / Defective</option>
            </select>

            <label className="block text-xs font-medium text-zinc-500 mb-1">Notes</label>
            <input
              type="text"
              value={plaque.notes}
              onChange={(e) => updatePlaque(i, "notes", e.target.value)}
              placeholder="Optional notes..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !hasIdeal}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Calculate & Submit
      </button>
      {!hasIdeal && (
        <p className="text-xs text-amber-400">Mark at least one plaque as "Ideal" to submit.</p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  X/Y Scaling Form                                                  */
/* ================================================================== */

function XyScalingForm({ sessionId, onComplete }: { sessionId: string; onComplete: (r: ComputedResults) => void }) {
  const generatePoints = (): XyMeasurement[] => {
    const points: XyMeasurement[] = [];
    for (let side = 0; side < 2; side++) {
      const sideName = side === 0 ? "A" : "B";
      for (let p = 1; p <= 12; p++) {
        points.push({
          pointNumber: side * 12 + p,
          side: sideName as "A" | "B",
          axis: p <= 6 ? "X" : "Y",
          nominal: p <= 6 ? 50 : 50,
          measured: "",
        });
      }
    }
    return points;
  };

  const [points, setPoints] = useState<XyMeasurement[]>(generatePoints);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateMeasured = (i: number, value: string) => {
    setPoints((prev) => prev.map((p, idx) => (idx === i ? { ...p, measured: value } : p)));
  };

  const getDelta = (nominal: number, measured: string): number | null => {
    const m = parseFloat(measured);
    if (isNaN(m)) return null;
    return m - nominal;
  };

  const getDeltaStatus = (delta: number | null): { color: string; label: string } => {
    if (delta === null) return { color: "text-zinc-500", label: "-" };
    const abs = Math.abs(delta);
    if (abs < 0.3) return { color: "text-green-400", label: "OK" };
    if (abs < 0.5) return { color: "text-amber-400", label: "Warning" };
    return { color: "text-red-400", label: "Outlier" };
  };

  // Compute summary stats
  const filledPoints = points.filter((p) => p.measured !== "");
  const xPoints = filledPoints.filter((p) => p.axis === "X");
  const yPoints = filledPoints.filter((p) => p.axis === "Y");

  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const stdDev = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1));
  };

  const xDeltas = xPoints.map((p) => getDelta(p.nominal, p.measured)!).filter((d) => d !== null);
  const yDeltas = yPoints.map((p) => getDelta(p.nominal, p.measured)!).filter((d) => d !== null);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(`${OPENFARM_URL}/api/calibration/sessions/${sessionId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "xy_scaling",
          measurements: points.map((p) => ({
            pointNumber: p.pointNumber,
            side: p.side,
            axis: p.axis,
            nominal: p.nominal,
            measured: parseFloat(p.measured) || null,
          })),
        }),
      });
      const res = await fetch(`${OPENFARM_URL}/api/calibration/sessions/${sessionId}/results`, {
        method: "POST",
      });
      const data = await res.json();
      onComplete(data);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Tab" && !e.shiftKey) {
      // Find next measured input
      const nextIndex = points.findIndex((_, i) => i > index);
      if (nextIndex >= 0 && inputRefs.current[nextIndex]) {
        e.preventDefault();
        inputRefs.current[nextIndex]?.focus();
      }
    }
  };

  const allFilled = points.every((p) => p.measured !== "");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">X/Y Scaling Measurements</h2>
        <p className="text-sm text-zinc-400">
          Measure all 24 reference points (12 per side). Tab between Measured fields for fast entry.
        </p>
      </div>

      {/* Summary Stats */}
      {filledPoints.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Mean Error X</div>
            <div className="text-lg font-mono font-bold text-zinc-100">
              {xDeltas.length ? mean(xDeltas).toFixed(3) : "-"} mm
            </div>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Mean Error Y</div>
            <div className="text-lg font-mono font-bold text-zinc-100">
              {yDeltas.length ? mean(yDeltas).toFixed(3) : "-"} mm
            </div>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Std Dev X</div>
            <div className="text-lg font-mono font-bold text-zinc-100">
              {xDeltas.length > 1 ? stdDev(xDeltas).toFixed(3) : "-"} mm
            </div>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Std Dev Y</div>
            <div className="text-lg font-mono font-bold text-zinc-100">
              {yDeltas.length > 1 ? stdDev(yDeltas).toFixed(3) : "-"} mm
            </div>
          </div>
        </div>
      )}

      {/* Table per side */}
      {(["A", "B"] as const).map((side) => {
        const sidePoints = points.filter((p) => p.side === side);
        const startIndex = side === "A" ? 0 : 12;
        return (
          <div key={side}>
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Side {side}
            </h3>
            <div className="rounded-lg border border-zinc-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-800 border-b border-zinc-700">
                    <th className="text-left px-3 py-2 font-medium text-zinc-400 w-16">Point</th>
                    <th className="text-left px-3 py-2 font-medium text-zinc-400 w-16">Axis</th>
                    <th className="text-right px-3 py-2 font-medium text-zinc-400 w-24">Nominal (mm)</th>
                    <th className="text-right px-3 py-2 font-medium text-zinc-400 w-32">Measured (mm)</th>
                    <th className="text-right px-3 py-2 font-medium text-zinc-400 w-24">Delta</th>
                    <th className="text-center px-3 py-2 font-medium text-zinc-400 w-20">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sidePoints.map((point, localIdx) => {
                    const globalIdx = startIndex + localIdx;
                    const delta = getDelta(point.nominal, point.measured);
                    const status = getDeltaStatus(delta);
                    const isOutlier = delta !== null && Math.abs(delta) >= 0.5;

                    return (
                      <tr
                        key={point.pointNumber}
                        className={`border-b border-zinc-800 ${isOutlier ? "bg-amber-950/20" : ""}`}
                      >
                        <td className="px-3 py-2 text-zinc-300 font-mono">#{point.pointNumber}</td>
                        <td className="px-3 py-2 text-zinc-300">{point.axis}</td>
                        <td className="px-3 py-2 text-right text-zinc-400 font-mono">{point.nominal.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            ref={(el) => { inputRefs.current[globalIdx] = el; }}
                            type="number"
                            step="0.01"
                            value={point.measured}
                            onChange={(e) => updateMeasured(globalIdx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, globalIdx)}
                            placeholder="0.00"
                            className="w-24 text-right rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className={`px-3 py-2 text-right font-mono ${delta !== null ? status.color : "text-zinc-600"}`}>
                          {delta !== null ? (delta >= 0 ? "+" : "") + delta.toFixed(3) : "-"}
                        </td>
                        <td className={`px-3 py-2 text-center text-xs font-medium ${status.color}`}>
                          {point.measured ? status.label : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSubmit}
        disabled={submitting || !allFilled}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Submit All Measurements
      </button>
      {!allFilled && (
        <p className="text-xs text-amber-400">{filledPoints.length}/{points.length} points measured.</p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Z Scaling Form                                                    */
/* ================================================================== */

function ZScalingForm({ sessionId, onComplete }: { sessionId: string; onComplete: (r: ComputedResults) => void }) {
  const defaultPoints: ZMeasurement[] = [
    { pointNumber: 1, position: "Bottom", nominal: 10, measured: "" },
    { pointNumber: 2, position: "Lower-Middle", nominal: 25, measured: "" },
    { pointNumber: 3, position: "Center", nominal: 50, measured: "" },
    { pointNumber: 4, position: "Upper-Middle", nominal: 75, measured: "" },
    { pointNumber: 5, position: "Top", nominal: 100, measured: "" },
  ];

  const [points, setPoints] = useState<ZMeasurement[]>(defaultPoints);
  const [submitting, setSubmitting] = useState(false);

  const updateMeasured = (i: number, value: string) => {
    setPoints((prev) => prev.map((p, idx) => (idx === i ? { ...p, measured: value } : p)));
  };

  const filledPoints = points.filter((p) => p.measured !== "");
  const deltas = filledPoints.map((p) => parseFloat(p.measured) - p.nominal);
  const meanErr = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;

  // Correction factor: nominal / measured average ratio
  const measuredVals = filledPoints.map((p) => parseFloat(p.measured));
  const nominalVals = filledPoints.map((p) => p.nominal);
  const correctionFactor =
    measuredVals.length > 0
      ? nominalVals.reduce((a, b) => a + b, 0) / measuredVals.reduce((a, b) => a + b, 0)
      : 1;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(`${OPENFARM_URL}/api/calibration/sessions/${sessionId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "z_scaling",
          measurements: points.map((p) => ({
            pointNumber: p.pointNumber,
            position: p.position,
            nominal: p.nominal,
            measured: parseFloat(p.measured) || null,
          })),
        }),
      });
      const res = await fetch(`${OPENFARM_URL}/api/calibration/sessions/${sessionId}/results`, {
        method: "POST",
      });
      const data = await res.json();
      onComplete(data);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const allFilled = points.every((p) => p.measured !== "");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">Z Scaling Measurements</h2>
        <p className="text-sm text-zinc-400">
          Measure the vertical reference points at different build positions.
        </p>
      </div>

      {/* Summary */}
      {filledPoints.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Mean Error</div>
            <div className="text-lg font-mono font-bold text-zinc-100">{meanErr.toFixed(3)} mm</div>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Correction Factor</div>
            <div className="text-lg font-mono font-bold text-zinc-100">{correctionFactor.toFixed(5)}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800 border-b border-zinc-700">
              <th className="text-left px-3 py-2 font-medium text-zinc-400 w-16">Point</th>
              <th className="text-left px-3 py-2 font-medium text-zinc-400">Position</th>
              <th className="text-right px-3 py-2 font-medium text-zinc-400 w-24">Nominal (mm)</th>
              <th className="text-right px-3 py-2 font-medium text-zinc-400 w-32">Measured (mm)</th>
              <th className="text-right px-3 py-2 font-medium text-zinc-400 w-24">Delta</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, i) => {
              const m = parseFloat(point.measured);
              const delta = !isNaN(m) ? m - point.nominal : null;
              return (
                <tr key={point.pointNumber} className="border-b border-zinc-800">
                  <td className="px-3 py-2 text-zinc-300 font-mono">#{point.pointNumber}</td>
                  <td className="px-3 py-2 text-zinc-300">{point.position}</td>
                  <td className="px-3 py-2 text-right text-zinc-400 font-mono">{point.nominal.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={point.measured}
                      onChange={(e) => updateMeasured(i, e.target.value)}
                      placeholder="0.00"
                      className="w-24 text-right rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${delta !== null ? (Math.abs(delta) < 0.3 ? "text-green-400" : Math.abs(delta) < 0.5 ? "text-amber-400" : "text-red-400") : "text-zinc-600"}`}>
                    {delta !== null ? (delta >= 0 ? "+" : "") + delta.toFixed(3) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !allFilled}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Submit Measurements
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Diagnostic Form                                                   */
/* ================================================================== */

function DiagnosticForm({ sessionId, onComplete }: { sessionId: string; onComplete: (r: ComputedResults) => void }) {
  const defaultCategories: DiagnosticCategory[] = [
    { category: "Surface Finish", grade: "", notes: "" },
    { category: "Dimensional Accuracy", grade: "", notes: "" },
    { category: "Layer Adhesion", grade: "", notes: "" },
    { category: "Part Density", grade: "", notes: "" },
    { category: "Warping / Curling", grade: "", notes: "" },
    { category: "Detail Resolution", grade: "", notes: "" },
    { category: "Mechanical Strength", grade: "", notes: "" },
    { category: "Powder Removal", grade: "", notes: "" },
  ];

  const [categories, setCategories] = useState<DiagnosticCategory[]>(defaultCategories);
  const [submitting, setSubmitting] = useState(false);

  const updateCategory = (i: number, field: keyof DiagnosticCategory, value: string) => {
    setCategories((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const gradeColors: Record<string, string> = {
    pass: "border-green-600 bg-green-950/30",
    marginal: "border-amber-600 bg-amber-950/30",
    fail: "border-red-600 bg-red-950/30",
    "": "border-zinc-700",
  };

  const gradeIcons: Record<string, React.ReactNode> = {
    pass: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    marginal: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    fail: <XCircle className="w-4 h-4 text-red-400" />,
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(`${OPENFARM_URL}/api/calibration/sessions/${sessionId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "diagnostic",
          evaluations: categories.map((c) => ({
            category: c.category,
            grade: c.grade,
            notes: c.notes,
          })),
        }),
      });
      const res = await fetch(`${OPENFARM_URL}/api/calibration/sessions/${sessionId}/results`, {
        method: "POST",
      });
      const data = await res.json();
      onComplete(data);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const allGraded = categories.every((c) => c.grade !== "");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">Diagnostic Print Evaluation</h2>
        <p className="text-sm text-zinc-400">
          Grade each category based on your diagnostic print evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((cat, i) => (
          <div
            key={cat.category}
            className={`rounded-lg border-2 ${gradeColors[cat.grade]} p-4 transition-colors`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-zinc-100 text-sm">{cat.category}</h3>
              {cat.grade && gradeIcons[cat.grade]}
            </div>

            <label className="block text-xs font-medium text-zinc-500 mb-1">Grade</label>
            <select
              value={cat.grade}
              onChange={(e) => updateCategory(i, "grade", e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            >
              <option value="">-- Select --</option>
              <option value="pass">Pass</option>
              <option value="marginal">Marginal</option>
              <option value="fail">Fail</option>
            </select>

            <label className="block text-xs font-medium text-zinc-500 mb-1">Notes</label>
            <input
              type="text"
              value={cat.notes}
              onChange={(e) => updateCategory(i, "notes", e.target.value)}
              placeholder="Optional notes..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !allGraded}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Submit Evaluation
      </button>
      {!allGraded && (
        <p className="text-xs text-amber-400">{categories.filter((c) => c.grade !== "").length}/{categories.length} categories graded.</p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                         */
/* ================================================================== */

const FORM_ICONS: Record<string, React.ReactNode> = {
  btmt: <Thermometer className="w-5 h-5" />,
  xy_scaling: <Ruler className="w-5 h-5" />,
  z_scaling: <Box className="w-5 h-5" />,
  diagnostic: <Scan className="w-5 h-5" />,
};

export default function SlsMeasurementPage() {
  const params = useParams();
  const locale = (params.locale as string) || "de";
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<ComputedResults | null>(null);

  useEffect(() => {
    fetch(`${OPENFARM_URL}/api/calibration/sessions/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Session not found");
        return r.json();
      })
      .then((data) => setSession(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleComplete = (results: ComputedResults) => {
    setCompleted(results);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading session...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-24">
        <p className="text-red-400 mb-4">{error ?? "Session not found"}</p>
        <Link
          href={`/${locale}/openfarm/calibration`}
          className="text-blue-400 hover:underline"
        >
          Back to Calibration
        </Link>
      </div>
    );
  }

  // Success state
  if (completed) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-lg border border-green-700 bg-green-950/20 p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Measurements Submitted</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Results have been computed and sent to OpenFarm.
          </p>

          {completed.results && completed.results.length > 0 && (
            <div className="bg-zinc-900 rounded-lg p-4 mb-4 text-left space-y-2">
              {completed.results.map((r) => (
                <div key={r.key} className="flex justify-between text-sm">
                  <span className="text-zinc-400">{r.label}</span>
                  <span className="font-mono font-medium text-zinc-100">
                    {r.value}{r.unit ? ` ${r.unit}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {completed.recommendation && (
            <p className="text-sm text-amber-400 mb-4">{completed.recommendation}</p>
          )}

          <div className="flex gap-3 justify-center">
            <a
              href={`http://localhost:4174/${locale}/admin/calibration/${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue in OpenFarm
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link
              href={`/${locale}/openfarm/calibration`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Back to Calibration
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/openfarm/calibration`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Calibration
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950 text-blue-400">
          {FORM_ICONS[session.procedureType] ?? <Ruler className="w-5 h-5" />}
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{session.procedureName}</h1>
          <p className="text-sm text-zinc-500">
            {session.printerName} {session.materialName && <span>/ {session.materialName}</span>}
          </p>
        </div>
      </div>

      {/* Render appropriate form */}
      {session.procedureType === "btmt" && (
        <BtmtForm sessionId={sessionId} onComplete={handleComplete} />
      )}
      {session.procedureType === "xy_scaling" && (
        <XyScalingForm sessionId={sessionId} onComplete={handleComplete} />
      )}
      {session.procedureType === "z_scaling" && (
        <ZScalingForm sessionId={sessionId} onComplete={handleComplete} />
      )}
      {session.procedureType === "diagnostic" && (
        <DiagnosticForm sessionId={sessionId} onComplete={handleComplete} />
      )}
      {!["btmt", "xy_scaling", "z_scaling", "diagnostic"].includes(session.procedureType) && (
        <div className="text-center py-12 text-zinc-500">
          <p>Unknown procedure type: {session.procedureType}</p>
        </div>
      )}
    </div>
  );
}
