// shared domain types — imported by the store and downstream files.

export type Section = "simulation" | "atlas" | "questions" | "compare";

export type Scenario = {
  id: string;
  label: string;
  createdAt: number;
};

// simulation contract — defined in types/sim.ts, re-exported here so
// downstream code imports a single canonical surface (`@/types`).
export type { SimInputs, SimSnapshot } from "./sim";
