import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { flowSteps, stepComponents, flowEdges } from "@/db/schema";

export interface GeneratedComponent {
  componentType: string;
  fieldKey: string;
  label: string;
  required: boolean;
  config: Record<string, unknown>;
}

export interface GeneratedStep {
  label: string;
  type: "start" | "step" | "end";
  components: GeneratedComponent[];
}

export interface ThemeSettings {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius?: string;
}

/**
 * Delete all steps, components (via cascade), and edges for a given flowId.
 * Safe to call when the flow is fresh (no-op in that case).
 */
async function clearFlowContent(flowId: string): Promise<void> {
  // Delete edges first (they reference steps). stepComponents will cascade when steps are deleted.
  await db.delete(flowEdges).where(eq(flowEdges.flowId, flowId));
  await db.delete(flowSteps).where(eq(flowSteps.flowId, flowId));
}

/**
 * Insert step wrappers (start + content + end), their components, and linear edges.
 * Shared by /api/ai/generate and /api/ai/regenerate.
 */
export async function buildFlowInDb(args: {
  flowId: string;
  generatedSteps: GeneratedStep[];
  theme?: ThemeSettings;
  clearExisting?: boolean;
}): Promise<{ stepCount: number }> {
  const { flowId, generatedSteps, theme, clearExisting } = args;

  if (clearExisting) {
    await clearFlowContent(flowId);
  }

  // Wrap generated content steps with proper empty start/end placeholders.
  // All content steps become type "step" so they appear in the sidebar page list.
  const allSteps: GeneratedStep[] = [
    { label: "Start", type: "start", components: [] },
    ...generatedSteps.map((s) => ({ ...s, type: "step" as const })),
    { label: "Ende", type: "end", components: [] },
  ];

  let sortOrder = 0;
  const stepIds: string[] = [];
  for (const stepDef of allSteps) {
    const [step] = await db.insert(flowSteps).values({
      flowId,
      type: stepDef.type,
      label: stepDef.label,
      sortOrder,
      positionX: 100,
      positionY: sortOrder * 200 + 50,
      config: JSON.stringify({
        title: stepDef.label,
        layout: "single-column",
        showProgress: stepDef.type === "step",
      }),
    }).returning();

    sortOrder++;
    stepIds.push(step.id);

    for (let ci = 0; ci < stepDef.components.length; ci++) {
      const compDef = stepDef.components[ci];
      await db.insert(stepComponents).values({
        stepId: step.id,
        componentType: compDef.componentType,
        fieldKey: compDef.fieldKey,
        label: compDef.label,
        required: compDef.required,
        config: JSON.stringify(compDef.config),
        sortOrder: ci,
      });
    }
  }

  // Linear edges
  for (let i = 0; i < stepIds.length - 1; i++) {
    await db.insert(flowEdges).values({
      flowId,
      sourceStepId: stepIds[i],
      targetStepId: stepIds[i + 1],
      conditionType: "always",
      priority: 0,
    });
  }

  // Theme settings (optional)
  if (theme) {
    // This is handled by the caller via updateFlow — keep builder focused on structure.
  }

  return { stepCount: generatedSteps.length };
}

/**
 * Build the JSON settings blob for flow.settings from theme hints.
 */
export function buildSettingsFromTheme(theme: ThemeSettings): string {
  return JSON.stringify({
    theme: {
      primaryColor: theme.primaryColor,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
      cardBackgroundColor: theme.backgroundColor,
      borderRadius: theme.borderRadius ?? "0.75rem",
      fontFamily: "system-ui",
      headingFont: "system-ui",
      bodyFont: "system-ui",
      headingColor: theme.textColor,
      borderColor: "#e5e7eb",
      borderWidth: "1px",
      transitionStyle: "fade",
      selectionColor: theme.primaryColor,
      elevationStyle: "soft",
      cardVariant: "elevated",
      inputVariant: "bordered",
    },
    showProgressBar: true,
    progressBarStyle: "dots",
    submitButtonText: "Absenden",
  });
}
