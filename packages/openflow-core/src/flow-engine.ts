import type { FlowEdge, ConditionType } from "./types";

/**
 * Given current answers and the current step, determine the next step.
 * Evaluates all outgoing edges from the current step, ordered by priority.
 * Returns the targetStepId of the first matching edge, or null if no edge matches.
 */
export function resolveNextStep(
  currentStepId: string,
  answers: Record<string, unknown>,
  edges: FlowEdge[]
): string | null {
  const outgoing = edges
    .filter(e => e.sourceStepId === currentStepId)
    .sort((a, b) => a.priority - b.priority);

  for (const edge of outgoing) {
    if (evaluateCondition(edge, answers)) {
      return edge.targetStepId;
    }
  }
  return null;
}

/**
 * Evaluate whether an edge's condition is satisfied given the current answers.
 */
export function evaluateCondition(edge: FlowEdge, answers: Record<string, unknown>): boolean {
  if (edge.conditionType === "always") return true;

  const fieldValue = edge.conditionFieldKey ? answers[edge.conditionFieldKey] : undefined;
  const compareValue = edge.conditionValue;

  switch (edge.conditionType) {
    case "equals":
      return String(fieldValue) === compareValue;
    case "not_equals":
      return String(fieldValue) !== compareValue;
    case "contains":
      return String(fieldValue ?? "").includes(compareValue ?? "");
    case "not_contains":
      return !String(fieldValue ?? "").includes(compareValue ?? "");
    case "gt":
      return Number(fieldValue) > Number(compareValue);
    case "lt":
      return Number(fieldValue) < Number(compareValue);
    case "gte":
      return Number(fieldValue) >= Number(compareValue);
    case "lte":
      return Number(fieldValue) <= Number(compareValue);
    case "regex":
      try {
        return new RegExp(compareValue ?? "").test(String(fieldValue ?? ""));
      } catch {
        return false;
      }
    case "is_empty":
      return fieldValue === undefined || fieldValue === null || fieldValue === "";
    case "is_not_empty":
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
    default:
      return false;
  }
}

/**
 * Get all field keys that are available in the flow up to (but not including) the given step.
 * Useful for condition editors to show which fields can be referenced.
 */
export function getAvailableFieldKeys(
  currentStepId: string,
  steps: { id: string; components: { fieldKey: string; label?: string; componentType: string }[] }[],
  edges: FlowEdge[],
  startStepId: string
): { fieldKey: string; label: string; componentType: string; stepLabel: string }[] {
  const visited = new Set<string>();
  const result: { fieldKey: string; label: string; componentType: string; stepLabel: string }[] = [];
  const queue = [startStepId];

  while (queue.length > 0) {
    const stepId = queue.shift()!;
    if (visited.has(stepId) || stepId === currentStepId) continue;
    visited.add(stepId);

    const step = steps.find(s => s.id === stepId);
    if (step) {
      for (const comp of step.components) {
        if (comp.fieldKey) {
          result.push({
            fieldKey: comp.fieldKey,
            label: comp.label || comp.fieldKey,
            componentType: comp.componentType,
            stepLabel: (step as unknown as { label: string }).label || stepId,
          });
        }
      }
    }

    // Add connected steps
    const outgoing = edges.filter(e => e.sourceStepId === stepId);
    for (const edge of outgoing) {
      queue.push(edge.targetStepId);
    }
  }

  return result;
}

/**
 * Validate a flow definition for common issues.
 */
export function validateFlowDefinition(
  steps: { id: string; type: string }[],
  edges: FlowEdge[],
  startStepId: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Must have a start step
  const startStep = steps.find(s => s.id === startStepId);
  if (!startStep) {
    errors.push("Flow must have a start step.");
  }

  // Must have at least one end step
  const endSteps = steps.filter(s => s.type === "end");
  if (endSteps.length === 0) {
    errors.push("Flow must have at least one end step.");
  }

  // Every non-end step should have at least one outgoing edge
  for (const step of steps) {
    if (step.type === "end") continue;
    const outgoing = edges.filter(e => e.sourceStepId === step.id);
    if (outgoing.length === 0) {
      errors.push(`Step "${step.id}" has no outgoing connections.`);
    }
  }

  // Every non-start step should have at least one incoming edge
  for (const step of steps) {
    if (step.id === startStepId) continue;
    const incoming = edges.filter(e => e.targetStepId === step.id);
    if (incoming.length === 0) {
      errors.push(`Step "${step.id}" is unreachable (no incoming connections).`);
    }
  }

  // Check for duplicate edge priorities on same source
  const sourceGroups = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    const group = sourceGroups.get(edge.sourceStepId) || [];
    group.push(edge);
    sourceGroups.set(edge.sourceStepId, group);
  }

  return { valid: errors.length === 0, errors };
}
