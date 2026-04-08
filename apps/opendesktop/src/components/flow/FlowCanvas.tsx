"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Panel,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Trash2, Save } from "lucide-react";
import { ModuleNode } from "./ModuleNode";
import {
  addFlowNode,
  addFlowEdge,
  deleteFlowNode,
  deleteFlowEdge,
  updateFlowNode,
  updateFlowEdge,
  saveFlowLayout,
} from "@/app/[locale]/admin/flows/actions";

const nodeTypes: NodeTypes = {
  moduleNode: ModuleNode,
};

interface FlowCanvasProps {
  flowId: string;
  locale: string;
  initialNodes: Array<{
    id: string;
    moduleId: string;
    moduleName: string;
    moduleColor: string | null;
    moduleIcon: string | null;
    label: string | null;
    positionX: number;
    positionY: number;
    isStart: boolean;
    isEnd: boolean;
  }>;
  initialEdges: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    label: string | null;
    condition: Record<string, unknown> | null;
    priority: number;
  }>;
  availableModules: Array<{
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  }>;
}

export function FlowCanvas({
  flowId,
  locale,
  initialNodes,
  initialEdges,
  availableModules,
}: FlowCanvasProps) {
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState(
    availableModules[0]?.id ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [editingEdge, setEditingEdge] = useState<{
    id: string;
    label: string;
    conditionType: "always" | "field";
    field: string;
    operator: string;
    value: string;
  } | null>(null);

  const rfNodes: Node[] = useMemo(
    () =>
      initialNodes.map((n) => ({
        id: n.id,
        type: "moduleNode",
        position: { x: n.positionX, y: n.positionY },
        data: {
          label: n.label || n.moduleName,
          moduleName: n.moduleName,
          color: n.moduleColor || "#6366f1",
          icon: n.moduleIcon,
          isStart: n.isStart,
          isEnd: n.isEnd,
        },
      })),
    [initialNodes]
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      initialEdges.map((e) => ({
        id: e.id,
        source: e.fromNodeId,
        target: e.toNodeId,
        label: e.label || "",
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 2 },
      })),
    [initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      setEdges((eds) =>
        addEdge(
          { ...connection, animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
          eds
        )
      );
      const formData = new FormData();
      formData.set("flowId", flowId);
      formData.set("fromNodeId", connection.source);
      formData.set("toNodeId", connection.target);
      formData.set("locale", locale);
      await addFlowEdge(formData);
    },
    [flowId, locale, setEdges]
  );

  const handleNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      const formData = new FormData();
      formData.set("id", node.id);
      formData.set("positionX", String(Math.round(node.position.x)));
      formData.set("positionY", String(Math.round(node.position.y)));
      formData.set("flowId", flowId);
      formData.set("locale", locale);
      await updateFlowNode(formData);
    },
    [flowId, locale]
  );

  const handleAddModule = async () => {
    if (!selectedModuleId) return;
    setIsAddingNode(false);
    const formData = new FormData();
    formData.set("flowId", flowId);
    formData.set("moduleId", selectedModuleId);
    formData.set("positionX", String(Math.round(Math.random() * 400 + 100)));
    formData.set("positionY", String(Math.round(Math.random() * 300 + 100)));
    formData.set("locale", locale);
    await addFlowNode(formData);
  };

  const handleDeleteSelectedNode = useCallback(async () => {
    const selected = nodes.find((n) => n.selected);
    if (!selected) return;
    const formData = new FormData();
    formData.set("id", selected.id);
    formData.set("flowId", flowId);
    formData.set("locale", locale);
    setNodes((ns) => ns.filter((n) => n.id !== selected.id));
    await deleteFlowNode(formData);
  }, [nodes, flowId, locale, setNodes]);

  const handleDeleteSelectedEdge = useCallback(async () => {
    const selected = edges.find((e) => e.selected);
    if (!selected) return;
    const formData = new FormData();
    formData.set("id", selected.id);
    formData.set("flowId", flowId);
    formData.set("locale", locale);
    setEdges((es) => es.filter((e) => e.id !== selected.id));
    await deleteFlowEdge(formData);
  }, [edges, flowId, locale, setEdges]);

  const handleSaveLayout = useCallback(async () => {
    setIsSaving(true);
    const nodePositions = nodes.map((n) => ({
      id: n.id,
      positionX: Math.round(n.position.x),
      positionY: Math.round(n.position.y),
    }));
    const formData = new FormData();
    formData.set("nodes", JSON.stringify(nodePositions));
    formData.set("flowId", flowId);
    formData.set("locale", locale);
    await saveFlowLayout(formData);
    setIsSaving(false);
  }, [nodes, flowId, locale]);

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const original = initialEdges.find((e) => e.id === edge.id);
      const condition = original?.condition as Record<string, unknown> | null;
      let conditionType: "always" | "field" = "always";
      let field = "";
      let operator = "eq";
      let value = "";
      if (condition && condition.type !== "always" && condition.field) {
        conditionType = "field";
        field = (condition.field as string) || "";
        operator = (condition.operator as string) || "eq";
        value = String(condition.value ?? "");
      }
      setEditingEdge({
        id: edge.id,
        label: (edge.label as string) || "",
        conditionType,
        field,
        operator,
        value,
      });
    },
    [initialEdges]
  );

  const handleSaveEdgeCondition = useCallback(async () => {
    if (!editingEdge) return;
    const condition =
      editingEdge.conditionType === "always"
        ? { type: "always" }
        : {
            field: editingEdge.field,
            operator: editingEdge.operator,
            value: editingEdge.value,
          };
    const formData = new FormData();
    formData.set("id", editingEdge.id);
    formData.set("flowId", flowId);
    formData.set("label", editingEdge.label);
    formData.set("condition", JSON.stringify(condition));
    formData.set("locale", locale);
    await updateFlowEdge(formData);
    setEdges((es) =>
      es.map((e) =>
        e.id === editingEdge.id ? { ...e, label: editingEdge.label } : e
      )
    );
    setEditingEdge(null);
  }, [editingEdge, flowId, locale, setEdges]);

  const hasSelection = nodes.some((n) => n.selected) || edges.some((e) => e.selected);
  const selectedNode = nodes.find((n) => n.selected);
  const selectedEdge = edges.find((e) => e.selected);

  return (
    <div className="w-full h-[calc(100vh-280px)] min-h-[500px] rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls className="!border !border-gray-200 !rounded-lg !shadow-sm" />
        <MiniMap
          className="!border !border-gray-200 !rounded-lg !shadow-sm"
          nodeColor={(n) => {
            const color = (n.data as { color?: string }).color;
            return color || "#6366f1";
          }}
          maskColor="rgba(243,244,246,0.7)"
        />

        {/* Top-left control panel */}
        <Panel position="top-left" className="flex flex-col gap-2">
          {/* Add node panel */}
          {!isAddingNode ? (
            <button
              onClick={() => setIsAddingNode(true)}
              disabled={availableModules.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              Modul hinzufügen
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 shadow-sm p-2">
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 min-w-[160px]"
              >
                {availableModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddModule}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus size={12} />
                Hinzufügen
              </button>
              <button
                onClick={() => setIsAddingNode(false)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          )}

          {/* Delete selected */}
          {hasSelection && (
            <button
              onClick={selectedNode ? handleDeleteSelectedNode : handleDeleteSelectedEdge}
              className="inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors shadow-sm"
            >
              <Trash2 size={14} />
              {selectedNode ? "Knoten löschen" : "Verbindung löschen"}
            </button>
          )}
        </Panel>

        {/* Top-right save panel */}
        <Panel position="top-right">
          <button
            onClick={handleSaveLayout}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={14} className={isSaving ? "animate-pulse" : ""} />
            {isSaving ? "Speichern..." : "Layout speichern"}
          </button>
        </Panel>

        {/* Help text */}
        <Panel position="bottom-left">
          <div className="text-xs text-gray-400 bg-white/80 rounded-lg px-3 py-1.5 border border-gray-100">
            Verbinden: von Knoten-Ausgang zu Knoten-Eingang ziehen · Löschen: Auswählen + Entf
          </div>
        </Panel>

        {/* Edge condition editor */}
        {editingEdge && (
          <Panel position="top-right" className="!top-14">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 w-72 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Bedingung bearbeiten</h3>
                <button
                  onClick={() => setEditingEdge(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Label</label>
                <input
                  type="text"
                  value={editingEdge.label}
                  onChange={(e) =>
                    setEditingEdge((s) => s && { ...s, label: e.target.value })
                  }
                  placeholder="z.B. Genehmigt"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Bedingungstyp</label>
                <select
                  value={editingEdge.conditionType}
                  onChange={(e) =>
                    setEditingEdge((s) =>
                      s && { ...s, conditionType: e.target.value as "always" | "field" }
                    )
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="always">Immer (always)</option>
                  <option value="field">Feld-Bedingung</option>
                </select>
              </div>

              {editingEdge.conditionType === "field" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Feld</label>
                    <input
                      type="text"
                      value={editingEdge.field}
                      onChange={(e) =>
                        setEditingEdge((s) => s && { ...s, field: e.target.value })
                      }
                      placeholder="z.B. priority"
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Operator</label>
                    <select
                      value={editingEdge.operator}
                      onChange={(e) =>
                        setEditingEdge((s) => s && { ...s, operator: e.target.value })
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="eq">gleich (eq)</option>
                      <option value="neq">ungleich (neq)</option>
                      <option value="gt">größer als (gt)</option>
                      <option value="lt">kleiner als (lt)</option>
                      <option value="contains">enthält (contains)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Wert</label>
                    <input
                      type="text"
                      value={editingEdge.value}
                      onChange={(e) =>
                        setEditingEdge((s) => s && { ...s, value: e.target.value })
                      }
                      placeholder="z.B. high"
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveEdgeCondition}
                  className="flex-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setEditingEdge(null)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
