"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Package, Plus, Minus, Trash2 } from "lucide-react";
import { useEffect } from "react";

type Printer = {
  id: string;
  name: string;
  technology: string;
  buildVolumeX: number | null;
  buildVolumeY: number | null;
  buildVolumeZ: number | null;
};

type Model = {
  id: string;
  name: string;
  filename: string;
  boundingBoxX: number | null;
  boundingBoxY: number | null;
  boundingBoxZ: number | null;
  volumeCm3: number | null;
};

type SelectedModel = {
  model: Model;
  quantity: number;
};

export default function NewPackingJobPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);
  const [jobName, setJobName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch SLS printers and models on mount
  useEffect(() => {
    fetch("/api/packing/data")
      .then((res) => res.json())
      .then((data) => {
        setPrinters(data.printers ?? []);
        setModels(data.models ?? []);
      })
      .catch(() => setError("Failed to load data"));
  }, []);

  const selectedPrinter = printers.find((p) => p.id === selectedPrinterId);
  const totalParts = selectedModels.reduce((sum, sm) => sum + sm.quantity, 0);

  // Rough volume utilization estimate
  const buildVolume =
    selectedPrinter?.buildVolumeX && selectedPrinter.buildVolumeY && selectedPrinter.buildVolumeZ
      ? (selectedPrinter.buildVolumeX * selectedPrinter.buildVolumeY * selectedPrinter.buildVolumeZ) / 1000 // mm3 -> cm3
      : null;

  const totalModelVolume = selectedModels.reduce((sum, sm) => {
    return sum + (sm.model.volumeCm3 ?? 0) * sm.quantity;
  }, 0);

  const utilizationPercent = buildVolume && totalModelVolume > 0
    ? Math.min(100, Math.round((totalModelVolume / buildVolume) * 100))
    : null;

  function addModel(model: Model) {
    setSelectedModels((prev) => {
      const existing = prev.find((sm) => sm.model.id === model.id);
      if (existing) {
        return prev.map((sm) =>
          sm.model.id === model.id ? { ...sm, quantity: sm.quantity + 1 } : sm
        );
      }
      return [...prev, { model, quantity: 1 }];
    });
  }

  function updateQuantity(modelId: string, delta: number) {
    setSelectedModels((prev) =>
      prev
        .map((sm) =>
          sm.model.id === modelId
            ? { ...sm, quantity: Math.max(0, sm.quantity + delta) }
            : sm
        )
        .filter((sm) => sm.quantity > 0)
    );
  }

  function removeModel(modelId: string) {
    setSelectedModels((prev) => prev.filter((sm) => sm.model.id !== modelId));
  }

  async function handleSubmit() {
    if (!selectedPrinterId || selectedModels.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/packing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printerId: selectedPrinterId,
          name: jobName || `SLS Pack ${new Date().toISOString().slice(0, 10)}`,
          buildVolumeX: selectedPrinter?.buildVolumeX ?? 0,
          buildVolumeY: selectedPrinter?.buildVolumeY ?? 0,
          buildVolumeZ: selectedPrinter?.buildVolumeZ ?? 0,
          items: selectedModels.map((sm) => ({
            modelId: sm.model.id,
            quantity: sm.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create packing job");
      }

      router.push(`/${locale}/admin/packing`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create packing job");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/packing`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New SLS Pack Job</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s === step
                  ? "bg-amber-500 text-white"
                  : s < step
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className={`text-sm font-medium ${s === step ? "text-amber-600" : "text-gray-400"}`}>
              {s === 1 ? "Select Printer" : s === 2 ? "Add Models" : "Preview"}
            </span>
            {s < 3 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Select SLS Printer */}
      {step === 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select SLS Printer</h2>
          {printers.length === 0 ? (
            <p className="text-sm text-gray-500">No SLS printers available. Add an SLS printer first.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {printers.map((printer) => (
                <button
                  key={printer.id}
                  type="button"
                  onClick={() => setSelectedPrinterId(printer.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPrinterId === printer.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{printer.name}</p>
                      <p className="text-xs text-gray-500">
                        {printer.technology.toUpperCase()}
                        {printer.buildVolumeX && ` -- ${printer.buildVolumeX}x${printer.buildVolumeY}x${printer.buildVolumeZ} mm`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!selectedPrinterId}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Add Models */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Job Name */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <label htmlFor="jobName" className="block text-sm font-medium text-gray-700 mb-1">
              Job Name
            </label>
            <input
              type="text"
              id="jobName"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              placeholder={`SLS Pack ${new Date().toISOString().slice(0, 10)}`}
            />
          </div>

          {/* Selected Models */}
          {selectedModels.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Models ({totalParts} parts)
              </h2>
              <div className="divide-y divide-gray-100">
                {selectedModels.map((sm) => (
                  <div key={sm.model.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sm.model.name}</p>
                      <p className="text-xs text-gray-500">{sm.model.filename}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(sm.model.id, -1)}
                        className="p-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{sm.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(sm.model.id, 1)}
                        className="p-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeModel(sm.model.id)}
                        className="p-1 rounded text-red-400 hover:text-red-600 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Library */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Model Library</h2>
            {models.length === 0 ? (
              <p className="text-sm text-gray-500">No models uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {models.map((model) => {
                  const isSelected = selectedModels.some((sm) => sm.model.id === model.id);
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => addModel(model)}
                      className={`p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                        isSelected
                          ? "border-amber-300 bg-amber-50/50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{model.name}</p>
                      <p className="text-xs text-gray-500 truncate">{model.filename}</p>
                      {model.boundingBoxX && model.boundingBoxY && model.boundingBoxZ && (
                        <p className="text-xs text-gray-400 mt-1">
                          {model.boundingBoxX} x {model.boundingBoxY} x {model.boundingBoxZ} mm
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                        <Plus className="w-3 h-3" />
                        Add
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              disabled={selectedModels.length === 0}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pack Job Summary</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Job Name</dt>
                <dd className="font-medium text-gray-900">
                  {jobName || `SLS Pack ${new Date().toISOString().slice(0, 10)}`}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Printer</dt>
                <dd className="font-medium text-gray-900">{selectedPrinter?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Build Volume</dt>
                <dd className="font-medium text-gray-900">
                  {selectedPrinter?.buildVolumeX && selectedPrinter.buildVolumeY && selectedPrinter.buildVolumeZ
                    ? `${selectedPrinter.buildVolumeX} x ${selectedPrinter.buildVolumeY} x ${selectedPrinter.buildVolumeZ} mm`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Total Parts</dt>
                <dd className="font-medium text-gray-900">{totalParts}</dd>
              </div>
              {utilizationPercent !== null && (
                <div>
                  <dt className="text-gray-500">Est. Volume Utilization</dt>
                  <dd className="font-medium text-gray-900">~{utilizationPercent}%</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Models</h3>
            <div className="divide-y divide-gray-100">
              {selectedModels.map((sm) => (
                <div key={sm.model.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sm.model.name}</p>
                    <p className="text-xs text-gray-500">{sm.model.filename}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-700">x{sm.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Pack Job"}
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
