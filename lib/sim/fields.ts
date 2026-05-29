// Median annual wages from BLS OEWS May 2024 (publicly available,
// illustrative for v1). Growth from BLS Employment Projections 2023-2033.
// Volatility derived from BLS layoff/discharge rates by industry,
// normalized 0-1.
//
// determinism rule (CLAUDE.md): every number here is code, not LLM-generated.
// findOccupation() does fuzzy substring lookup on label; unknown inputs fall
// through to DEFAULT_OCCUPATION so the simulation never crashes on a free-
// string field. occupations carry a `category` matched against the atlas
// city.careerHubFor[] tags so career-fit scoring stays consistent.

export type OccupationCategory =
  | "tech"
  | "finance"
  | "healthcare"
  | "education"
  | "trades"
  | "creative"
  | "service"
  | "government"
  | "science"
  | "business";

export type Occupation = {
  /** slug, e.g. "software-developer". */
  id: string;
  /** display, e.g. "software developer" (lowercase, atlas tone). */
  label: string;
  category: OccupationCategory;
  /** USD annual. */
  medianSalary: number;
  /** decimal — 10-year cumulative employment growth (BLS EP). */
  projectedGrowth: number;
  /** 0-1; higher = more layoff/discharge risk. */
  volatility: number;
};

export const OCCUPATIONS: ReadonlyArray<Occupation> = [
  { id: "software-developer",   label: "software developer",      category: "tech",       medianSalary: 132270, projectedGrowth: 0.25, volatility: 0.18 },
  { id: "data-scientist",       label: "data scientist",          category: "tech",       medianSalary: 108020, projectedGrowth: 0.36, volatility: 0.15 },
  { id: "cybersecurity-analyst", label: "cybersecurity analyst", category: "tech",       medianSalary: 120360, projectedGrowth: 0.32, volatility: 0.12 },
  { id: "product-manager",      label: "product manager",         category: "business",   medianSalary: 159410, projectedGrowth: 0.06, volatility: 0.20 },
  { id: "financial-analyst",    label: "financial analyst",       category: "finance",    medianSalary: 99890,  projectedGrowth: 0.09, volatility: 0.16 },
  { id: "accountant",           label: "accountant",              category: "finance",    medianSalary: 79880,  projectedGrowth: 0.04, volatility: 0.10 },
  { id: "investment-banker",    label: "investment banker",       category: "finance",    medianSalary: 161700, projectedGrowth: 0.07, volatility: 0.28 },
  { id: "actuary",              label: "actuary",                 category: "finance",    medianSalary: 120000, projectedGrowth: 0.22, volatility: 0.05 },
  { id: "registered-nurse",     label: "registered nurse",        category: "healthcare", medianSalary: 86070,  projectedGrowth: 0.06, volatility: 0.06 },
  { id: "physician",            label: "physician",               category: "healthcare", medianSalary: 239200, projectedGrowth: 0.04, volatility: 0.05 },
  { id: "physical-therapist",   label: "physical therapist",      category: "healthcare", medianSalary: 99710,  projectedGrowth: 0.15, volatility: 0.07 },
  { id: "pharmacist",           label: "pharmacist",              category: "healthcare", medianSalary: 136030, projectedGrowth: 0.03, volatility: 0.10 },
  { id: "dentist",              label: "dentist",                 category: "healthcare", medianSalary: 170910, projectedGrowth: 0.04, volatility: 0.08 },
  { id: "teacher-k12",          label: "teacher k-12",            category: "education",  medianSalary: 64390,  projectedGrowth: 0.01, volatility: 0.08 },
  { id: "professor",            label: "professor",               category: "education",  medianSalary: 84380,  projectedGrowth: 0.08, volatility: 0.10 },
  { id: "electrician",          label: "electrician",             category: "trades",     medianSalary: 61590,  projectedGrowth: 0.11, volatility: 0.14 },
  { id: "plumber",              label: "plumber",                 category: "trades",     medianSalary: 61550,  projectedGrowth: 0.06, volatility: 0.14 },
  { id: "construction-manager", label: "construction manager",    category: "trades",     medianSalary: 104900, projectedGrowth: 0.09, volatility: 0.18 },
  { id: "graphic-designer",     label: "graphic designer",        category: "creative",   medianSalary: 58910,  projectedGrowth: 0.03, volatility: 0.22 },
  { id: "writer-author",        label: "writer / author",         category: "creative",   medianSalary: 73690,  projectedGrowth: 0.04, volatility: 0.30 },
  { id: "video-editor",         label: "video editor",            category: "creative",   medianSalary: 66600,  projectedGrowth: 0.07, volatility: 0.25 },
  { id: "chef",                 label: "chef",                    category: "service",    medianSalary: 56520,  projectedGrowth: 0.08, volatility: 0.20 },
  { id: "barber-stylist",       label: "barber / stylist",        category: "service",    medianSalary: 35400,  projectedGrowth: 0.07, volatility: 0.18 },
  { id: "real-estate-agent",    label: "real estate agent",       category: "business",   medianSalary: 56620,  projectedGrowth: 0.03, volatility: 0.32 },
  { id: "marketing-manager",    label: "marketing manager",       category: "business",   medianSalary: 157620, projectedGrowth: 0.08, volatility: 0.18 },
  { id: "civil-servant-federal", label: "civil servant (federal)", category: "government", medianSalary: 95000,  projectedGrowth: 0.02, volatility: 0.05 },
  { id: "police-officer",       label: "police officer",          category: "government", medianSalary: 74910,  projectedGrowth: 0.04, volatility: 0.08 },
  { id: "research-scientist",   label: "research scientist",      category: "science",    medianSalary: 105030, projectedGrowth: 0.10, volatility: 0.12 },
  { id: "civil-engineer",       label: "civil engineer",          category: "science",    medianSalary: 95890,  projectedGrowth: 0.06, volatility: 0.10 },
  { id: "biotech-researcher",   label: "biotech researcher",      category: "science",    medianSalary: 99930,  projectedGrowth: 0.17, volatility: 0.12 },
];

/** existing tech default — used as the fallback shape for unknown free-string fields. */
export const DEFAULT_OCCUPATION: Occupation = OCCUPATIONS[0];

export const OCCUPATION_LABELS: readonly string[] = OCCUPATIONS.map((o) => o.label);

/**
 * case-insensitive substring match on label. first hit wins.
 * returns null on no match — callers should decide what to fall back to
 * (model.ts uses DEFAULT_OCCUPATION + an `occupationSourced=false` flag).
 */
export function findOccupation(query: string): Occupation | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return OCCUPATIONS.find((o) => o.label.includes(q)) ?? null;
}
