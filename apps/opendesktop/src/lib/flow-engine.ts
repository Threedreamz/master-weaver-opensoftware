import { db } from "@/db";
import {
  deskFlowNodes,
  deskFlowEdges,
  deskVorgaenge,
  deskVorgangModules,
  deskVorgangHistory,
  deskModuleStatuses,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ==================== CONDITION TYPES ====================

type AlwaysCondition = { type: "always" };
type FieldCondition = {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains";
  value: string | number;
};
type AndCondition = { type: "and"; conditions: FlowCondition[] };
type OrCondition = { type: "or"; conditions: FlowCondition[] };

type FlowCondition =
  | AlwaysCondition
  | FieldCondition
  | AndCondition
  | OrCondition;

// ==================== CONDITION EVALUATOR ====================

export function evaluateCondition(
  condition: Record<string, unknown> | null,
  data: Record<string, unknown>
): boolean {
  if (!condition) return true;

  const cond = condition as unknown as FlowCondition;

  // Always-pass condition
  if ("type" in cond && cond.type === "always") {
    return true;
  }

  // AND compound
  if ("type" in cond && cond.type === "and") {
    return cond.conditions.every((c) =>
      evaluateCondition(c as Record<string, unknown>, data)
    );
  }

  // OR compound
  if ("type" in cond && cond.type === "or") {
    return cond.conditions.some((c) =>
      evaluateCondition(c as Record<string, unknown>, data)
    );
  }

  // Field comparison
  if ("field" in cond && "operator" in cond && "value" in cond) {
    const fieldCond = cond as FieldCondition;
    const dataValue = data[fieldCond.field];

    switch (fieldCond.operator) {
      case "eq":
        return String(dataValue) === String(fieldCond.value);
      case "neq":
        return String(dataValue) !== String(fieldCond.value);
      case "gt":
        return Number(dataValue) > Number(fieldCond.value);
      case "lt":
        return Number(dataValue) < Number(fieldCond.value);
      case "contains":
        return String(dataValue)
          .toLowerCase()
          .includes(String(fieldCond.value).toLowerCase());
      default:
        return false;
    }
  }

  // Unknown condition type — default allow
  return true;
}

// ==================== GET NEXT NODES ====================

/**
 * Returns the outgoing target nodes from the given currentNodeId,
 * filtered by condition evaluation against vorgangData,
 * sorted ascending by priority (lowest priority number = first).
 */
export async function getNextNodes(
  flowId: string,
  currentNodeId: string,
  vorgangData: Record<string, unknown>
): Promise<Array<{ nodeId: string; priority: number }>> {
  const outgoingEdges = await db.query.deskFlowEdges.findMany({
    where: and(
      eq(deskFlowEdges.flowId, flowId),
      eq(deskFlowEdges.fromNodeId, currentNodeId)
    ),
    orderBy: (e, { asc }) => [asc(e.priority)],
  });

  const matchingEdges = outgoingEdges.filter((edge) =>
    evaluateCondition(edge.condition, vorgangData)
  );

  return matchingEdges.map((edge) => ({
    nodeId: edge.toNodeId,
    priority: edge.priority,
  }));
}

// ==================== ADVANCE VORGANG ====================

/**
 * Advances a Vorgang to the next flow node.
 * - Finds the current node from deskVorgaenge.currentFlowNodeId
 * - Evaluates outgoing edges against vorgang.customData
 * - Moves to the first matching target node
 * - Updates deskVorgangModules (exit current module, enter next)
 * - Logs to deskVorgangHistory
 * - If next node isEnd → sets globalStatus to "abgeschlossen"
 */
export async function advanceVorgang(
  vorgangId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  nextNodeId?: string;
  isEnd?: boolean;
}> {
  // 1. Load the vorgang
  const vorgang = await db.query.deskVorgaenge.findFirst({
    where: eq(deskVorgaenge.id, vorgangId),
  });

  if (!vorgang) {
    return { success: false, message: "Vorgang not found" };
  }

  if (!vorgang.flowId) {
    return { success: false, message: "Vorgang has no flow assigned" };
  }

  if (!vorgang.currentFlowNodeId) {
    // No current node — try to find start node
    const startNode = await db.query.deskFlowNodes.findFirst({
      where: and(
        eq(deskFlowNodes.flowId, vorgang.flowId),
        eq(deskFlowNodes.isStart, true)
      ),
    });

    if (!startNode) {
      return { success: false, message: "Flow has no start node" };
    }

    // Set to start node without advancing further
    await db
      .update(deskVorgaenge)
      .set({
        currentFlowNodeId: startNode.id,
        currentModuleId: startNode.moduleId,
        globalStatus: "aktiv",
        updatedAt: new Date(),
      })
      .where(eq(deskVorgaenge.id, vorgangId));

    // Create initial VorgangModule entry
    await db.insert(deskVorgangModules).values({
      vorgangId,
      moduleId: startNode.moduleId,
      isActive: true,
    });

    // Log history
    await db.insert(deskVorgangHistory).values({
      vorgangId,
      action: "flow_start",
      moduleId: startNode.moduleId,
      oldStatus: vorgang.globalStatus,
      newStatus: "aktiv",
      comment: "Flow gestartet",
      userId,
    });

    return {
      success: true,
      message: "Flow started at start node",
      nextNodeId: startNode.id,
      isEnd: startNode.isEnd,
    };
  }

  // 2. Load the current flow node
  const currentNode = await db.query.deskFlowNodes.findFirst({
    where: eq(deskFlowNodes.id, vorgang.currentFlowNodeId),
  });

  if (!currentNode) {
    return { success: false, message: "Current flow node not found" };
  }

  if (currentNode.isEnd) {
    return { success: false, message: "Vorgang is already at end node" };
  }

  // 3. Find next nodes
  const nextNodes = await getNextNodes(
    vorgang.flowId,
    vorgang.currentFlowNodeId,
    vorgang.customData ?? {}
  );

  if (nextNodes.length === 0) {
    return { success: false, message: "No matching outgoing transitions found" };
  }

  // 4. Take the highest-priority (lowest number) matching node
  const nextNodeRef = nextNodes[0];

  const nextNode = await db.query.deskFlowNodes.findFirst({
    where: eq(deskFlowNodes.id, nextNodeRef.nodeId),
  });

  if (!nextNode) {
    return { success: false, message: "Next node not found in DB" };
  }

  // 5. Exit current VorgangModule
  await db
    .update(deskVorgangModules)
    .set({ isActive: false, exitedAt: new Date() })
    .where(
      and(
        eq(deskVorgangModules.vorgangId, vorgangId),
        eq(deskVorgangModules.moduleId, currentNode.moduleId),
        eq(deskVorgangModules.isActive, true)
      )
    );

  // 6. Determine new global status
  const newGlobalStatus = nextNode.isEnd ? "abgeschlossen" : vorgang.globalStatus;

  // 7. Update Vorgang
  await db
    .update(deskVorgaenge)
    .set({
      currentFlowNodeId: nextNode.id,
      currentModuleId: nextNode.moduleId,
      globalStatus: newGlobalStatus,
      updatedAt: new Date(),
    })
    .where(eq(deskVorgaenge.id, vorgangId));

  // 8. Create new VorgangModule entry for next module (unless it's end)
  if (!nextNode.isEnd) {
    // Find default status for the new module (if any)
    const defaultStatus = await db.query.deskModuleStatuses.findFirst({
      where: and(
        eq(deskModuleStatuses.moduleId, nextNode.moduleId),
        eq(deskModuleStatuses.isDefault, true)
      ),
    });

    await db.insert(deskVorgangModules).values({
      vorgangId,
      moduleId: nextNode.moduleId,
      moduleStatusId: defaultStatus?.id ?? null,
      isActive: true,
    });
  }

  // 9. Log history
  await db.insert(deskVorgangHistory).values({
    vorgangId,
    action: nextNode.isEnd ? "flow_complete" : "flow_advance",
    moduleId: nextNode.moduleId,
    oldStatus: vorgang.globalStatus,
    newStatus: newGlobalStatus,
    comment: nextNode.isEnd
      ? "Prozess abgeschlossen"
      : `Weitergeleitet zu: ${nextNode.label ?? nextNode.moduleId}`,
    userId,
  });

  return {
    success: true,
    message: nextNode.isEnd
      ? "Vorgang completed — reached end node"
      : `Advanced to node ${nextNode.id}`,
    nextNodeId: nextNode.id,
    isEnd: nextNode.isEnd,
  };
}

// ==================== START FLOW FOR VORGANG ====================

/**
 * Assigns a flow to a Vorgang and places it at the start node.
 * Convenience wrapper around advanceVorgang for initial flow assignment.
 */
export async function startFlowForVorgang(
  vorgangId: string,
  flowId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  // Assign the flow
  await db
    .update(deskVorgaenge)
    .set({ flowId, currentFlowNodeId: null, updatedAt: new Date() })
    .where(eq(deskVorgaenge.id, vorgangId));

  // Advance to start
  const result = await advanceVorgang(vorgangId, userId);
  return result;
}
