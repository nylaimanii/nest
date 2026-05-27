import { create } from "zustand";

import type { Scenario, Section } from "@/types";

interface AppState {
  section: Section;
  setSection: (s: Section) => void;
  scenarios: Scenario[];
  activeScenarioId: string | null;
  setActiveScenario: (id: string | null) => void;
  addScenario: (label?: string) => string; // returns new id
  renameScenario: (id: string, label: string) => void;
  removeScenario: (id: string) => void;
}

// deterministic seed timestamp so server and client render the same value
// (Date.now() at module init would differ across SSR/hydration). new
// scenarios use the real Date.now() since they're created client-side.
const SEED_CREATED_AT = Date.UTC(2025, 0, 1, 9, 0, 0);

export const useAppStore = create<AppState>((set, get) => ({
  section: "simulation",
  setSection: (s) => set({ section: s }),

  scenarios: [{ id: "default", label: "scenario 01", createdAt: SEED_CREATED_AT }],
  activeScenarioId: "default",
  setActiveScenario: (id) => set({ activeScenarioId: id }),

  addScenario: (label) => {
    const id = crypto.randomUUID();
    const n = get().scenarios.length + 1;
    const finalLabel = label ?? `scenario ${String(n).padStart(2, "0")}`;
    set((state) => ({
      scenarios: [
        ...state.scenarios,
        { id, label: finalLabel, createdAt: Date.now() },
      ],
    }));
    return id;
  },

  renameScenario: (id, label) =>
    set((state) => ({
      scenarios: state.scenarios.map((sc) =>
        sc.id === id ? { ...sc, label } : sc,
      ),
    })),

  removeScenario: (id) =>
    set((state) => ({
      scenarios: state.scenarios.filter((sc) => sc.id !== id),
    })),
}));
