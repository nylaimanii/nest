import { create } from "zustand";

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
  inputs: SimInputs;
  /** the "wanted" path — what the user inputs maps directly to. */
  snapshot: SimSnapshot;
  /** the "drift" path — what happens without active planning. */
  driftSnapshot: SimSnapshot;
  /** numbers the RegretGap reveal is built from. */
  gap: GapSummary;

  setInput: <K extends keyof SimInputs>(k: K, v: SimInputs[K]) => void;
  reset: () => void;

  /** 0 = resting, 1 = gap, 2 = frictions, 3 = navigable path. */
  revealStage: RevealStage;
  setRevealStage: (s: RevealStage) => void;
}

// every input change recomputes both snapshots + the gap summary in one set,
// so subscribers see one consistent update tick.
export const useSimStore = create<SimState>((set) => ({
  inputs: DEFAULT_INPUTS,
  snapshot: runSim(DEFAULT_INPUTS),
  driftSnapshot: runDrift(DEFAULT_INPUTS),
  gap: gapSummary(DEFAULT_INPUTS),

  setInput: (k, v) =>
    set((state) => {
      const inputs = { ...state.inputs, [k]: v };
      return {
        inputs,
        snapshot: runSim(inputs),
        driftSnapshot: runDrift(inputs),
        gap: gapSummary(inputs),
      };
    }),

  reset: () =>
    set({
      inputs: DEFAULT_INPUTS,
      snapshot: runSim(DEFAULT_INPUTS),
      driftSnapshot: runDrift(DEFAULT_INPUTS),
      gap: gapSummary(DEFAULT_INPUTS),
      revealStage: 0,
    }),

  // open the simulation on the gap split, not on a click-to-reveal teaser.
  // stage 0 is reachable via the stage-3 "start over" action as a reset.
  revealStage: 1,
  setRevealStage: (s) => set({ revealStage: s }),
}));
