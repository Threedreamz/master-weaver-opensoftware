import { create } from "zustand";
import type { FlowDefinition } from "@opensoftware/openflow-core";

export interface RendererState {
  flowDefinition: FlowDefinition | null;
  currentStepId: string | null;
  answers: Record<string, unknown>;
  navigationHistory: string[];
  errors: Record<string, string>;
  phoneValidity: Record<string, boolean>;
  submissionId: string | null;
  isSubmitting: boolean;
  isCompleted: boolean;

  initFlow: (flow: FlowDefinition) => void;
  setAnswer: (fieldKey: string, value: unknown) => void;
  setPhoneValid: (fieldKey: string, valid: boolean) => void;
  goToStep: (stepId: string) => void;
  goBack: () => void;
  setError: (fieldKey: string, message: string) => void;
  clearErrors: () => void;
  setSubmitting: (val: boolean) => void;
  setCompleted: () => void;
  setSubmissionId: (id: string) => void;
}

export const useRendererStore = create<RendererState>((set, get) => ({
  flowDefinition: null,
  currentStepId: null,
  answers: {},
  navigationHistory: [],
  errors: {},
  phoneValidity: {},
  submissionId: null,
  isSubmitting: false,
  isCompleted: false,

  initFlow: (flow) => {
    // Resolve the first displayable step: skip "start"/"end" placeholder steps
    let startId = flow.startStepId;
    const startStep = flow.steps.find((s) => s.id === startId);
    if (!startId || startStep?.type === "start" || startStep?.type === "end") {
      const firstReal = flow.steps.find((s) => s.type !== "start" && s.type !== "end");
      startId = firstReal?.id ?? startId;
    }
    set({
      flowDefinition: flow,
      currentStepId: startId,
      answers: {},
      navigationHistory: startId ? [startId] : [],
      errors: {},
      phoneValidity: {},
      submissionId: null,
      isSubmitting: false,
      isCompleted: false,
    });
  },

  setAnswer: (fieldKey, value) =>
    set((s) => ({ answers: { ...s.answers, [fieldKey]: value } })),

  setPhoneValid: (fieldKey, valid) =>
    set((s) => ({ phoneValidity: { ...s.phoneValidity, [fieldKey]: valid } })),

  goToStep: (stepId) =>
    set((s) => ({
      currentStepId: stepId,
      navigationHistory: [...s.navigationHistory, stepId],
      errors: {},
    })),

  goBack: () =>
    set((s) => {
      const history = [...s.navigationHistory];
      history.pop(); // remove current
      const prevStep = history[history.length - 1] ?? s.currentStepId;
      return { currentStepId: prevStep, navigationHistory: history, errors: {} };
    }),

  setError: (fieldKey, message) =>
    set((s) => ({ errors: { ...s.errors, [fieldKey]: message } })),

  clearErrors: () => set({ errors: {} }),
  setSubmitting: (val) => set({ isSubmitting: val }),
  setCompleted: () => set({ isCompleted: true }),
  setSubmissionId: (id) => set({ submissionId: id }),
}));
