import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { getFlowById } from "@/db/queries/flows";
import { db } from "@/db";
import { flows, flowSteps, stepComponents, flowEdges } from "@/db/schema";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const original = await getFlowById(id);

    if (!original) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    // 1. Create new flow
    const newFlowId = crypto.randomUUID();
    const [newFlow] = await db.insert(flows).values({
      id: newFlowId,
      name: `${original.name} (Kopie)`,
      slug: `${original.slug}-copy-${Date.now()}`,
      description: original.description,
      status: "draft",
      settings: original.settings,
    }).returning();

    // 2. Build old step ID -> new step ID mapping and copy steps
    const stepIdMap = new Map<string, string>();

    for (const step of original.steps) {
      const newStepId = crypto.randomUUID();
      stepIdMap.set(step.id, newStepId);

      await db.insert(flowSteps).values({
        id: newStepId,
        flowId: newFlowId,
        type: step.type,
        label: step.label,
        positionX: step.positionX,
        positionY: step.positionY,
        config: step.config as unknown as string,
        sortOrder: step.sortOrder,
      });

      // 3. Copy components for this step
      for (const component of step.components) {
        await db.insert(stepComponents).values({
          id: crypto.randomUUID(),
          stepId: newStepId,
          componentType: component.componentType,
          fieldKey: component.fieldKey,
          label: component.label,
          config: component.config as unknown as string,
          validation: component.validation as unknown as string,
          sortOrder: component.sortOrder,
          required: component.required,
        });
      }
    }

    // 4. Copy edges with remapped step IDs
    for (const edge of original.edges) {
      const newSourceId = stepIdMap.get(edge.sourceStepId);
      const newTargetId = stepIdMap.get(edge.targetStepId);

      if (newSourceId && newTargetId) {
        await db.insert(flowEdges).values({
          id: crypto.randomUUID(),
          flowId: newFlowId,
          sourceStepId: newSourceId,
          targetStepId: newTargetId,
          conditionType: edge.conditionType,
          conditionFieldKey: edge.conditionFieldKey,
          conditionValue: edge.conditionValue,
          label: edge.label,
          priority: edge.priority,
        });
      }
    }

    // Return the full new flow
    const duplicatedFlow = await getFlowById(newFlowId);
    return NextResponse.json(duplicatedFlow, { status: 201 });
  } catch (error) {
    console.error("[POST /api/flows/[id]/duplicate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
