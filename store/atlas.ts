import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

/** transient banner state set when the geocoder fails on a typed city.
 *  the sim's city is reverted to the previous valid value; the banner
 *  surfaces what was typed + what we kept. auto-dismissed by the
 *  CityResolveBanner consumer after 4s. */
export interface CityResolveError {
  typed: string;
  revertedTo: string | null;
}

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

  cityResolveError: CityResolveError | null;
  clearCityResolveError: () => void;
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

async function kickoffResolveTarget(
  city: string,
  inputs: SimInputs,
  prevCity?: string,
) {
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
    // geocoder gave up — revert the sim's city to the previous valid one
    // so the math doesn't run against unresolved garbage ("lorem ipsum"
    // labeled as international was the QA case). banner surfaces the
    // revert so the user knows what changed.
    const prevRecord =
      prevCity && prevCity !== city ? findCityByName(prevCity) : null;
    if (prevRecord && prevCity) {
      const revertedInputs: SimInputs = { ...inputs, city: prevCity };
      const alternates = computeAlternates(
        prevRecord,
        useAtlasStore.getState().weights,
        revertedInputs,
      );
      useAtlasStore.setState({
        target: prevRecord,
        isResolvingTarget: false,
        alternates,
        selectedAlternateId: null,
        cityResolveError: { typed: city, revertedTo: prevCity },
      });
      // revert the sim store last — its subscribe will re-enter this
      // function with prevCity, but seq has been bumped so the stale 404
      // result can't race, and the re-entry's setState merges partials
      // so cityResolveError survives.
      useSimStore.getState().applyInputs({ city: prevCity });
      return;
    }
    useAtlasStore.setState({
      target: null,
      isResolvingTarget: false,
      alternates: [],
      selectedAlternateId: null,
      cityResolveError: { typed: city, revertedTo: null },
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
// pull the seed city from the sim store at module load. when sim is
// persisted, this is the user's last city; on first visit it's
// DEFAULT_INPUTS.city. findCityByName resolves dataset hits synchronously
// — global / partial cities resolve via the post-creation kickoff below.

const INITIAL_INPUTS = useSimStore.getState().inputs;
const INITIAL_TARGET = findCityByName(INITIAL_INPUTS.city);
const INITIAL_ALTERNATES = computeAlternates(
  INITIAL_TARGET,
  DEFAULT_WEIGHTS,
  INITIAL_INPUTS,
);

// persistence: localStorage under "nest.atlas.v1". only the weight slider
// state is stored — the target city + alternates are derived from the sim
// store's inputs (which has its own persist) and re-resolve on rehydrate
// via the sim → atlas subscribe below. CityRecord includes a non-
// serializable closure (takeHomeAfterChildcarePct) so we deliberately
// can't persist the target directly anyway.
export const useAtlasStore = create<AtlasState>()(
  persist(
    (set) => ({
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
            selectedAlternateId: stillSelected
              ? state.selectedAlternateId
              : null,
            isWeightsDirty: false,
          };
        }),

      target: INITIAL_TARGET,
      isResolvingTarget: false,
      alternates: INITIAL_ALTERNATES,
      selectedAlternateId: null,

      setSelectedAlternateId: (id) => set({ selectedAlternateId: id }),

      cityResolveError: null,
      clearCityResolveError: () => set({ cityResolveError: null }),
    }),
    {
      name: "nest.atlas.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        weights: state.weights,
        draftWeights: state.draftWeights,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AtlasState>;
        const weights: AtlasWeights = {
          ...current.weights,
          ...(p.weights ?? {}),
        };
        const draftWeights: AtlasWeights = {
          ...current.draftWeights,
          ...(p.draftWeights ?? {}),
        };
        // recompute alternates against the (already-rehydrated) sim inputs
        // and the persisted weights so the right panel is consistent the
        // moment the page becomes interactive.
        const sim = useSimStore.getState();
        const alternates = computeAlternates(
          current.target,
          weights,
          sim.inputs,
        );
        return {
          ...current,
          weights,
          draftWeights,
          alternates,
          isWeightsDirty: !weightsEqual(weights, draftWeights),
        };
      },
    },
  ),
);

// post-creation: if sim has a persisted city that the dataset doesn't
// cover (e.g. "tokyo, japan"), INITIAL_TARGET is null — kick off the
// async cityProfile resolver so the atlas catches up. fired once at
// module load on the client; the sim → atlas subscribe handles every
// subsequent city change.
if (typeof window !== "undefined" && !INITIAL_TARGET && INITIAL_INPUTS.city) {
  void kickoffResolveTarget(INITIAL_INPUTS.city, INITIAL_INPUTS);
}

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
    // sequence guard + the banner-on-failure revert. errors are swallowed
    // inside fetchCityProfile.
    void kickoffResolveTarget(a.city, a, b.city);
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
