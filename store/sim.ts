import { create } from "zustand";

import { DEFAULT_INPUTS } from "@/lib/sim/defaults";
import { runSim } from "@/lib/sim/model";
import type { SimInputs, SimSnapshot } from "@/types";

interface SimState {
  inputs: SimInputs;
  snapshot: SimSnapshot;
  setInput: <K extends keyof SimInputs>(k: K, v: SimInputs[K]) => void;
  reset: () => void;
}

// runSim is cheap (10 iterations); recompute synchronously on every input
// change so the right-hand readouts and the input stay in lockstep.
export const useSimStore = create<SimState>((set) => ({
  inputs: DEFAULT_INPUTS,
  snapshot: runSim(DEFAULT_INPUTS),
  setInput: (k, v) =>
    set((state) => {
      const inputs = { ...state.inputs, [k]: v };
      return { inputs, snapshot: runSim(inputs) };
    }),
  reset: () =>
    set({ inputs: DEFAULT_INPUTS, snapshot: runSim(DEFAULT_INPUTS) }),
}));
