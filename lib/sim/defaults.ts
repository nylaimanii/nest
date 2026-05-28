import type { SimInputs } from "@/types";

export const DEFAULT_INPUTS: SimInputs = {
  userAge: 28,
  partnerAge: 30,
  householdIncome: 120000,
  city: "new york, ny",
  kidsWanted: 2,
  startAge: 32,
  careerTrack: "ascending",
};

export const RANGES = {
  userAge: { min: 22, max: 45, step: 1 },
  partnerAge: { min: 22, max: 45, step: 1 },
  householdIncome: { min: 40000, max: 400000, step: 5000 },
  kidsWanted: { min: 0, max: 4, step: 1 },
  startAge: { min: 24, max: 42, step: 1 },
} as const;
