"use client";
import React from "react";
import type { ResolvedTheme } from "./FlowRenderer";

interface ProgressBarProps {
  current: number;
  total: number;
  style?: "dots" | "bar" | "steps";
  primaryColor: string;
  theme: ResolvedTheme;
}

export function ProgressBar({ current, total, style = "bar", primaryColor, theme }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  if (style === "dots") {
    return (
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1.5rem" }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: i <= current ? primaryColor : theme.borderColor,
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
    );
  }

  if (style === "steps") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "1.5rem" }}>
        {Array.from({ length: total }, (_, i) => (
          <React.Fragment key={i}>
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                background: i <= current ? primaryColor : theme.borderColor,
                color: i <= current ? "#fff" : theme.textMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8125rem",
                fontWeight: 600,
              }}
            >
              {i + 1}
            </div>
            {i < total - 1 && (
              <div style={{ flex: 1, height: "2px", background: i < current ? primaryColor : theme.borderColor }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Default: bar
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.375rem",
          fontSize: "0.8125rem",
          color: theme.textMuted,
        }}
      >
        <span>
          Step {current + 1} of {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div style={{ height: "0.375rem", background: theme.borderColor, borderRadius: "9999px" }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: primaryColor,
            borderRadius: "9999px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
