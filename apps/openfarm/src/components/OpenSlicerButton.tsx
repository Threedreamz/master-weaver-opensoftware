"use client";

import { ExternalLink } from "lucide-react";

interface OpenSlicerButtonProps {
  modelId: string;
  className?: string;
}

const OPENSLICER_URL =
  process.env.NEXT_PUBLIC_OPENSLICER_URL || "http://localhost:4175";

export function OpenSlicerButton({ modelId, className }: OpenSlicerButtonProps) {
  const slicerUrl = `${OPENSLICER_URL}?model=${encodeURIComponent(modelId)}&source=openfarm`;

  return (
    <a
      href={slicerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors ${className || ""}`}
    >
      <ExternalLink size={14} />
      Open in OpenSlicer
    </a>
  );
}
