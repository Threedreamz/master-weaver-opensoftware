"use client";
import React from "react";
import type { FlowStep } from "@opensoftware/openflow-core";
import type { ResolvedTheme } from "./FlowRenderer";
import { useRendererStore } from "./rendererStore";
import { ComponentRenderer } from "./ComponentRenderer";

/** Component types that act as navigation triggers (buttons) */
const BUTTON_TYPES = new Set(["button", "submit-button", "Button", "SubmitButton"]);

/** Component types that navigate immediately on selection */
const AUTO_NAV_TYPES = new Set([
  "image-choice", "card-selector", "radio-group", "rating", "slider",
  "ImageChoice", "CardSelector", "RadioGroup", "Rating", "Slider",
]);

interface NavigationAction {
  type: "none" | "next" | "jump" | "conditional" | "submit";
  targetStepId?: string;
}

interface StepRendererProps {
  step: FlowStep;
  answers: Record<string, unknown>;
  errors: Record<string, string>;
  primaryColor: string;
  theme: ResolvedTheme;
  onNext?: () => void;
  onBack?: () => void;
  onJump?: (stepId: string) => void;
  onSubmit?: () => void;
}

export function StepRenderer({ step, answers, errors, primaryColor, theme }: StepRendererProps) {
  const { setAnswer, setPhoneValid } = useRendererStore();

  return (
    <div className="step-renderer">
      {step.config.title && (
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: step.config.subtitle ? "0.25rem" : "1.5rem",
            color: theme.textColor,
          }}
        >
          {step.config.title}
        </h2>
      )}
      {step.config.subtitle && (
        <p style={{ color: theme.textMuted, marginBottom: "1.5rem" }}>{step.config.subtitle}</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {step.components.map((component) => (
          <ComponentRenderer
            key={component.id}
            component={component}
            value={answers[component.fieldKey]}
            error={errors[component.fieldKey]}
            onChange={(value, valid) => {
              setAnswer(component.fieldKey, value);
              if (component.componentType === "PhoneInput") {
                setPhoneValid(component.fieldKey, valid ?? false);
              }
            }}
            primaryColor={primaryColor}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}
