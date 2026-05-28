// runs the existing sim engine for two scenarios in parallel — no new math,
// just pairs the snapshot + gap summary for each side.

import type { SimInputs, SimSnapshot } from "@/types";
import { gapSummary, type GapSummary } from "./drift";
import { runSim } from "./model";

export interface SideData {
  inputs: SimInputs;
  snapshot: SimSnapshot;
  gap: GapSummary;
}

export interface ScenarioPair {
  a: SideData;
  b: SideData;
}

export function compareSnapshots(
  aInputs: SimInputs,
  bInputs: SimInputs,
): ScenarioPair {
  return {
    a: { inputs: aInputs, snapshot: runSim(aInputs), gap: gapSummary(aInputs) },
    b: { inputs: bInputs, snapshot: runSim(bInputs), gap: gapSummary(bInputs) },
  };
}
