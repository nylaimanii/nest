import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_INPUTS } from "@/lib/sim/defaults";
import { useSimStore } from "@/store/sim";
import type { Scenario, Section } from "@/types";

interface AppState {
  section: Section;
  setSection: (s: Section) => void;
  scenarios: Scenario[];
  activeScenarioId: string | null;
  setActiveScenario: (id: string | null) => void;
  /** captures the current useSimStore inputs into a new named scenario. */
  addScenario: (label?: string) => string;
  /** loads a scenario's saved inputs back into useSimStore. */
  applyScenario: (id: string) => void;
  renameScenario: (id: string, label: string) => void;
  removeScenario: (id: string) => void;
  /** stamp the seed scenario's createdAt with Date.now() on first client
   *  mount. the seed ships with createdAt=0 so SSR and hydration agree;
   *  the Sidebar's useEffect calls this so the user sees a real timestamp
   *  the moment the page is interactive, never the misleading "JAN 01". */
  stampSeedCreatedAt: () => void;
}

// sentinel — Sidebar calls stampSeedCreatedAt() on mount to replace it with
// a real Date.now(). using 0 means SSR and client hydration agree (both
// render "—" or blank) and the first effect tick swaps in the real time
// without a hydration mismatch warning. the previous hardcoded UTC
// timestamp showed up as "JAN 01 · 09:00" which read as broken state.
const SEED_CREATED_AT_SENTINEL = 0;

const SEED_SCENARIO: Scenario = {
  id: "default",
  label: "scenario 01",
  createdAt: SEED_CREATED_AT_SENTINEL,
  inputs: DEFAULT_INPUTS,
};

// persistence: localStorage under "nest.app.v1". scenarios are first-class
// user state — each row carries a full SimInputs snapshot taken at create
// time, so reloading the app surfaces the same comparable scenarios in the
// sidebar. transient state (current section) doesn't persist.
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      section: "simulation",
      setSection: (s) => set({ section: s }),

      scenarios: [SEED_SCENARIO],
      activeScenarioId: "default",
      setActiveScenario: (id) => set({ activeScenarioId: id }),

      addScenario: (label) => {
        const inputs = useSimStore.getState().inputs;
        const id = crypto.randomUUID();
        const n = get().scenarios.length + 1;
        const finalLabel = label ?? `scenario ${String(n).padStart(2, "0")}`;
        set((state) => ({
          scenarios: [
            ...state.scenarios,
            { id, label: finalLabel, createdAt: Date.now(), inputs },
          ],
        }));
        return id;
      },

      applyScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        if (!scenario) return;
        // atomic apply — sets draft + committed inputs together and
        // recomputes the snapshot in one go, so scenario load doesn't
        // leave a dirty draft.
        useSimStore.getState().applyInputs(scenario.inputs);
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

      stampSeedCreatedAt: () =>
        set((state) => {
          const seed = state.scenarios.find((sc) => sc.id === "default");
          if (!seed || seed.createdAt !== SEED_CREATED_AT_SENTINEL) return state;
          return {
            scenarios: state.scenarios.map((sc) =>
              sc.id === "default" ? { ...sc, createdAt: Date.now() } : sc,
            ),
          };
        }),
    }),
    {
      name: "nest.app.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        scenarios: state.scenarios,
        activeScenarioId: state.activeScenarioId,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const scenarios =
          Array.isArray(p.scenarios) && p.scenarios.length > 0
            ? (p.scenarios as Scenario[]).map((sc) => ({
                ...sc,
                // future-proof — if a persisted scenario was written by an
                // older app version, fill any missing SimInputs keys from
                // DEFAULT_INPUTS so model/score don't crash on undefined.
                inputs: { ...DEFAULT_INPUTS, ...sc.inputs },
              }))
            : current.scenarios;
        return {
          ...current,
          scenarios,
          activeScenarioId:
            p.activeScenarioId !== undefined
              ? p.activeScenarioId
              : current.activeScenarioId,
        };
      },
    },
  ),
);
