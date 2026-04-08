import { create } from "zustand";
import type { Pipeline, Stufe, Karte } from "@opensoftware/db/openpipeline";

interface KanbanState {
  pipelines: Pipeline[];
  aktivePipelineId: string | null;
  stufen: Stufe[];
  karten: Karte[];
  breadcrumb: { id: string; name: string }[];
  loading: boolean;

  setPipelines: (pipelines: Pipeline[]) => void;
  setAktivePipeline: (id: string | null) => void;
  setStufen: (stufen: Stufe[]) => void;
  setKarten: (karten: Karte[]) => void;
  setBreadcrumb: (breadcrumb: { id: string; name: string }[]) => void;
  setLoading: (loading: boolean) => void;
  moveKarte: (karteId: string, neueStufeId: string, neuePosition: number) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  pipelines: [],
  aktivePipelineId: null,
  stufen: [],
  karten: [],
  breadcrumb: [],
  loading: false,

  setPipelines: (pipelines) => set({ pipelines }),
  setAktivePipeline: (id) => set({ aktivePipelineId: id }),
  setStufen: (stufen) => set({ stufen }),
  setKarten: (karten) => set({ karten }),
  setBreadcrumb: (breadcrumb) => set({ breadcrumb }),
  setLoading: (loading) => set({ loading }),
  moveKarte: (karteId, neueStufeId, neuePosition) =>
    set((state) => ({
      karten: state.karten.map((k) =>
        k.id === karteId
          ? { ...k, stufeId: neueStufeId, position: neuePosition }
          : k
      ),
    })),
}));
