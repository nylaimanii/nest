// PLACEHOLDERS — v1 illustrative city dataset. numbers are real-ish but
// not sourced; replace with a sourced dataset (ACS / NCES / GreenSpace
// Index / locality reports) in lib/atlas/cities.real.ts later.

import type { SourceTag } from "./cityProfile";

/** four data-confidence tiers, set on the CityRecord itself (distinct from
 *  CityScore.confidence, which is derived from how many factors scored):
 *    - "full":           hand-curated US metro in the seed dataset
 *    - "partial-us":     typed-in US city not in the dataset (cityProfile
 *                        gave us lat/lng + sometimes scattered country data)
 *    - "partial-global": typed-in international city (climate + country-
 *                        level signals via cityProfile)
 *    - "unknown":        failed lookup (should be cleared from state) */
export type Confidence = "full" | "partial-us" | "partial-global" | "unknown";

export type CityRecord = {
  id: string;
  name: string; // "new york, ny" — always lowercased "city, state-abbrev"
  lat: number;
  lng: number;
  /** ACCRA-style index; US avg = 100. lower = cheaper. */
  costOfLiving: number | null;
  /** median monthly rent for a 2BR, USD. */
  medianRent2BR: number | null;
  /** 0–100, higher is better. */
  schoolScore: number | null;
  /** 0–100, higher is safer. */
  safetyScore: number | null;
  /** % of the metro area as parks / open space. */
  greenSpacePct: number | null;
  /** median monthly childcare for one kid, USD. */
  childcareMonthly: number | null;
  /** % of post-tax income left after childcare for one kid. null if unknown. */
  takeHomeAfterChildcarePct: ((income: number) => number) | null;
  /** career hub tags this metro tends to win on. empty for partial-data cities. */
  careerHubFor: string[];
  /** city-proper population — US Census Bureau estimates. preference factor:
   *  smaller cities have a stronger community feel; larger metros surface
   *  more opportunity. neither is objectively better. */
  metroPopulation: number | null;
  /** approximate sunny days per year, from NOAA/NWS averages. preference
   *  factor — sunny vs gray is taste, not better/worse. */
  annualSunnyDays: number | null;
  /** data-confidence tier (see Confidence type). seed dataset records are
   *  "full"; records built from cityProfile are "partial-us" or
   *  "partial-global" depending on whether the country is the US. */
  confidence?: Confidence;
  /** country name for non-US records — used by the sidebar provenance tag.
   *  null/undefined for US (state code is part of `name`). */
  country?: string | null;
  /** per-field provenance from cityProfile.sources, attached when the
   *  record comes from the global lookup path. undefined for the seed
   *  dataset (provenance is implicit: "hand-curated"). */
  sources?: Record<string, SourceTag>;
};

// flat 24% effective tax (mirrors lib/sim/model.ts TAX_RATE).
const TAKEHOME = 0.76;

/** factory that closes over the city's childcare to produce a take-home % fn. */
function takeHomePctFor(
  childcareMonthly: number | null,
): ((income: number) => number) | null {
  if (childcareMonthly === null) return null;
  return (income: number) => {
    const takeHome = income * TAKEHOME;
    if (takeHome <= 0) return 0;
    return Math.round(((takeHome - childcareMonthly * 12) / takeHome) * 100);
  };
}

/** small constructor for the seed dataset so we don't repeat the function wiring. */
function city(
  data: Omit<CityRecord, "takeHomeAfterChildcarePct">,
): CityRecord {
  return {
    ...data,
    confidence: data.confidence ?? "full",
    takeHomeAfterChildcarePct: takeHomePctFor(data.childcareMonthly),
  };
}

// ---- the seed list (20 US metros) -----------------------------------------

export const NEW_YORK_NY = city({
  id: "new-york-ny",
  name: "new york, ny",
  lat: 40.7128,
  lng: -74.006,
  costOfLiving: 187,
  medianRent2BR: 4500,
  schoolScore: 78,
  safetyScore: 72,
  greenSpacePct: 14,
  childcareMonthly: 2400,
  careerHubFor: ["finance", "tech", "creative", "healthcare"],
  metroPopulation: 8400000,
  annualSunnyDays: 224,
});

export const AUSTIN_TX = city({
  id: "austin-tx",
  name: "austin, tx",
  lat: 30.2672,
  lng: -97.7431,
  costOfLiving: 119,
  medianRent2BR: 2200,
  schoolScore: 78,
  safetyScore: 74,
  greenSpacePct: 10,
  childcareMonthly: 1500,
  careerHubFor: ["tech", "creative"],
  metroPopulation: 950000,
  annualSunnyDays: 228,
});

export const CITIES: CityRecord[] = [
  NEW_YORK_NY,
  city({
    id: "los-angeles-ca",
    name: "los angeles, ca",
    lat: 34.0522,
    lng: -118.2437,
    costOfLiving: 173,
    medianRent2BR: 3300,
    schoolScore: 72,
    safetyScore: 65,
    greenSpacePct: 13,
    childcareMonthly: 2100,
    careerHubFor: ["creative", "tech", "healthcare"],
    metroPopulation: 3970000,
    annualSunnyDays: 284,
  }),
  city({
    id: "san-francisco-ca",
    name: "san francisco, ca",
    lat: 37.7749,
    lng: -122.4194,
    costOfLiving: 244,
    medianRent2BR: 4800,
    schoolScore: 80,
    safetyScore: 68,
    greenSpacePct: 17,
    childcareMonthly: 2800,
    careerHubFor: ["tech", "biotech", "finance"],
    metroPopulation: 873000,
    annualSunnyDays: 256,
  }),
  city({
    id: "boston-ma",
    name: "boston, ma",
    lat: 42.3601,
    lng: -71.0589,
    costOfLiving: 162,
    medianRent2BR: 3700,
    schoolScore: 88,
    safetyScore: 78,
    greenSpacePct: 18,
    childcareMonthly: 2500,
    careerHubFor: ["biotech", "healthcare", "finance"],
    metroPopulation: 650000,
    annualSunnyDays: 200,
  }),
  city({
    id: "washington-dc",
    name: "washington, dc",
    lat: 38.9072,
    lng: -77.0369,
    costOfLiving: 152,
    medianRent2BR: 3000,
    schoolScore: 80,
    safetyScore: 72,
    greenSpacePct: 22,
    childcareMonthly: 2300,
    careerHubFor: ["government", "tech"],
    metroPopulation: 712000,
    annualSunnyDays: 201,
  }),
  AUSTIN_TX,
  city({
    id: "dallas-tx",
    name: "dallas, tx",
    lat: 32.7767,
    lng: -96.797,
    costOfLiving: 102,
    medianRent2BR: 1900,
    schoolScore: 70,
    safetyScore: 68,
    greenSpacePct: 9,
    childcareMonthly: 1400,
    careerHubFor: ["finance", "tech", "healthcare"],
    metroPopulation: 1340000,
    annualSunnyDays: 232,
  }),
  city({
    id: "houston-tx",
    name: "houston, tx",
    lat: 29.7604,
    lng: -95.3698,
    costOfLiving: 96,
    medianRent2BR: 1700,
    schoolScore: 68,
    safetyScore: 64,
    greenSpacePct: 8,
    childcareMonthly: 1300,
    careerHubFor: ["healthcare", "manufacturing"],
    metroPopulation: 2280000,
    annualSunnyDays: 204,
  }),
  city({
    id: "atlanta-ga",
    name: "atlanta, ga",
    lat: 33.749,
    lng: -84.388,
    costOfLiving: 107,
    medianRent2BR: 2100,
    schoolScore: 70,
    safetyScore: 64,
    greenSpacePct: 28,
    childcareMonthly: 1400,
    careerHubFor: ["tech", "creative", "healthcare"],
    metroPopulation: 488000,
    annualSunnyDays: 217,
  }),
  city({
    id: "miami-fl",
    name: "miami, fl",
    lat: 25.7617,
    lng: -80.1918,
    costOfLiving: 123,
    medianRent2BR: 3000,
    schoolScore: 65,
    safetyScore: 68,
    greenSpacePct: 12,
    childcareMonthly: 1800,
    careerHubFor: ["finance", "creative"],
    metroPopulation: 440000,
    annualSunnyDays: 248,
  }),
  city({
    id: "chicago-il",
    name: "chicago, il",
    lat: 41.8781,
    lng: -87.6298,
    costOfLiving: 107,
    medianRent2BR: 2400,
    schoolScore: 74,
    safetyScore: 62,
    greenSpacePct: 8,
    childcareMonthly: 2000,
    careerHubFor: ["finance", "tech", "manufacturing"],
    metroPopulation: 2740000,
    annualSunnyDays: 189,
  }),
  city({
    id: "minneapolis-mn",
    name: "minneapolis, mn",
    lat: 44.9778,
    lng: -93.265,
    costOfLiving: 109,
    medianRent2BR: 1900,
    schoolScore: 82,
    safetyScore: 78,
    greenSpacePct: 17,
    childcareMonthly: 1700,
    careerHubFor: ["healthcare", "finance", "manufacturing"],
    metroPopulation: 430000,
    annualSunnyDays: 198,
  }),
  city({
    id: "denver-co",
    name: "denver, co",
    lat: 39.7392,
    lng: -104.9903,
    costOfLiving: 128,
    medianRent2BR: 2300,
    schoolScore: 78,
    safetyScore: 76,
    greenSpacePct: 11,
    childcareMonthly: 1800,
    careerHubFor: ["tech", "healthcare"],
    metroPopulation: 710000,
    annualSunnyDays: 245,
  }),
  city({
    id: "boulder-co",
    name: "boulder, co",
    lat: 40.015,
    lng: -105.2705,
    costOfLiving: 137,
    medianRent2BR: 2400,
    schoolScore: 85,
    safetyScore: 85,
    greenSpacePct: 32,
    childcareMonthly: 1900,
    careerHubFor: ["tech", "biotech"],
    metroPopulation: 108000,
    annualSunnyDays: 245,
  }),
  city({
    id: "raleigh-nc",
    name: "raleigh, nc",
    lat: 35.7796,
    lng: -78.6382,
    costOfLiving: 99,
    medianRent2BR: 1800,
    schoolScore: 80,
    safetyScore: 80,
    greenSpacePct: 14,
    childcareMonthly: 1500,
    careerHubFor: ["tech", "biotech", "healthcare"],
    metroPopulation: 470000,
    annualSunnyDays: 213,
  }),
  city({
    id: "pittsburgh-pa",
    name: "pittsburgh, pa",
    lat: 40.4406,
    lng: -79.9959,
    costOfLiving: 91,
    medianRent2BR: 1500,
    schoolScore: 76,
    safetyScore: 72,
    greenSpacePct: 13,
    childcareMonthly: 1500,
    careerHubFor: ["tech", "healthcare", "manufacturing"],
    metroPopulation: 303000,
    annualSunnyDays: 157,
  }),
  city({
    id: "portland-or",
    name: "portland, or",
    lat: 45.5152,
    lng: -122.6784,
    costOfLiving: 132,
    medianRent2BR: 2300,
    schoolScore: 74,
    safetyScore: 70,
    greenSpacePct: 18,
    childcareMonthly: 1900,
    careerHubFor: ["tech", "creative"],
    metroPopulation: 652000,
    annualSunnyDays: 144,
  }),
  city({
    id: "seattle-wa",
    name: "seattle, wa",
    lat: 47.6062,
    lng: -122.3321,
    costOfLiving: 158,
    medianRent2BR: 2900,
    schoolScore: 82,
    safetyScore: 76,
    greenSpacePct: 16,
    childcareMonthly: 2400,
    careerHubFor: ["tech", "biotech"],
    metroPopulation: 750000,
    annualSunnyDays: 152,
  }),
  city({
    id: "columbus-oh",
    name: "columbus, oh",
    lat: 39.9612,
    lng: -82.9988,
    costOfLiving: 92,
    medianRent2BR: 1500,
    schoolScore: 76,
    safetyScore: 76,
    greenSpacePct: 12,
    childcareMonthly: 1400,
    careerHubFor: ["healthcare", "manufacturing"],
    metroPopulation: 907000,
    annualSunnyDays: 178,
  }),
  city({
    id: "kansas-city-mo",
    name: "kansas city, mo",
    lat: 39.0997,
    lng: -94.5786,
    costOfLiving: 89,
    medianRent2BR: 1500,
    schoolScore: 72,
    safetyScore: 70,
    greenSpacePct: 13,
    childcareMonthly: 1300,
    careerHubFor: ["healthcare", "manufacturing"],
    metroPopulation: 508000,
    annualSunnyDays: 217,
  }),
];

// ---- lookups --------------------------------------------------------------

/** fuzzy: lowercased substring match against city `name`. first hit wins. */
export function findCityByName(query: string): CityRecord | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return CITIES.find((c) => c.name.includes(q)) ?? null;
}

export function findCityById(id: string): CityRecord | null {
  return CITIES.find((c) => c.id === id) ?? null;
}

/** id slug from a normalized city name. shared with the cityProfile path
 *  so a typed "tokyo, japan" produces the same id regardless of which
 *  fetch path resolved it. */
export function cityIdFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
