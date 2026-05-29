import { create } from "zustand";

import {
  CITIES,
  findCityByName,
  makePartialCity,
  type CityRecord,
} from "@/lib/atlas/cities";
import { findAlternates } from "@/lib/atlas/alternates";
import { geocodeCity } from "@/lib/atlas/geocode";
import {
  scoreCity,
  type AtlasWeights,
  type CityScore,
  type ScoreContext,
} from "@/lib/atlas/score";
import type { FilingStatus } from "@/lib/sim/tax";
// atlas alternates depend on the committed sim inputs (income, field,
// partnerField, partnerAge, partnerIncome, kidsWanted) — same context the
// score engine takes.
import { useSimStore } from "@/store/sim";
import type { SimInputs } from "@/types";

interface AtlasState {
  /** committed weights — what alternates/scores are computed against. */
  weights: AtlasWeights;
  /** what the sidebar UI is currently tuning — never feeds scores. */
  draftWeights: AtlasWeights;
  isWeightsDirty: boolean;
  setDraftWeight: <K extends keyof AtlasWeights>(k: K, v: number) => void;
  /** commits draftWeights, recomputes alternates against current target +
   *  sim inputs. clears selectedAlternateId if the selected isn't in the
   *  new list. */
  recompute: () => void;

  /** the city the user pinned as their target via /simulation. resolves
   *  from sim.inputs.city via findCityByName first, then /api/geocode for
   *  partial-data records. null only if both fail. */
  target: CityRecord | null;

  /** computed alternates from the 20-city pool — ranked highest first. */
  alternates: CityRecord[];

  /** which alternate the user is currently viewing in the right panel
   *  (null = viewing target). */
  selectedAlternateId: string | null;
  setSelectedAlternateId: (id: string | null) => void;
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

function filingFor(inputs: SimInputs): FilingStatus {
  return inputs.partnerAge != null ? "married_jointly" : "single";
}

export function contextFrom(
  inputs: SimInputs,
  weights: AtlasWeights,
): ScoreContext {
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

/** target.id-aware score lookup — used by sidebar + right panel to pull
 *  the target's CityScore without re-scoring redundantly. */
export function scoreFor(
  city: CityRecord,
  inputs: SimInputs,
  weights: AtlasWeights,
): CityScore {
  return scoreCity(city, contextFrom(inputs, weights));
}

function weightsEqual(a: AtlasWeights, b: AtlasWeights): boolean {
  const keys = Object.keys(a) as (keyof AtlasWeights)[];
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

// resolve sim.inputs.city → CityRecord. local dataset hit wins; otherwise
// hit /api/geocode for a partial-data record so the map still pins
// SOMEWHERE for "tokyo, japan"-style international targets.
async function resolveTarget(cityQuery: string): Promise<CityRecord | null> {
  const local = findCityByName(cityQuery);
  if (local) return local;
  const geo = await geocodeCity(cityQuery);
  if (!geo) return null;
  return makePartialCity(geo.name, geo.lat, geo.lng);
}

function computeAlternates(
  target: CityRecord | null,
  weights: AtlasWeights,
  inputs: SimInputs,
): CityRecord[] {
  if (!target) return [];
  return findAlternates(target, CITIES, contextFrom(inputs, weights));
}

// ---- initial state ---------------------------------------------------------
// for the seed render we synchronously resolve "new york, ny" via the local
// dataset (guaranteed hit) and compute alternates immediately. async path
// only fires when the user later picks a non-dataset city on /simulation.

const INITIAL_TARGET = findCityByName("new york, ny");
const INITIAL_INPUTS = useSimStore.getState().inputs;
const INITIAL_ALTERNATES = computeAlternates(
  INITIAL_TARGET,
  DEFAULT_WEIGHTS,
  INITIAL_INPUTS,
);

export const useAtlasStore = create<AtlasState>((set) => ({
  weights: DEFAULT_WEIGHTS,
  draftWeights: DEFAULT_WEIGHTS,
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
    set((state) => {
      const inputs = useSimStore.getState().inputs;
      const alternates = computeAlternates(
        state.target,
        state.draftWeights,
        inputs,
      );
      const stillSelected =
        state.selectedAlternateId !== null &&
        alternates.some((a) => a.id === state.selectedAlternateId);
      return {
        weights: state.draftWeights,
        alternates,
        selectedAlternateId: stillSelected ? state.selectedAlternateId : null,
        isWeightsDirty: false,
      };
    }),

  target: INITIAL_TARGET,
  alternates: INITIAL_ALTERNATES,
  selectedAlternateId: null,

  setSelectedAlternateId: (id) => set({ selectedAlternateId: id }),
}));

// ---- sim → atlas sync ------------------------------------------------------
// when COMMITTED sim inputs change (post-RECOMPUTE), either:
//   1. inputs.city changed → resolve a new target (async if non-dataset),
//      then recompute alternates against the new target + current weights
//   2. only context fields changed (income/field/partner/etc) → keep the
//      same target, just recompute alternates
// the subscribe is sync; the async geocode path uses fire-and-forget +
// setState when it returns.

useSimStore.subscribe((state, prev) => {
  const a = state.inputs;
  const b = prev.inputs;
  const cityChanged = a.city !== b.city;
  const ctxChanged =
    a.householdIncome !== b.householdIncome ||
    a.partnerIncome !== b.partnerIncome ||
    a.field !== b.field ||
    a.partnerField !== b.partnerField ||
    a.partnerAge !== b.partnerAge ||
    a.kidsWanted !== b.kidsWanted;

  if (!cityChanged && !ctxChanged) return;

  if (cityChanged) {
    resolveTarget(a.city)
      .then((target) => {
        const atlas = useAtlasStore.getState();
        const alternates = computeAlternates(target, atlas.weights, a);
        const stillSelected =
          atlas.selectedAlternateId !== null &&
          alternates.some((alt) => alt.id === atlas.selectedAlternateId);
        useAtlasStore.setState({
          target,
          alternates,
          selectedAlternateId: stillSelected ? atlas.selectedAlternateId : null,
        });
      })
      .catch(() => {
        // resolveTarget already swallows geocode errors and returns null;
        // this catch is just belt-and-suspenders so a thrown error from
        // findAlternates/setState can't poison the subscribe.
      });
    return;
  }

  const atlas = useAtlasStore.getState();
  const alternates = computeAlternates(atlas.target, atlas.weights, a);
  const stillSelected =
    atlas.selectedAlternateId !== null &&
    alternates.some((alt) => alt.id === atlas.selectedAlternateId);
  useAtlasStore.setState({
    alternates,
    selectedAlternateId: stillSelected ? atlas.selectedAlternateId : null,
  });
});
