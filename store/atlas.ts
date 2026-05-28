import { create } from "zustand";

import {
  AUSTIN_TX,
  NEW_YORK_NY,
  type CityRecord,
} from "@/lib/atlas/cities";
import {
  scoreCity,
  type AtlasWeights,
  type CityScore,
} from "@/lib/atlas/score";
// reading sim state at action time — atlas scores depend on income + career.
import { useSimStore } from "@/store/sim";

interface AtlasState {
  weights: AtlasWeights;
  setWeight: <K extends keyof AtlasWeights>(k: K, v: number) => void;
  roster: CityRecord[];
  scores: CityScore[];
  activeCityId: string | null;
  addCity: (c: CityRecord) => void;
  removeCity: (id: string) => void;
  setActiveCity: (id: string | null) => void;
}

const DEFAULT_WEIGHTS: AtlasWeights = {
  schools: 4,
  cost: 3,
  safety: 3,
  greenSpace: 2,
  careerFit: 3,
};

const INITIAL_ROSTER: CityRecord[] = [NEW_YORK_NY, AUSTIN_TX];

function recompute(
  roster: CityRecord[],
  weights: AtlasWeights,
): CityScore[] {
  const sim = useSimStore.getState();
  return roster.map((c) =>
    scoreCity(c, weights, sim.inputs.householdIncome, sim.inputs.field),
  );
}

export const useAtlasStore = create<AtlasState>((set) => ({
  weights: DEFAULT_WEIGHTS,
  setWeight: (k, v) =>
    set((state) => {
      const weights = { ...state.weights, [k]: v };
      return { weights, scores: recompute(state.roster, weights) };
    }),

  roster: INITIAL_ROSTER,
  scores: recompute(INITIAL_ROSTER, DEFAULT_WEIGHTS),
  activeCityId: "new-york-ny",

  addCity: (c) =>
    set((state) => {
      // idempotent on duplicate id — just activate the existing row.
      if (state.roster.some((r) => r.id === c.id)) {
        return { activeCityId: c.id };
      }
      const roster = [...state.roster, c];
      return {
        roster,
        scores: recompute(roster, state.weights),
        activeCityId: c.id,
      };
    }),

  removeCity: (id) =>
    set((state) => {
      const roster = state.roster.filter((r) => r.id !== id);
      const activeCityId =
        state.activeCityId === id
          ? (roster[0]?.id ?? null)
          : state.activeCityId;
      return {
        roster,
        activeCityId,
        scores: recompute(roster, state.weights),
      };
    }),

  setActiveCity: (id) => set({ activeCityId: id }),
}));

// live sim → atlas sync: any change to household income or field in the sim
// store rebuilds the atlas scores against the current roster + weights, so
// dragging an income slider on /simulation updates the atlas right-panel
// numbers without the user needing to touch an atlas control first.
// Zustand v5's vanilla subscribe supplies (state, prev); we diff manually
// instead of pulling in subscribeWithSelector middleware.
useSimStore.subscribe((state, prev) => {
  if (
    state.inputs.householdIncome === prev.inputs.householdIncome &&
    state.inputs.field === prev.inputs.field
  ) {
    return;
  }
  const atlas = useAtlasStore.getState();
  useAtlasStore.setState({
    scores: atlas.roster.map((c) =>
      scoreCity(
        c,
        atlas.weights,
        state.inputs.householdIncome,
        state.inputs.field,
      ),
    ),
  });
});
