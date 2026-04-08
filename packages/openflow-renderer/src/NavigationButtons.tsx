"use client";
import React from "react";
import type { ResolvedTheme } from "./FlowRenderer";

interface NavigationButtonsProps {
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
  isLastStep?: boolean;
  isSubmitting: boolean;
  primaryColor: string;
  submitText?: string;
  nextText?: string;
  backText?: string;
  theme: ResolvedTheme;
}

export function NavigationButtons({
  onNext,
  onBack,
  canGoBack,
  isLastStep,
  isSubmitting,
  primaryColor,
  submitText = "Absenden",
  nextText = "Weiter",
  backText = "Zurück",
  theme,
}: NavigationButtonsProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", gap: "1rem" }}>
      {canGoBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "0.625rem 1.5rem",
            border: `1px solid ${theme.borderColor}`,
            borderRadius: "0.5rem",
            background: theme.surfaceColor,
            color: theme.textColor,
            cursor: "pointer",
            fontSize: "0.9375rem",
          }}
        >
          ← {backText}
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={isSubmitting}
        style={{
          padding: "0.625rem 1.75rem",
          background: isSubmitting ? theme.textMuted : primaryColor,
          color: "#fff",
          border: "none",
          borderRadius: "0.5rem",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          fontSize: "0.9375rem",
          fontWeight: 500,
        }}
      >
        {isSubmitting ? "Wird gesendet..." : isLastStep ? submitText : `${nextText} →`}
      </button>
    </div>
  );
}
