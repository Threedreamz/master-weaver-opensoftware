"use client";

import { useState } from "react";
import { ModelUpload } from "@/components/ModelUpload";
import { PrinterSelector } from "@/components/PrinterSelector";
import { SliceConfigForm } from "@/components/SliceConfigForm";

interface SlicePageClientProps {
  labels: {
    uploadModel: string;
    selectPrinter: string;
    sliceSettings: string;
    preview: string;
    previewPlaceholder: string;
  };
}

export function SlicePageClient({ labels }: SlicePageClientProps) {
  const [modelId, setModelId] = useState<string | null>(null);

  return (
    <>
      {/* Step 1: File Upload */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{labels.uploadModel}</h2>
        <ModelUpload
          onModelUploaded={(model) => setModelId(model.id)}
          onModelRemoved={() => setModelId(null)}
        />
      </section>

      {/* Step 2: Printer Selection */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{labels.selectPrinter}</h2>
        <PrinterSelector />
      </section>

      {/* Step 3: Slice Config */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{labels.sliceSettings}</h2>
        <SliceConfigForm modelId={modelId} />
      </section>

      {/* 3D Preview Placeholder */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{labels.preview}</h2>
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 h-64 flex items-center justify-center">
          <p className="text-gray-400 text-sm">{labels.previewPlaceholder}</p>
        </div>
      </section>
    </>
  );
}
