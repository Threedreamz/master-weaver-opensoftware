export type FlowOperation =
  | { type: "add_step"; label: string; stepType?: "step"; config?: Record<string, unknown>; insertAfterStepId?: string }
  | { type: "delete_step"; stepId: string }
  | { type: "update_step"; stepId: string; changes: { label?: string; config?: Record<string, unknown> } }
  | { type: "add_component"; stepId: string; component: { componentType: string; fieldKey: string; label?: string; required?: boolean; config?: Record<string, unknown> }; afterComponentId?: string }
  | { type: "update_component"; componentId: string; stepId: string; changes: { label?: string; fieldKey?: string; required?: boolean; config?: Record<string, unknown> } }
  | { type: "delete_component"; componentId: string; stepId: string }
  | { type: "add_edge"; sourceStepId: string; targetStepId: string; conditionType?: string; conditionFieldKey?: string; conditionValue?: string; priority?: number }
  | { type: "update_edge"; edgeId: string; changes: { conditionType?: string; conditionFieldKey?: string; conditionValue?: string; priority?: number } }
  | { type: "delete_edge"; edgeId: string }
  | { type: "update_settings"; changes: Record<string, unknown> };
