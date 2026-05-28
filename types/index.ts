// shared domain types — imported by the store and downstream files.

import type { SimInputs } from "./sim";

export type Section = "simulation" | "atlas" | "questions" | "compare";

export type Scenario = {
  id: string;
  label: string;
  createdAt: number;
  /** snapshot of useSimStore.inputs at the time the scenario was saved. */
  inputs: SimInputs;
};

// simulation contract — defined in types/sim.ts, re-exported here so
// downstream code imports a single canonical surface (`@/types`).
export type { SimInputs, SimSnapshot } from "./sim";
