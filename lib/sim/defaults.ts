import type { SimInputs } from "@/types";

// representative starting user: a couple in their early thirties planning to
// start trying in a few years for three kids. under the v1 drift model this
// opens the regret-gap reveal on a visible 1-kid gap so the story is the
// page's first impression, not "you're on track".
export const DEFAULT_INPUTS: SimInputs = {
  userAge: 31,
  partnerAge: 32,
  householdIncome: 120000,
  city: "new york, ny",
  kidsWanted: 3,
  startAge: 35,
  careerTrack: "ascending",
  field: "tech",
};

export const RANGES = {
  userAge: { min: 18, max: 55, step: 1 },
  partnerAge: { min: 18, max: 55, step: 1 },
  householdIncome: { min: 40000, max: 400000, step: 5000 },
  kidsWanted: { min: 0, max: 4, step: 1 },
  startAge: { min: 24, max: 42, step: 1 },
} as const;
