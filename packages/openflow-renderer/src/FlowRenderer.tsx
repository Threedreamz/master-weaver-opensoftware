"use client";

import React, { useEffect, useState } from "react";
import type { FlowDefinition } from "@opensoftware/openflow-core";
import { resolveNextStep, isComponentVisible, isComponentVisibleCombined } from "@opensoftware/openflow-core";
import { useRendererStore } from "./rendererStore";
import { StepRenderer } from "./StepRenderer";
import { ProgressBar } from "./ProgressBar";
import { NavigationButtons } from "./NavigationButtons";
import { CookieConsent } from "./CookieConsent";
import { FlowHeader } from "./FlowHeader";
import { FlowFooter } from "./FlowFooter";
import { calculatePrice, formatPrice, formatPriceRange } from "./priceCalculator";

/** Fully resolved theme with all defaults applied */
export interface ResolvedTheme {
  primaryColor: string;
  backgroundColor: string;
  borderRadius: string;
  textColor: string;
  textMuted: string;
  surfaceColor: string;
  borderColor: string;
  inputBackground: string;
  errorColor: string;
  /** Color for selected state of cards, image-choices, radio buttons etc. Defaults to primaryColor. */
  selectionColor: string;
  /** Global elevation style; undefined/"none" keeps the previous flat look. */
  elevationStyle?: "none" | "soft" | "elevated";
  /** Variant for card-like components. */
  cardVariant?: "bordered" | "filled" | "elevated" | "ghost";
  /** Variant for input fields. */
  inputVariant?: "bordered" | "filled" | "underlined";
}

export interface FlowRendererProps {
  /** Full FlowDefinition object (when used embedded) */
  flow?: FlowDefinition;
  /** API URL to fetch the flow from (alternative to flow prop) */
  apiUrl?: string;
  /** Called when the form is completed with all answers */
  onSubmit?: (answers: Record<string, unknown>) => void;
  /** Submission API URL (posts answers to this endpoint) */
  submissionApiUrl?: string;
  /** Whether this is rendered in embed mode (enables custom JS execution) */
  embedMode?: boolean;
  /** Theming overrides */
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    borderRadius?: string;
    /** Heading/label text color (default: "inherit") */
    textColor?: string;
    /** Subtitles, descriptions (default: "#6b7280") */
    textMuted?: string;
    /** Input/card backgrounds (default: "#fff") */
    surfaceColor?: string;
    /** Input/card borders (default: "#d1d5db") */
    borderColor?: string;
    /** Form field backgrounds (default: "#fff") */
    inputBackground?: string;
    /** Validation errors (default: "#ef4444") */
    errorColor?: string;
    /** Color for selected state of cards/choices (default: primaryColor) */
    selectionColor?: string;
  };
  /** Show progress bar */
  showProgress?: boolean;
  /** If set, the flow starts on this step ID instead of the first step */
  initialStepId?: string;
}

export function FlowRenderer({
  flow: flowProp,
  apiUrl,
  onSubmit,
  submissionApiUrl,
  embedMode = false,
  theme = {},
  showProgress = true,
  initialStepId,
}: FlowRendererProps) {
  const [loading, setLoading] = useState(!flowProp);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    flowDefinition,
    currentStepId,
    answers,
    navigationHistory,
    errors,
    phoneValidity,
    isSubmitting,
    isCompleted,
    initFlow,
    goToStep,
    goBack,
    setSubmitting,
    setCompleted,
    setSubmissionId,
    clearErrors,
    setError,
  } = useRendererStore();

  // Inject custom JS (only in embed mode)
  useEffect(() => {
    if (!embedMode || !flowDefinition?.settings?.customJS) return;
    try {
      const script = document.createElement("script");
      script.textContent = flowDefinition.settings.customJS;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    } catch (err) {
      console.error("Failed to inject custom JS:", err);
    }
  }, [embedMode, flowDefinition?.settings?.customJS]);

  // Inject tracking scripts (only when cookie consent is accepted)
  useEffect(() => {
    const tracking = flowDefinition?.settings?.tracking;
    if (!tracking) return;

    const hasConsent = localStorage.getItem("openflow_cookie_consent") === "accepted";
    if (!hasConsent) return;

    const scripts: HTMLScriptElement[] = [];

    // GA4
    if (tracking.ga4Id) {
      const ga4Loader = document.createElement("script");
      ga4Loader.src = `https://www.googletagmanager.com/gtag/js?id=${tracking.ga4Id}`;
      ga4Loader.async = true;
      document.head.appendChild(ga4Loader);
      scripts.push(ga4Loader);

      const ga4Config = document.createElement("script");
      ga4Config.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${tracking.ga4Id}');
      `;
      document.head.appendChild(ga4Config);
      scripts.push(ga4Config);
    }

    // GTM
    if (tracking.gtmId) {
      const gtmScript = document.createElement("script");
      gtmScript.textContent = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${tracking.gtmId}');
      `;
      document.head.appendChild(gtmScript);
      scripts.push(gtmScript);
    }

    // Meta Pixel
    if (tracking.metaPixelId) {
      const metaScript = document.createElement("script");
      metaScript.textContent = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${tracking.metaPixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(metaScript);
      scripts.push(metaScript);
    }

    return () => {
      scripts.forEach((script) => {
        try { document.head.removeChild(script); } catch { /* already removed */ }
      });
    };
  }, [flowDefinition?.settings?.tracking]);

  // Inject custom head HTML (only in embed mode)
  useEffect(() => {
    if (!embedMode || !flowDefinition?.settings?.customHead) return;
    try {
      const container = document.createElement("div");
      container.setAttribute("data-openflow-head", "true");
      container.innerHTML = flowDefinition.settings.customHead;
      const nodes = Array.from(container.childNodes);
      nodes.forEach((node) => document.head.appendChild(node));
      return () => {
        nodes.forEach((node) => {
          try { document.head.removeChild(node); } catch { /* already removed */ }
        });
      };
    } catch (err) {
      console.error("Failed to inject custom head:", err);
    }
  }, [embedMode, flowDefinition?.settings?.customHead]);

  // Load flow
  useEffect(() => {
    if (flowProp) {
      initFlow(flowProp, initialStepId);
      return;
    }
    if (apiUrl) {
      setLoading(true);
      fetch(apiUrl)
        .then((r) => r.json())
        .then((data) => {
          initFlow(data);
          setLoading(false);
        })
        .catch(() => {
          setLoadError("Failed to load form");
          setLoading(false);
        });
    }
  }, [flowProp, apiUrl]);

  // Show loading spinner on first render before initFlow has run (store starts null)
  if (loading || (flowProp && !flowDefinition)) {
    return (
      <div
        className="flow-renderer-loading"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <div style={{ fontSize: "0.875rem", color: theme.textMuted || "#6b7280" }}>Loading form...</div>
      </div>
    );
  }

  if (loadError || !flowDefinition || !currentStepId) {
    return (
      <div
        className="flow-renderer-error"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <div style={{ color: theme.errorColor || "#ef4444" }}>{loadError || "Form not found"}</div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div
        className="flow-renderer-success"
        style={{
          padding: "3rem",
          textAlign: "center",
          background: theme.backgroundColor || "#fff",
          borderRadius: theme.borderRadius || "1rem",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          {flowDefinition.settings.successMessage || "Thank you!"}
        </h2>
        <p style={{ color: theme.textMuted || "#6b7280" }}>Your submission was received.</p>
      </div>
    );
  }

  const currentStep = flowDefinition.steps.find((s) => s.id === currentStepId);
  if (!currentStep) return null;

  const visibleSteps = flowDefinition.steps.filter(
    (s) => s.type !== "start" && s.type !== "end",
  );
  const stepIndex = visibleSteps.findIndex((s) => s.id === currentStepId);
  const totalSteps = visibleSteps.length;
  const canGoBack = navigationHistory.length > 1;

  // Validates all required fields on the current step.
  // Reads answers from the store via getState() to avoid stale-closure issues
  // when called from within a setTimeout (e.g. auto-nav elements).
  // Returns true if the step is valid, false otherwise (and sets error state).
  const validateCurrentStep = (): boolean => {
    const { answers: currentAnswers, phoneValidity: currentPhoneValidity } =
      useRendererStore.getState();
    clearErrors();
    let hasErrors = false;
    const displayRules = flowDefinition.displayRules ?? [];
    for (const component of currentStep.components) {
      if (!isComponentVisibleCombined(component, currentStep.id, displayRules, currentAnswers)) continue;
      if (component.required && !currentAnswers[component.fieldKey]) {
        setError(component.fieldKey, "Dieses Feld ist erforderlich");
        hasErrors = true;
      }
      if (
        (component.componentType === "PhoneInput" ||
          component.componentType === "phone-input") &&
        currentAnswers[component.fieldKey]
      ) {
        if (currentPhoneValidity[component.fieldKey] === false) {
          setError(component.fieldKey, "Bitte gib eine gültige Telefonnummer ein");
          hasErrors = true;
        }
      }
      // Contact form: validate required sub-fields and required checkboxes
      if (component.componentType === "contact-form" || component.componentType === "ContactForm") {
        const cfg = component.config as {
          showFirstName?: boolean; showLastName?: boolean;
          showEmail?: boolean; showPhone?: boolean;
          showCompany?: boolean; showVatId?: boolean; showBillingAddress?: boolean;
          checkboxes?: Array<{ id: string; label: string; required: boolean }>;
        };
        const fv = (currentAnswers[component.fieldKey] as Record<string, unknown>) || {};
        if (component.required) {
          if (cfg.showFirstName !== false && !fv.firstName) { setError(component.fieldKey, "Bitte fülle alle Pflichtfelder aus"); hasErrors = true; }
          else if (cfg.showLastName !== false && !fv.lastName) { setError(component.fieldKey, "Bitte fülle alle Pflichtfelder aus"); hasErrors = true; }
          else if (cfg.showEmail !== false && !fv.email) { setError(component.fieldKey, "Bitte fülle alle Pflichtfelder aus"); hasErrors = true; }
        }
        if (cfg.showPhone !== false && fv.phone && fv.phoneValid === false) {
          setError(component.fieldKey, "Ungültige Telefonnummer"); hasErrors = true;
        }
        for (const cb of cfg.checkboxes ?? []) {
          if (cb.required && !(fv.checkboxes as Record<string, boolean> | undefined)?.[cb.id]) {
            setError(component.fieldKey, `Pflichtfeld: "${cb.label}"`); hasErrors = true; break;
          }
        }
      }
    }
    return !hasErrors;
  };

  // Real steps sorted by sidebar order — used for next/prev navigation.
  const realStepsByOrder = flowDefinition.steps
    .filter((s) => s.type !== "start" && s.type !== "end")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  /** Navigate to the next step without running field validation (for skip-validation buttons). */
  const handleNextNoValidate = () => {
    const resolved = resolveNextStep(currentStepId!, answers, flowDefinition.edges);
    if (resolved) {
      goToStep(resolved);
      return;
    }
    const currentIdx = realStepsByOrder.findIndex((s) => s.id === currentStepId);
    if (currentIdx !== -1 && currentIdx < realStepsByOrder.length - 1) {
      goToStep(realStepsByOrder[currentIdx + 1]!.id);
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;
    // Try conditional edge routing first; fall back to sort-order when no edge matches.
    const resolved = resolveNextStep(currentStepId!, answers, flowDefinition.edges);
    if (resolved) {
      goToStep(resolved);
      return;
    }
    const currentIdx = realStepsByOrder.findIndex((s) => s.id === currentStepId);
    if (currentIdx !== -1 && currentIdx < realStepsByOrder.length - 1) {
      goToStep(realStepsByOrder[currentIdx + 1]!.id);
    }
    // On the last real page with no matching edge: do nothing — user clicks Submit.
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Attach calculated price to answers before submission
      const { total: calculatedPrice } = calculatePrice(answers, flowDefinition);
      const pricingEnabled = flowDefinition.settings?.pricingConfig?.enabled;
      const finalAnswers = pricingEnabled
        ? { ...answers, __calculatedPrice: calculatedPrice }
        : answers;

      if (submissionApiUrl) {
        const res = await fetch(submissionApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flowId: flowDefinition.id,
            answers: finalAnswers,
            status: "completed",
            metadata: {
              userAgent: navigator.userAgent,
              referrer: document.referrer,
              completedAt: new Date().toISOString(),
            },
          }),
        });
        const data = await res.json();
        if (data.submissionId) setSubmissionId(data.submissionId);
      }
      onSubmit?.(finalAnswers);
      setCompleted();
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedTheme: ResolvedTheme = {
    primaryColor:
      theme.primaryColor ||
      flowDefinition.settings.theme.primaryColor ||
      "#6366f1",
    backgroundColor: theme.backgroundColor || "#fff",
    borderRadius:
      theme.borderRadius || flowDefinition.settings.theme.borderRadius || "0.75rem",
    textColor: theme.textColor || "inherit",
    textMuted: theme.textMuted || "#6b7280",
    surfaceColor: theme.surfaceColor || "#fff",
    borderColor: theme.borderColor || "#d1d5db",
    inputBackground: theme.inputBackground || "#fff",
    errorColor: theme.errorColor || "#ef4444",
    selectionColor:
      theme.selectionColor ||
      flowDefinition.settings.theme.selectionColor ||
      theme.primaryColor ||
      flowDefinition.settings.theme.primaryColor ||
      "#6366f1",
    elevationStyle: flowDefinition.settings.theme.elevationStyle,
    cardVariant: flowDefinition.settings.theme.cardVariant,
    inputVariant: flowDefinition.settings.theme.inputVariant,
  };

  const { primaryColor, borderRadius } = resolvedTheme;

  // isLastStep: true when the current step is the last one by sort order.
  const currentRealIdx = realStepsByOrder.findIndex((s) => s.id === currentStepId);
  const isLastStep = currentRealIdx === realStepsByOrder.length - 1;

  // Determine if the current step has any self-navigating components.
  // Explicit buttons (button, submit-button) AND auto-nav selection components
  // (card-selector, image-choice, radio-group, rating, slider) all handle their
  // own navigation — no fallback NavigationButtons needed in those cases.
  // Mirror of AUTO_NAV_TYPES in StepRenderer.tsx.
  const SELF_NAVIGATING_TYPES = new Set([
    "button", "submit-button", "Button", "SubmitButton",
    "card-selector", "CardSelector",
    "image-choice", "ImageChoice",
    "radio-group", "RadioGroup",
    "rating", "Rating",
    "slider", "Slider",
  ]);
  const stepHasButtons = currentStep.components.some((c) =>
    SELF_NAVIGATING_TYPES.has(c.componentType) && isComponentVisibleCombined(c, currentStep.id, flowDefinition.displayRules ?? [], answers)
  );

  const headerConfig = flowDefinition.settings.header;
  const footerConfig = flowDefinition.settings.footer;

  return (
    <div
      className="flow-renderer openflow-renderer-scope"
      style={{
        background: resolvedTheme.backgroundColor,
        borderRadius,
        maxWidth: "680px",
        margin: "0 auto",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        overflow: "hidden",
      }}
    >
      {/* Inject custom CSS */}
      {flowDefinition.settings.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: flowDefinition.settings.customCSS }} />
      )}

      {/* Inject focus-ring + polish styles (uses CSS variables so inputs only need a class name) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .openflow-renderer-scope { --of-primary: ${primaryColor}; }
        .openflow-renderer-scope .openflow-input:focus,
        .openflow-renderer-scope .openflow-contact-form input:focus,
        .openflow-renderer-scope .openflow-contact-form select:focus,
        .openflow-renderer-scope .openflow-contact-form textarea:focus {
          outline: none;
          border-color: var(--of-primary) !important;
          box-shadow: 0 0 0 3px ${primaryColor}26;
        }
      ` }} />

      {/* Inject transition animation styles */}
      {flowDefinition.settings.theme.transitionStyle !== "none" && (
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes openflow-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes openflow-slide-in {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .openflow-transition-fade {
            animation: openflow-fade-in 300ms ease-in-out;
          }
          .openflow-transition-slide {
            animation: openflow-slide-in 300ms ease-in-out;
          }
        ` }} />
      )}

      {headerConfig?.enabled && (
        <FlowHeader
          logoUrl={headerConfig.logoUrl}
          title={headerConfig.title}
          backgroundColor={headerConfig.backgroundColor}
        />
      )}

      <div style={{ padding: "2rem" }}>
        {showProgress && totalSteps > 1 && (
          <ProgressBar
            current={Math.max(0, stepIndex)}
            total={totalSteps}
            style={flowDefinition.settings.progressBarStyle}
            primaryColor={primaryColor}
            theme={resolvedTheme}
          />
        )}

        {/* Live price badge — shown when pricing enabled and not hidden for this step */}
        {flowDefinition.settings?.pricingConfig?.enabled &&
          !(currentStep.config as Record<string, unknown>)?.hidePriceDisplay && (() => {
            const pc = flowDefinition.settings.pricingConfig!;
            const priceResult = calculatePrice(answers, flowDefinition);
            const isRange = priceResult.maxTotal !== undefined && priceResult.maxTotal !== priceResult.total;
            const priceStr = isRange
              ? formatPriceRange(priceResult.total, priceResult.maxTotal!, pc.currencySymbol)
              : formatPrice(priceResult.total, pc.currencySymbol);
            return (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: `${primaryColor}18`,
                  border: `1px solid ${primaryColor}35`,
                  borderRadius: "2rem",
                  padding: "0.375rem 0.875rem",
                }}>
                  <span style={{ color: resolvedTheme.textMuted, fontSize: "0.75rem", fontWeight: 500 }}>
                    {pc.label ?? "Geschätzter Preis"}
                  </span>
                  <span style={{ color: primaryColor, fontSize: "0.9375rem", fontWeight: 700 }}>
                    {priceStr}
                  </span>
                </div>
              </div>
            );
          })()
        }

        <div
          key={currentStepId}
          className={
            flowDefinition.settings.theme.transitionStyle === "fade"
              ? "openflow-transition-fade"
              : flowDefinition.settings.theme.transitionStyle === "slide"
                ? "openflow-transition-slide"
                : undefined
          }
        >
          <StepRenderer
            step={{
              ...currentStep,
              components: currentStep.components.filter(c =>
                isComponentVisibleCombined(c, currentStep.id, flowDefinition.displayRules ?? [], answers)
              ),
            }}
            answers={answers}
            errors={errors}
            primaryColor={primaryColor}
            theme={resolvedTheme}
            displayRules={flowDefinition.displayRules ?? []}
            onNext={handleNext}
            onNextSkipValidation={handleNextNoValidate}
            onBack={goBack}
            onJump={goToStep}
            onSubmit={handleSubmit}
            onValidate={validateCurrentStep}
          />
        </div>

        {/* Fallback navigation buttons — shown only when the step has no button/submit-button components */}
        {!stepHasButtons && (
          <NavigationButtons
            onNext={isLastStep ? handleSubmit : handleNext}
            onBack={goBack}
            canGoBack={canGoBack}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
            primaryColor={primaryColor}
            submitText={flowDefinition.settings.submitButtonText || "Absenden"}
            theme={resolvedTheme}
          />
        )}

      </div>

      {footerConfig?.enabled && (
        <FlowFooter
          text={footerConfig.text}
          links={footerConfig.links}
          backgroundColor={footerConfig.backgroundColor}
        />
      )}

      {flowDefinition.settings.cookieConsent?.enabled && (
        <CookieConsent
          text={flowDefinition.settings.cookieConsent.text}
          acceptLabel={flowDefinition.settings.cookieConsent.acceptLabel}
          declineLabel={flowDefinition.settings.cookieConsent.declineLabel}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
}
