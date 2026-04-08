"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode } from "react";

interface PanelContainerProps {
  title: string;
  side: "left" | "right";
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  headerSlot?: ReactNode;
  footerSlot?: ReactNode;
  width?: number;
}

export function PanelContainer({
  title,
  side,
  isOpen,
  onToggle,
  children,
  headerSlot,
  footerSlot,
  width = 280,
}: PanelContainerProps) {
  const CollapseIcon =
    side === "left"
      ? isOpen
        ? ChevronLeft
        : ChevronRight
      : isOpen
        ? ChevronRight
        : ChevronLeft;

  return (
    <div
      className="relative flex h-full shrink-0 transition-[width] duration-200 ease-in-out"
      style={{ width: isOpen ? width : 0 }}
    >
      {/* Panel content */}
      <div
        className={`flex h-full flex-col overflow-hidden bg-[var(--bg-secondary)] ${
          side === "left" ? "border-r" : "border-l"
        } border-[var(--border)]`}
        style={{ width }}
      >
        {/* Header */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel-header)] px-3">
          {headerSlot ?? (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
              {title}
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Sticky footer */}
        {footerSlot && (
          <div className="shrink-0 border-t border-[var(--border)]">
            {footerSlot}
          </div>
        )}
      </div>

      {/* Toggle button — sits on the edge */}
      <button
        onClick={onToggle}
        className={`absolute top-1/2 z-10 flex h-6 w-4 -translate-y-1/2 items-center justify-center rounded-sm bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] ${
          side === "left"
            ? isOpen
              ? "-right-4"
              : "right-0 translate-x-full"
            : isOpen
              ? "-left-4"
              : "left-0 -translate-x-full"
        }`}
        aria-label={`${isOpen ? "Collapse" : "Expand"} ${title} panel`}
      >
        <CollapseIcon size={12} />
      </button>
    </div>
  );
}
