"use client";
import React from "react";
import type { FlowStep, DisplayRule } from "@opensoftware/openflow-core";
import { isComponentVisible } from "@opensoftware/openflow-core";
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
  displayRules?: DisplayRule[];
  onNext?: () => void;
  /** Navigate to the next step without running field validation */
  onNextSkipValidation?: () => void;
  onBack?: () => void;
  onJump?: (stepId: string) => void;
  onSubmit?: () => void;
  /** Validates all required fields on the current step. Returns true if valid. */
  onValidate?: () => boolean;
}

export function StepRenderer({
  step,
  answers,
  errors,
  primaryColor,
  theme,
  displayRules,
  onNext,
  onNextSkipValidation,
  onBack,
  onJump,
  onSubmit,
  onValidate,
}: StepRendererProps) {
  const { setAnswer, setPhoneValid } = useRendererStore();

  function executeNavAction(navAction: NavigationAction) {
    if (navAction.type === "next") {
      onNext?.();
    } else if (navAction.type === "jump" && navAction.targetStepId) {
      onJump?.(navAction.targetStepId);
    } else if (navAction.type === "submit") {
      onSubmit?.();
    } else if (navAction.type === "conditional") {
      // Conditional logic resolved by FlowRenderer via edges — treat as next
      onNext?.();
    }
  }

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
        {step.components.filter(c => isComponentVisible(c, answers)).map((component) => {
          const isButton = BUTTON_TYPES.has(component.componentType);
          const isAutoNav = AUTO_NAV_TYPES.has(component.componentType);
          const navAction = component.config?.navigationAction as NavigationAction | undefined;

          return (
            <ComponentRenderer
              key={component.id}
              component={component}
              value={answers[component.fieldKey]}
              error={errors[component.fieldKey]}
              onChange={(value, valid) => {
                if (isButton) {
                  // submit-button always submits regardless of config
                  const isSubmitType = component.componentType === "submit-button" || component.componentType === "SubmitButton";
                  // Buttons pass their action as the value (e.g. "next", "previous", "submit", "jump")
                  const buttonAction = isSubmitType ? "submit" : ((value as string) || "next");
                  const skipVal = !!(component.config as Record<string, unknown>)?.skipValidation;
                  if (buttonAction === "previous" || buttonAction === "back") {
                    // Back/previous never requires validation
                    onBack?.();
                  } else if (buttonAction === "submit") {
                    // Validate before submit
                    if (onValidate && !onValidate()) return;
                    onSubmit?.();
                  } else if (buttonAction === "jump" && component.config?.targetStepId) {
                    // Validate before jump (unless skip-validation is enabled)
                    if (!skipVal && onValidate && !onValidate()) return;
                    onJump?.(component.config.targetStepId as string);
                  } else {
                    // "next" — use skip-validation variant if configured
                    skipVal ? onNextSkipValidation?.() : onNext?.();
                  }
                  return;
                }

                // Store the answer
                setAnswer(component.fieldKey, value);
                if (component.componentType === "PhoneInput" || component.componentType === "phone-input") {
                  setPhoneValid(component.fieldKey, valid ?? false);
                }

                // Auto-navigate after selection for navigable component types.
                // Per-option navigation: for card-selector and image-choice, each
                // card/option can carry its own navigationAction. If it does, that
                // takes priority over the component-level action. If the per-option
                // action is explicitly "none", navigation is blocked for that option
                // even if the component-level action would navigate.
                if (isAutoNav) {
                  // Resolve the effective navigation action for the clicked option
                  let effectiveNavAction: NavigationAction | undefined = navAction;

                  const type = component.componentType.toLowerCase();
                  if (type === "card-selector" || type === "cardselector") {
                    const cards = component.config?.cards as Array<{ key: string; navigationAction?: NavigationAction }> | undefined;
                    const card = cards?.find((c) => c.key === value);
                    if (card && card.navigationAction !== undefined) {
                      effectiveNavAction = card.navigationAction;
                    }
                  } else if (type === "image-choice" || type === "imagechoice") {
                    const options = component.config?.options as Array<{ value: string; navigationAction?: NavigationAction }> | undefined;
                    const opt = options?.find((o) => o.value === value);
                    if (opt && opt.navigationAction !== undefined) {
                      effectiveNavAction = opt.navigationAction;
                    }
                  }

                  if (effectiveNavAction && effectiveNavAction.type !== "none") {
                    // Small delay so the selection is visible before navigating
                    setTimeout(() => {
                      // Block navigation if any required field on this page is unmet
                      if (onValidate && !onValidate()) return;
                      executeNavAction(effectiveNavAction!);
                    }, 300);
                  }
                }
              }}
              primaryColor={primaryColor}
              theme={theme}
              stepId={step.id}
              displayRules={displayRules}
              answers={answers}
            />
          );
        })}
      </div>
    </div>
  );
}
