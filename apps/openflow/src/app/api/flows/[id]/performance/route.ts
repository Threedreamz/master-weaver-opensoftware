import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { getFlowById } from "@/db/queries/flows";
import type { FlowDefinition } from "@opensoftware/openflow-core";

// ─── Performance Analysis Engine ─────────────────────────────────────────────

interface PerformanceFinding {
  category: "images" | "components" | "structure" | "scripts" | "fonts";
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
  value?: string | number;
}

interface PerformanceReport {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  findings: PerformanceFinding[];
  stats: {
    totalSteps: number;
    totalComponents: number;
    totalImages: number;
    estimatedImageBytes: number;
    hasCustomJS: boolean;
    hasCustomCSS: boolean;
    hasTracking: boolean;
    fontsLoaded: string[];
    componentTypeDistribution: Record<string, number>;
  };
}

function estimateImageBytes(url: string): number {
  // Heuristic estimate based on URL patterns
  if (url.includes("unsplash") || url.includes("pixabay") || url.includes("pexels")) return 400_000;
  if (url.includes("svg")) return 5_000;
  if (url.includes("icon")) return 10_000;
  return 150_000; // generic estimate
}

function analyzePerformance(flow: FlowDefinition): PerformanceReport {
  const findings: PerformanceFinding[] = [];
  const settings = flow.settings;
  const theme = settings?.theme;

  let imageCount = 0;
  let estimatedImageBytes = 0;
  const componentTypeDist: Record<string, number> = {};
  const imageUrls: string[] = [];

  for (const step of flow.steps) {
    for (const comp of step.components) {
      componentTypeDist[comp.componentType] = (componentTypeDist[comp.componentType] ?? 0) + 1;

      // Collect image URLs from configs
      const cfg = comp.config as Record<string, unknown>;
      if (comp.componentType === "image-block" && cfg.src) {
        const url = String(cfg.src);
        imageUrls.push(url);
        imageCount++;
        estimatedImageBytes += estimateImageBytes(url);
      }
      // Image choice options
      if (comp.componentType === "image-choice" && Array.isArray(cfg.options)) {
        for (const opt of cfg.options as { imageUrl?: string }[]) {
          if (opt.imageUrl) {
            imageUrls.push(opt.imageUrl);
            imageCount++;
            estimatedImageBytes += estimateImageBytes(opt.imageUrl);
          }
        }
      }
    }
  }

  const totalComponents = flow.steps.reduce((s, st) => s + st.components.length, 0);

  // ── Image checks ──────────────────────────────────────────────────────────
  if (imageCount > 10) {
    findings.push({ category: "images", severity: "warning", message: `${imageCount} Bilder im Flow — hohe Ladezeitwirkung.`, suggestion: "Reduziere die Bildanzahl oder verwende lazy loading.", value: imageCount });
  }
  if (estimatedImageBytes > 2_000_000) {
    findings.push({ category: "images", severity: "error", message: `Geschätztes Bildvolumen: ${Math.round(estimatedImageBytes / 1024)}KB — zu groß für mobile Nutzer.`, suggestion: "Komprimiere Bilder auf maximal 200KB je Bild. Verwende WebP-Format.", value: `${Math.round(estimatedImageBytes / 1024)}KB` });
  } else if (estimatedImageBytes > 500_000) {
    findings.push({ category: "images", severity: "warning", message: `Geschätztes Bildvolumen: ${Math.round(estimatedImageBytes / 1024)}KB.`, suggestion: "Optimiere Bilder für schnellere Ladezeiten.", value: `${Math.round(estimatedImageBytes / 1024)}KB` });
  }

  // Check for non-optimized image URLs
  const largeImages = imageUrls.filter((url) => !url.includes("w=") && !url.includes("width=") && !url.includes(".svg"));
  if (largeImages.length > 0) {
    findings.push({ category: "images", severity: "info", message: `${largeImages.length} Bilder ohne erkannte Größenoptimierung.`, suggestion: "Verwende responsive Bildgrößen (z.B. ?w=800 für Bildanbieter).", value: largeImages.length });
  }

  // ── Component checks ──────────────────────────────────────────────────────
  if (totalComponents > 50) {
    findings.push({ category: "components", severity: "warning", message: `${totalComponents} Elemente im Flow — hohe Rendering-Kosten.`, suggestion: "Verteile Felder auf mehr Schritte für bessere Performance und UX.", value: totalComponents });
  }

  const maxComponentsPerStep = Math.max(...flow.steps.map((s) => s.components.length), 0);
  if (maxComponentsPerStep > 15) {
    const heavyStep = flow.steps.find((s) => s.components.length === maxComponentsPerStep);
    findings.push({ category: "components", severity: "warning", message: `Schritt "${heavyStep?.label}" hat ${maxComponentsPerStep} Elemente — zu viele für eine Seite.`, suggestion: "Teile den Schritt in mehrere auf (max. 8–10 Elemente empfohlen).", value: maxComponentsPerStep });
  }

  // ── Script & tracking checks ──────────────────────────────────────────────
  const hasCustomJS = !!settings?.customJS;
  const hasCustomCSS = !!settings?.customCSS;
  const tracking = settings?.tracking;
  const trackerCount = tracking ? Object.values(tracking).filter(Boolean).length : 0;
  const hasTracking = trackerCount > 0;

  if (hasCustomJS) {
    findings.push({ category: "scripts", severity: "info", message: "Custom JavaScript eingebunden — kann Ladezeit und Sicherheit beeinflussen.", suggestion: "Verwende Custom JS sparsam und nur für notwendige Anpassungen." });
  }
  if (trackerCount > 2) {
    findings.push({ category: "scripts", severity: "warning", message: `${trackerCount} Tracking-Skripte eingebunden (GA, GTM, Meta Pixel...).`, suggestion: "Jedes Tracking-Skript verzögert die Ladezeit. Reduziere auf das Notwendige.", value: trackerCount });
  }

  // ── Font checks ───────────────────────────────────────────────────────────
  const fontsLoaded: string[] = [];
  if (theme?.headingFont && theme.headingFont !== "Inter") fontsLoaded.push(theme.headingFont);
  if (theme?.bodyFont && theme.bodyFont !== "Inter" && theme.bodyFont !== theme.headingFont) fontsLoaded.push(theme.bodyFont);
  if (theme?.fontFamily && !fontsLoaded.includes(theme.fontFamily)) fontsLoaded.push(theme.fontFamily);

  if (fontsLoaded.length > 2) {
    findings.push({ category: "fonts", severity: "warning", message: `${fontsLoaded.length} externe Schriftarten: ${fontsLoaded.join(", ")}.`, suggestion: "Mehr als 2 Schriftfamilien verlangsamen den ersten Seitenaufbau.", value: fontsLoaded.length });
  }

  // ── Structure checks ──────────────────────────────────────────────────────
  if (flow.steps.length > 20) {
    findings.push({ category: "structure", severity: "info", message: `Flow hat ${flow.steps.length} Schritte — lange Flows erhöhen Abbruchraten.`, suggestion: "Prüfe, ob Schritte zusammengefasst werden können.", value: flow.steps.length });
  }

  // ── Score calculation ──────────────────────────────────────────────────────
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 7);
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  const summary = score >= 90
    ? "Ausgezeichnete Performance — keine kritischen Probleme."
    : score >= 75 ? "Gute Performance — einige Optimierungen empfohlen."
    : score >= 60 ? "Akzeptable Performance — mehrere Probleme beheben."
    : "Schlechte Performance — kritische Probleme vorhanden.";

  return {
    score,
    grade,
    summary,
    findings,
    stats: {
      totalSteps: flow.steps.length,
      totalComponents,
      totalImages: imageCount,
      estimatedImageBytes,
      hasCustomJS,
      hasCustomCSS,
      hasTracking,
      fontsLoaded,
      componentTypeDistribution: componentTypeDist,
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const flow = await getFlowById(id);
    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    const report = analyzePerformance(flow as unknown as FlowDefinition);
    return NextResponse.json(report);
  } catch (error) {
    console.error("[GET /api/flows/[id]/performance]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
