"use client";

import { useState, useRef, useEffect } from "react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  badge,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, open]);

  return (
    <div className="border-b border-zinc-700/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-zinc-800 px-3 py-2 text-left hover:bg-zinc-750 transition-colors"
      >
        <span
          className="text-[10px] text-zinc-500 transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          &#9654;
        </span>
        <span className="text-xs font-medium text-zinc-300 flex-1">
          {title}
        </span>
        {badge && (
          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-400">
            {badge}
          </span>
        )}
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: open ? (contentHeight ?? 1000) + "px" : "0px" }}
      >
        <div ref={contentRef} className="bg-zinc-900 px-3 py-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}
