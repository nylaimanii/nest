// multi-source city profile endpoint. given a free-text city query, fans
// out across OSM (geocoding), Open-Meteo (climate), World Bank (country-
// level health/safety/education), REST Countries (canonical country name),
// and optionally GeoDB Cities (metro population). all fetches share a 24h
// Next.js revalidate so repeat queries cost zero external requests within
// the window. every external call has an 8s timeout + try/catch and
// degrades to null on failure — the endpoint never returns 5xx; the only
// non-200 path is 404 when OSM finds nothing.

import { NextResponse } from "next/server";

import type { CityProfile, SourceTag } from "@/lib/atlas/cityProfile";

export const revalidate = 86400; // 24h

const REVALIDATE_OPTS = { next: { revalidate: 86400 } } as const;
const TIMEOUT_MS = 8000;

// US state name (lowercased) → 2-letter postal code. duplicated from the
// /api/geocode route since that file deliberately doesn't export this map
// and the current step's instructions forbid touching it.
const STATE_ABBR: Record<string, string> = {
  alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
  colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
  hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia",
  kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md",
  massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms",
  missouri: "mo", montana: "mt", nebraska: "ne", nevada: "nv",
  "new hampshire": "nh", "new jersey": "nj", "new mexico": "nm",
  "new york": "ny", "north carolina": "nc", "north dakota": "nd",
  ohio: "oh", oklahoma: "ok", oregon: "or", pennsylvania: "pa",
  "rhode island": "ri", "south carolina": "sc", "south dakota": "sd",
  tennessee: "tn", texas: "tx", utah: "ut", vermont: "vt", virginia: "va",
  washington: "wa", "west virginia": "wv", wisconsin: "wi", wyoming: "wy",
  "district of columbia": "dc",
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

// ---- timeout wrapper -------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---- 1) OSM Nominatim ------------------------------------------------------

type OSMHit = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

interface OSMResult {
  lat: number;
  lng: number;
  cityName: string;
  countryName: string;
  countryCode: string; // uppercased ISO 2-letter
  stateAbbr: string;   // empty unless US
  isUS: boolean;
}

async function geocodeViaOSM(q: string): Promise<OSMResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "en");
  url.searchParams.set("q", q);

  let hits: OSMHit[];
  try {
    const res = await fetchWithTimeout(url.toString(), {
      headers: { "User-Agent": "NEST-Atlas/0.2 (nyla)" },
      ...REVALIDATE_OPTS,
    });
    if (!res.ok) {
      console.warn(`[cityProfile] osm http ${res.status}`);
      return null;
    }
    hits = (await res.json()) as OSMHit[];
  } catch (e) {
    console.warn(`[cityProfile] osm error: ${(e as Error).message}`);
    return null;
  }

  if (!Array.isArray(hits) || hits.length === 0) return null;

  const r = hits[0];
  const addr = r.address ?? {};
  const lat = Number.parseFloat(r.lat);
  const lng = Number.parseFloat(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const cityPartRaw =
    addr.city ??
    addr.town ??
    addr.municipality ??
    addr.village ??
    addr.county ??
    r.display_name.split(",")[0] ??
    q;
  const cityName = cityPartRaw.toLowerCase().replace(/\s+/g, " ").trim();

  const countryName = (addr.country ?? "").trim();
  const countryCode = (addr.country_code ?? "").toUpperCase();
  const isUS = countryCode === "US" || countryName === "United States";

  const stateName = (addr.state ?? "").toLowerCase();
  const stateAbbr = isUS ? STATE_ABBR[stateName] ?? "" : "";

  return { lat, lng, cityName, countryName, countryCode, stateAbbr, isUS };
}

// ---- 2) Open-Meteo climate -------------------------------------------------

type OpenMeteoResp = {
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    sunshine_duration?: (number | null)[];
  };
};

interface ClimateResult {
  avgTempC: number | null;
  annualSunnyDays: number | null;
}

async function fetchClimate(lat: number, lng: number): Promise<ClimateResult> {
  // 2023 full year — recent + stable. archive API requires the year to be
  // closed; using a fixed year keeps the cache stable across revalidations.
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("start_date", "2023-01-01");
  url.searchParams.set("end_date", "2023-12-31");
  url.searchParams.set("daily", "temperature_2m_max,sunshine_duration");
  url.searchParams.set("timezone", "auto");

  try {
    const res = await fetchWithTimeout(url.toString(), REVALIDATE_OPTS);
    if (!res.ok) {
      console.warn(`[cityProfile] open-meteo http ${res.status}`);
      return { avgTempC: null, annualSunnyDays: null };
    }
    const data = (await res.json()) as OpenMeteoResp;
    const temps = data.daily?.temperature_2m_max ?? [];
    const sun = data.daily?.sunshine_duration ?? [];

    const validTemps = temps.filter(
      (t): t is number => typeof t === "number" && Number.isFinite(t),
    );
    const avgTempC =
      validTemps.length > 0
        ? Math.round(
            (validTemps.reduce((a, b) => a + b, 0) / validTemps.length) * 10,
          ) / 10
        : null;

    // "sunny day" = 5+ hours of measurable sunshine.
    const sunnyDays = sun.filter((s) => (s ?? 0) > 18000).length;
    const annualSunnyDays = sun.length > 0 ? sunnyDays : null;

    return { avgTempC, annualSunnyDays };
  } catch (e) {
    console.warn(`[cityProfile] open-meteo error: ${(e as Error).message}`);
    return { avgTempC: null, annualSunnyDays: null };
  }
}

// ---- 3) World Bank ---------------------------------------------------------

type WBRow = { value: number | null; date: string };
type WBResp = [unknown, WBRow[] | null] | unknown;

async function fetchWorldBankIndicator(
  countryCode: string,
  indicator: string,
): Promise<number | null> {
  const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(countryCode)}/indicator/${encodeURIComponent(indicator)}?format=json&date=2022:2023&per_page=5`;
  try {
    const res = await fetchWithTimeout(url, REVALIDATE_OPTS);
    if (!res.ok) {
      console.warn(`[cityProfile] world-bank ${indicator} http ${res.status}`);
      return null;
    }
    const data = (await res.json()) as WBResp;
    if (!Array.isArray(data) || data.length < 2) return null;
    const rows = data[1];
    if (!Array.isArray(rows)) return null;
    // most recent non-null value wins.
    for (const row of rows) {
      if (row && typeof row.value === "number" && Number.isFinite(row.value)) {
        return row.value;
      }
    }
    return null;
  } catch (e) {
    console.warn(
      `[cityProfile] world-bank ${indicator} error: ${(e as Error).message}`,
    );
    return null;
  }
}

interface WorldBankResult {
  childMortality: number | null;
  lifeExpectancy: number | null;
  schoolEnrollment: number | null;
  safetyProxy: number | null;
  homicideRateRaw: number | null;
}

async function fetchWorldBank(countryCode: string): Promise<WorldBankResult> {
  const [childMortality, lifeExpectancy, schoolEnrollment, homicideRate] =
    await Promise.all([
      fetchWorldBankIndicator(countryCode, "SH.DYN.MORT"),
      fetchWorldBankIndicator(countryCode, "SP.DYN.LE00.IN"),
      fetchWorldBankIndicator(countryCode, "SE.SEC.ENRR"),
      fetchWorldBankIndicator(countryCode, "VC.IHR.PSRC.P5"),
    ]);

  const safetyProxy =
    homicideRate === null
      ? null
      : Math.round(100 - clamp(homicideRate * 5, 0, 100));

  return {
    childMortality,
    lifeExpectancy,
    schoolEnrollment,
    safetyProxy,
    homicideRateRaw: homicideRate,
  };
}

// ---- 4) REST Countries -----------------------------------------------------

type RestCountriesResp = {
  name?: { common?: string; official?: string };
  capital?: string[];
  region?: string;
};

async function fetchRestCountries(
  countryCode: string,
): Promise<{ countryFullName: string | null }> {
  if (!countryCode) return { countryFullName: null };
  const url = `https://restcountries.com/v3.1/alpha/${encodeURIComponent(countryCode)}?fields=name,capital,region`;
  try {
    const res = await fetchWithTimeout(url, REVALIDATE_OPTS);
    if (!res.ok) {
      console.warn(`[cityProfile] rest-countries http ${res.status}`);
      return { countryFullName: null };
    }
    const data = (await res.json()) as RestCountriesResp;
    return { countryFullName: data.name?.common ?? null };
  } catch (e) {
    console.warn(`[cityProfile] rest-countries error: ${(e as Error).message}`);
    return { countryFullName: null };
  }
}

// ---- 5) GeoDB (optional) ---------------------------------------------------

type GeoDBResp = {
  data?: Array<{ population?: number }>;
};

async function fetchGeoDB(
  lat: number,
  lng: number,
): Promise<{ metroPopulation: number | null; reason: SourceTag }> {
  const key = process.env.GEODB_API_KEY;
  if (!key) return { metroPopulation: null, reason: "unknown" };

  // signed coords per GeoDB's location convention: ±lat±lng.
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));
  const location = `${sign(lat)}${sign(lng)}`;
  const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?location=${encodeURIComponent(location)}&radius=50&limit=1&sort=-population`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
      },
      ...REVALIDATE_OPTS,
    });
    if (res.status === 429) {
      console.warn("[cityProfile] geodb rate-limited (429)");
      return { metroPopulation: null, reason: "unknown" };
    }
    if (res.status === 401 || res.status === 403) {
      console.warn("[cityProfile] geodb GEODB_API_KEY invalid");
      return { metroPopulation: null, reason: "unknown" };
    }
    if (!res.ok) {
      console.warn(`[cityProfile] geodb http ${res.status}`);
      return { metroPopulation: null, reason: "unknown" };
    }
    const data = (await res.json()) as GeoDBResp;
    const pop = data.data?.[0]?.population ?? null;
    if (typeof pop === "number" && Number.isFinite(pop)) {
      return { metroPopulation: pop, reason: "geodb" };
    }
    return { metroPopulation: null, reason: "unknown" };
  } catch (e) {
    console.warn(`[cityProfile] geodb error: ${(e as Error).message}`);
    return { metroPopulation: null, reason: "unknown" };
  }
}

// ---- handler ---------------------------------------------------------------

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "missing query" }, { status: 400 });
  }

  // 1) OSM gates the rest — without a fix on lat/lng + country, the
  //    downstream APIs have nothing to bind to.
  const osm = await geocodeViaOSM(q);
  if (!osm) {
    return NextResponse.json({ error: "city not found" }, { status: 404 });
  }

  // 2) fan out the four secondary sources in parallel. each has its own
  //    try/catch so a single failure can't poison the others.
  const [climate, worldBank, restCountries, geodb] = await Promise.all([
    fetchClimate(osm.lat, osm.lng),
    fetchWorldBank(osm.countryCode),
    fetchRestCountries(osm.countryCode),
    fetchGeoDB(osm.lat, osm.lng),
  ]);

  // 3) name normalization. US → "{city}, {st}", else "{city}, {country}".
  //    REST Countries' common name wins over OSM's address.country when
  //    available, so we get "United States" not "United States of America".
  const countryDisplay =
    restCountries.countryFullName ?? osm.countryName ?? "";
  const regionLower = osm.isUS
    ? osm.stateAbbr
    : countryDisplay.toLowerCase().trim();
  const name = regionLower
    ? `${osm.cityName}, ${regionLower}`
    : osm.cityName;

  // 4) source provenance — per-field, so the consumer can show
  //    "SOURCED · world-bank" vs "ESTIMATE · v1" without re-deriving.
  const sources: Record<string, SourceTag> = {
    metroPopulation: geodb.reason,
    annualSunnyDays: climate.annualSunnyDays !== null ? "open-meteo" : "unknown",
    avgTempC: climate.avgTempC !== null ? "open-meteo" : "unknown",
    costOfLiving: "unknown",
    childMortality:
      worldBank.childMortality !== null ? "world-bank" : "unknown",
    lifeExpectancy:
      worldBank.lifeExpectancy !== null ? "world-bank" : "unknown",
    schoolEnrollment:
      worldBank.schoolEnrollment !== null ? "world-bank" : "unknown",
    safetyProxy: worldBank.safetyProxy !== null ? "world-bank" : "unknown",
  };

  const profile: CityProfile = {
    name,
    lat: osm.lat,
    lng: osm.lng,
    country: countryDisplay,
    countryCode: osm.countryCode,
    isUS: osm.isUS,
    metroPopulation: geodb.metroPopulation,
    annualSunnyDays: climate.annualSunnyDays,
    avgTempC: climate.avgTempC,
    costOfLiving: null,
    childMortality: worldBank.childMortality,
    lifeExpectancy: worldBank.lifeExpectancy,
    schoolEnrollment: worldBank.schoolEnrollment,
    safetyProxy: worldBank.safetyProxy,
    sources,
  };

  return NextResponse.json(profile);
}
