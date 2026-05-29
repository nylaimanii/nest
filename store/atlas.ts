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
import type { FilingStatus } from "@/lib/sim/tax";
// reading sim state at action time — atlas scores depend on income + field +
// filing (partnerAge) + kidsWanted (for CTC in the take-home math).
import { useSimStore } from "@/store/sim";
import type { SimInputs } from "@/types";

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

function filingFor(inputs: SimInputs): FilingStatus {
  return inputs.partnerAge != null ? "married_jointly" : "single";
}

function recompute(
  roster: CityRecord[],
  weights: AtlasWeights,
): CityScore[] {
  const sim = useSimStore.getState();
  return roster.map((c) =>
    scoreCity(
      c,
      weights,
      sim.inputs.householdIncome,
      sim.inputs.field,
      filingFor(sim.inputs),
      sim.inputs.kidsWanted,
    ),
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

// live sim → atlas sync: changes to income / field / partnerAge / kidsWanted
// in the sim store rebuild atlas scores against the current roster + weights,
// so dragging any of those on /simulation updates the atlas right-panel
// numbers (income, filing status, and CTC eligibility all feed take-home in
// scoreCity's worstPhrase). zustand v5 vanilla subscribe gives (state, prev);
// we diff manually instead of pulling in subscribeWithSelector middleware.
useSimStore.subscribe((state, prev) => {
  if (
    state.inputs.householdIncome === prev.inputs.householdIncome &&
    state.inputs.field === prev.inputs.field &&
    state.inputs.partnerAge === prev.inputs.partnerAge &&
    state.inputs.kidsWanted === prev.inputs.kidsWanted
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
        filingFor(state.inputs),
        state.inputs.kidsWanted,
      ),
    ),
  });
});
