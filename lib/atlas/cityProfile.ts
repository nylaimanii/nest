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
