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
  type ScoreContext,
} from "@/lib/atlas/score";
import type { FilingStatus } from "@/lib/sim/tax";
// reading sim state at action time — atlas scores depend on income + field +
// filing (partnerAge) + kidsWanted (for CTC in the take-home math).
import { useSimStore } from "@/store/sim";
import type { SimInputs } from "@/types";

interface AtlasState {
  /** what the user is currently tuning — never feeds the scores. */
  draftWeights: AtlasWeights;
  /** the committed weights the score table was built against. */
  weights: AtlasWeights;
  /** true when draftWeights differ from weights (RECOMPUTE glows). */
  isWeightsDirty: boolean;
  setDraftWeight: <K extends keyof AtlasWeights>(k: K, v: number) => void;
  /** copies draftWeights → weights and rebuilds scores against the
   *  currently-committed sim inputs. called by the page-level RECOMPUTE. */
  recompute: () => void;

  roster: CityRecord[];
  scores: CityScore[];
  activeCityId: string | null;
  addCity: (c: CityRecord) => void;
  removeCity: (id: string) => void;
  setActiveCity: (id: string | null) => void;
}

const DEFAULT_WEIGHTS: AtlasWeights = {
  schools: 4,
  safety: 3,
  greenSpace: 2,
  communitySize: 0,
  cost: 3,
  rentBurden: 3,
  childcareCost: 3,
  weather: 0,
  careerFit: 3,
  partnerCareer: 2,
};

const INITIAL_ROSTER: CityRecord[] = [NEW_YORK_NY, AUSTIN_TX];

function filingFor(inputs: SimInputs): FilingStatus {
  return inputs.partnerAge != null ? "married_jointly" : "single";
}

function contextFrom(inputs: SimInputs, weights: AtlasWeights): ScoreContext {
  return {
    weights,
    userIncome: inputs.householdIncome,
    partnerIncome: inputs.partnerIncome,
    userField: inputs.field,
    partnerField: inputs.partnerField,
    filing: filingFor(inputs),
    kidsWanted: inputs.kidsWanted,
  };
}

function recomputeScores(
  roster: CityRecord[],
  weights: AtlasWeights,
): CityScore[] {
  const sim = useSimStore.getState();
  const ctx = contextFrom(sim.inputs, weights);
  return roster.map((c) => scoreCity(c, ctx));
}

function weightsEqual(a: AtlasWeights, b: AtlasWeights): boolean {
  const keys = Object.keys(a) as (keyof AtlasWeights)[];
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export const useAtlasStore = create<AtlasState>((set) => ({
  draftWeights: DEFAULT_WEIGHTS,
  weights: DEFAULT_WEIGHTS,
  isWeightsDirty: false,

  setDraftWeight: (k, v) =>
    set((state) => {
      const draftWeights = { ...state.draftWeights, [k]: v };
      return {
        draftWeights,
        isWeightsDirty: !weightsEqual(draftWeights, state.weights),
      };
    }),

  recompute: () =>
    set((state) => ({
      weights: state.draftWeights,
      scores: recomputeScores(state.roster, state.draftWeights),
      isWeightsDirty: false,
    })),

  roster: INITIAL_ROSTER,
  scores: recomputeScores(INITIAL_ROSTER, DEFAULT_WEIGHTS),
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
        scores: recomputeScores(roster, state.weights),
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
        scores: recomputeScores(roster, state.weights),
      };
    }),

  setActiveCity: (id) => set({ activeCityId: id }),
}));

// committed sim → atlas sync. when /simulation RECOMPUTE commits new
// inputs (income / field / partnerField / partnerAge / partnerIncome /
// kidsWanted), rebuild atlas scores against the current roster +
// committed weights. zustand v5 vanilla subscribe gives (state, prev).
useSimStore.subscribe((state, prev) => {
  const a = state.inputs;
  const b = prev.inputs;
  if (
    a.householdIncome === b.householdIncome &&
    a.field === b.field &&
    a.partnerAge === b.partnerAge &&
    a.partnerIncome === b.partnerIncome &&
    a.partnerField === b.partnerField &&
    a.kidsWanted === b.kidsWanted
  ) {
    return;
  }
  const atlas = useAtlasStore.getState();
  useAtlasStore.setState({
    scores: atlas.roster.map((c) =>
      scoreCity(c, contextFrom(state.inputs, atlas.weights)),
    ),
  });
});
