import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_INPUTS } from "@/lib/sim/defaults";
import {
  gapSummary,
  runDrift,
  type GapSummary,
} from "@/lib/sim/drift";
import { runSim } from "@/lib/sim/model";
import type { SimInputs, SimSnapshot } from "@/types";

export type RevealStage = 0 | 1 | 2 | 3;

interface SimState {
  /** what the user is currently typing — never feeds the math directly. */
  draftInputs: SimInputs;
  /** the committed inputs the snapshot was computed against. */
  inputs: SimInputs;
  /** the "wanted" path — computed from `inputs`, not draftInputs. */
  snapshot: SimSnapshot;
  /** the "drift" path — what happens without active planning. */
  driftSnapshot: SimSnapshot;
  /** numbers the RegretGap reveal is built from. */
  gap: GapSummary;
  /** true when draftInputs differ from inputs (button glows). */
  isDirty: boolean;

  /** updates draftInputs only; never recomputes the math. */
  setDraftInput: <K extends keyof SimInputs>(k: K, v: SimInputs[K]) => void;
  /** copies draftInputs → inputs and recomputes the snapshot/drift/gap. */
  recompute: () => void;
  /** atomically merges into BOTH draft + committed inputs and recomputes —
   *  used for scenario load, /questions suggestions, onboarding, reset.
   *  bypasses the draft/commit flow so downstream consumers see the new
   *  state at once. accepts Partial so callers that only have some keys
   *  (onboarding form) don't have to spread the current inputs themselves. */
  applyInputs: (inputs: Partial<SimInputs>) => void;
  reset: () => void;

  /** 0 = resting, 1 = gap, 2 = frictions, 3 = navigable path. */
  revealStage: RevealStage;
  setRevealStage: (s: RevealStage) => void;
}

function inputsEqual(a: SimInputs, b: SimInputs): boolean {
  const keys = Object.keys(a) as (keyof SimInputs)[];
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

// the math now runs ONLY when the user explicitly hits RECOMPUTE (or on
// scenario load / suggestion apply / reset, which use applyInputs). every
// typed keystroke updates draftInputs in place and flips isDirty; the
// snapshot stays frozen on the previously-committed inputs so charts +
// honest panel never flicker mid-edit.
//
// persistence: localStorage under "nest.sim.v1". only inputs + draftInputs
// are stored — snapshot/drift/gap are derived and regenerate via the merge
// callback on rehydrate, so navigating away and back (or refreshing) keeps
// edits intact without paying to serialize 10-year arrays.
export const useSimStore = create<SimState>()(
  persist(
    (set) => ({
      draftInputs: DEFAULT_INPUTS,
      inputs: DEFAULT_INPUTS,
      snapshot: runSim(DEFAULT_INPUTS),
      driftSnapshot: runDrift(DEFAULT_INPUTS),
      gap: gapSummary(DEFAULT_INPUTS),
      isDirty: false,

      setDraftInput: (k, v) =>
        set((state) => {
          const draftInputs = { ...state.draftInputs, [k]: v };
          return {
            draftInputs,
            isDirty: !inputsEqual(draftInputs, state.inputs),
          };
        }),

      recompute: () =>
        set((state) => ({
          inputs: state.draftInputs,
          snapshot: runSim(state.draftInputs),
          driftSnapshot: runDrift(state.draftInputs),
          gap: gapSummary(state.draftInputs),
          isDirty: false,
        })),

      applyInputs: (next) =>
        set((state) => {
          const merged: SimInputs = { ...state.inputs, ...next };
          return {
            draftInputs: merged,
            inputs: merged,
            snapshot: runSim(merged),
            driftSnapshot: runDrift(merged),
            gap: gapSummary(merged),
            isDirty: false,
          };
        }),

      reset: () =>
        set({
          draftInputs: DEFAULT_INPUTS,
          inputs: DEFAULT_INPUTS,
          snapshot: runSim(DEFAULT_INPUTS),
          driftSnapshot: runDrift(DEFAULT_INPUTS),
          gap: gapSummary(DEFAULT_INPUTS),
          isDirty: false,
          revealStage: 0,
        }),

      // open the simulation on the gap split, not on a click-to-reveal teaser.
      // stage 0 is reachable via the stage-3 "start over" action as a reset.
      revealStage: 1,
      setRevealStage: (s) => set({ revealStage: s }),
    }),
    {
      name: "nest.sim.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        inputs: state.inputs,
        draftInputs: state.draftInputs,
      }),
      // merge persisted partial onto the current initial state. each input
      // object is spread over DEFAULT_INPUTS so new fields added in future
      // versions (added a partner field, etc) default cleanly when the
      // persisted blob is older. derived state (snapshot/drift/gap) is
      // recomputed from the merged inputs so we don't have to serialize
      // 10-year arrays.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SimState>;
        const inputs: SimInputs = { ...current.inputs, ...(p.inputs ?? {}) };
        const draftInputs: SimInputs = {
          ...current.draftInputs,
          ...(p.draftInputs ?? {}),
        };
        return {
          ...current,
          inputs,
          draftInputs,
          snapshot: runSim(inputs),
          driftSnapshot: runDrift(inputs),
          gap: gapSummary(inputs),
          isDirty: !inputsEqual(draftInputs, inputs),
        };
      },
    },
  ),
);
