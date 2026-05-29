import { create } from "zustand";

import {
  CITIES,
  findCityByName,
  type CityRecord,
} from "@/lib/atlas/cities";
import { findAlternates } from "@/lib/atlas/alternates";
import {
  cityRecordFromProfile,
  type CityProfile,
} from "@/lib/atlas/cityProfile";
import {
  scoreCity,
  type AtlasWeights,
  type CityScore,
  type ScoreContext,
} from "@/lib/atlas/score";
import type { FilingStatus } from "@/lib/sim/tax";
import { useSimStore } from "@/store/sim";
import type { SimInputs } from "@/types";

interface AtlasState {
  weights: AtlasWeights;
  draftWeights: AtlasWeights;
  isWeightsDirty: boolean;
  setDraftWeight: <K extends keyof AtlasWeights>(k: K, v: number) => void;
  recompute: () => void;

  target: CityRecord | null;
  /** true while the cityProfile fetch is in flight. previous target stays
   *  visible so the sidebar shows a graceful "resolving …" rather than a
   *  blank flash. */
  isResolvingTarget: boolean;

  alternates: CityRecord[];

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

function computeAlternates(
  target: CityRecord | null,
  weights: AtlasWeights,
  inputs: SimInputs,
): CityRecord[] {
  if (!target) return [];
  return findAlternates(target, CITIES, contextFrom(inputs, weights));
}

// ---- target resolution ----------------------------------------------------
// races the user-supplied city against the local dataset first (synchronous,
// no network), then falls through to /api/cityProfile for global cities. a
// monotonic sequence guards against the slow-then-fast race where two
// recomputes land in different orders.

let resolveSeq = 0;

async function fetchCityProfile(q: string): Promise<CityProfile | null> {
  try {
    const res = await fetch(`/api/cityProfile?q=${encodeURIComponent(q)}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as CityProfile;
  } catch {
    return null;
  }
}

async function kickoffResolveTarget(city: string, inputs: SimInputs) {
  const seq = ++resolveSeq;

  const local = findCityByName(city);
  if (local) {
    if (seq !== resolveSeq) return;
    const atlas = useAtlasStore.getState();
    const alternates = computeAlternates(local, atlas.weights, inputs);
    useAtlasStore.setState({
      target: local,
      isResolvingTarget: false,
      alternates,
      selectedAlternateId: null,
    });
    return;
  }

  // mark the fetch in-flight so the sidebar can render its "resolving"
  // hint while keeping the previous target rendered underneath.
  useAtlasStore.setState({ isResolvingTarget: true });

  const profile = await fetchCityProfile(city);
  if (seq !== resolveSeq) return;

  if (!profile) {
    useAtlasStore.setState({
      target: null,
      isResolvingTarget: false,
      alternates: [],
      selectedAlternateId: null,
    });
    return;
  }

  const record = cityRecordFromProfile(profile);
  const atlas = useAtlasStore.getState();
  const alternates = computeAlternates(record, atlas.weights, inputs);
  useAtlasStore.setState({
    target: record,
    isResolvingTarget: false,
    alternates,
    selectedAlternateId: null,
  });
}

// ---- initial state --------------------------------------------------------

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
  isResolvingTarget: false,
  alternates: INITIAL_ALTERNATES,
  selectedAlternateId: null,

  setSelectedAlternateId: (id) => set({ selectedAlternateId: id }),
}));

// ---- sim → atlas sync -----------------------------------------------------

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
    // fire-and-forget; the kickoff function manages isResolvingTarget + the
    // sequence guard. errors are swallowed inside fetchCityProfile.
    void kickoffResolveTarget(a.city, a);
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
