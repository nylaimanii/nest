// types for the multi-source city profile endpoint (app/api/cityProfile).
// distinct from CityRecord in cities.ts — that's the curated 20-metro
// dataset; this is the live, source-tagged remote profile shape returned
// by the API. they may merge in a later step but stay separate for now.

export type SourceTag =
  | "osm"
  | "open-meteo"
  | "world-bank"
  | "rest-countries"
  | "geodb"
  | "country-estimate"
  | "unknown";

export interface CityProfile {
  /** normalized "city, region" — region = US 2-letter state for US,
   *  full country name (lowercase) for international. */
  name: string;
  lat: number;
  lng: number;
  /** full country name from REST Countries (or OSM fallback). */
  country: string;
  /** ISO 3166-1 alpha-2, uppercased. */
  countryCode: string;
  isUS: boolean;
  metroPopulation: number | null;
  annualSunnyDays: number | null;
  /** annual mean of daily max temperature, Celsius. */
  avgTempC: number | null;
  /** placeholder — most free APIs don't expose this without a paid plan. */
  costOfLiving: number | null;
  /** under-5 mortality rate per 1000 live births (country-level, World Bank). */
  childMortality: number | null;
  /** life expectancy at birth, years (country-level, World Bank). */
  lifeExpectancy: number | null;
  /** secondary school gross enrollment %, country-level (World Bank). */
  schoolEnrollment: number | null;
  /** 0-100 derived from country homicide rate: 100 - clamp(rate*5, 0, 100). */
  safetyProxy: number | null;
  /** per-field provenance — keys match field names above (skipping
   *  `name`/`lat`/`lng`/`isUS`/`country`/`countryCode` which always come
   *  from OSM/REST-Countries). consumer can show "SOURCED · BLS"-style
   *  tags without re-deriving where each number came from. */
  sources: Record<string, SourceTag>;
}

export interface CityProfileError {
  error: string;
}

// ---- record builder --------------------------------------------------------
// turns the CityProfile API shape into a CityRecord the atlas engine can
// score against. country-level signals (schoolEnrollment, safetyProxy)
// map into the city-level score slots with honest provenance tags so the
// vision panel can label them "COUNTRY EST" rather than misrepresenting
// them as city-specific.

import type { CityRecord, Confidence } from "./cities";
import { cityIdFromName } from "./cities";

function clampPct(n: number | null): number | null {
  if (n === null) return null;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export function cityRecordFromProfile(profile: CityProfile): CityRecord {
  const confidence: Confidence = profile.isUS ? "partial-us" : "partial-global";
  return {
    id: cityIdFromName(profile.name),
    name: profile.name,
    lat: profile.lat,
    lng: profile.lng,
    costOfLiving: profile.costOfLiving,
    medianRent2BR: null,
    // country-level proxy via World Bank — clamped to 0-100 since secondary
    // enrollment can exceed 100% in some countries (repeat students etc).
    schoolScore: clampPct(profile.schoolEnrollment),
    // safetyProxy is already in 0-100 from the route (100 - homicide*5 clamped).
    safetyScore: profile.safetyProxy,
    greenSpacePct: null,
    childcareMonthly: null,
    takeHomeAfterChildcarePct: null,
    careerHubFor: [],
    metroPopulation: profile.metroPopulation,
    annualSunnyDays: profile.annualSunnyDays,
    confidence,
    country: profile.country || null,
    sources: profile.sources,
  };
}
