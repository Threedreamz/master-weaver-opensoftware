"use client";

import React, { useEffect, useState } from "react";
import type { FlowDefinition } from "@opensoftware/openflow-core";
import { resolveNextStep } from "@opensoftware/openflow-core";
import { useRendererStore } from "./rendererStore";
import { StepRenderer } from "./StepRenderer";
import { ProgressBar } from "./ProgressBar";
import { NavigationButtons } from "./NavigationButtons";
import { CookieConsent } from "./CookieConsent";
import { FlowHeader } from "./FlowHeader";
import { FlowFooter } from "./FlowFooter";

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
}

export function FlowRenderer({
  flow: flowProp,
  apiUrl,
  onSubmit,
  submissionApiUrl,
  embedMode = false,
  theme = {},
  showProgress = true,
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
      initFlow(flowProp);
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
    for (const component of currentStep.components) {
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
    }
    return !hasErrors;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    // Resolve next step via edges / conditional logic
    const nextStepId = resolveNextStep(currentStepId, answers, flowDefinition.edges);

    if (nextStepId) {
      const nextStep = flowDefinition.steps.find((s) => s.id === nextStepId);
      // Skip "end" placeholder steps — they signal the flow boundary but are not
      // real pages. When the next step is "end" we still just advance; the flow
      // completes naturally via the submit action.
      if (nextStep && nextStep.type !== "end") {
        goToStep(nextStepId);
      }
      // If nextStep.type === "end" → do nothing (no accidental submit)
    } else {
      // No edge leads forward from here.
      // Fall through to sequential order: find the next real step in sortOrder.
      const realSteps = flowDefinition.steps
        .filter((s) => s.type !== "start" && s.type !== "end")
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const currentIdx = realSteps.findIndex((s) => s.id === currentStepId);
      if (currentIdx !== -1 && currentIdx < realSteps.length - 1) {
        goToStep(realSteps[currentIdx + 1].id);
      }
      // On the last page with no further steps: do nothing.
      // The user must click an explicit Submit button to send the form.
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (submissionApiUrl) {
        const res = await fetch(submissionApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flowId: flowDefinition.id,
            answers,
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
      onSubmit?.(answers);
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
  };

  const { primaryColor, borderRadius } = resolvedTheme;

  const nextStepId = resolveNextStep(currentStepId, answers, flowDefinition.edges);
  const nextStep = nextStepId
    ? flowDefinition.steps.find((s) => s.id === nextStepId)
    : null;
  const isLastStep = !nextStepId || nextStep?.type === "end";

  const headerConfig = flowDefinition.settings.header;
  const footerConfig = flowDefinition.settings.footer;

  return (
    <div
      className="flow-renderer"
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
            step={currentStep}
            answers={answers}
            errors={errors}
            primaryColor={primaryColor}
            theme={resolvedTheme}
            onNext={handleNext}
            onBack={goBack}
            onJump={goToStep}
            onSubmit={handleSubmit}
            onValidate={validateCurrentStep}
          />
        </div>

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
