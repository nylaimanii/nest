// thin proxy to Nominatim — server-side only so we don't expose the
// User-Agent + accept-language requirements to the browser, and so we can
// cache cleanly with Next's fetch revalidation. returns { name, lat, lng }
// or null. never throws.

import { NextResponse } from "next/server";

// US state name -> postal abbrev (lowercased), for normalizing the geocoded
// display into our "city, st" convention.
const STATE_ABBR: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
  "district of columbia": "dc",
};

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json(null);

  const target = new URL("https://nominatim.openstreetmap.org/search");
  target.searchParams.set("format", "json");
  target.searchParams.set("addressdetails", "1");
  target.searchParams.set("limit", "1");
  target.searchParams.set("accept-language", "en");
  target.searchParams.set("q", `${q} united states`);

  let hits: NominatimHit[];
  try {
    const res = await fetch(target.toString(), {
      headers: { "User-Agent": "NEST-Atlas/0.1 (nyla)" },
      // 1-day cache per Nominatim's usage policy guidance.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json(null);
    hits = (await res.json()) as NominatimHit[];
  } catch {
    return NextResponse.json(null);
  }

  if (!Array.isArray(hits) || hits.length === 0)
    return NextResponse.json(null);

  const r = hits[0];
  const addr = r.address ?? {};
  // require US results — keeps state-abbrev normalization sound.
  if (addr.country && addr.country !== "United States") {
    return NextResponse.json(null);
  }
  const cityPart =
    addr.city ?? addr.town ?? addr.village ?? addr.county ?? r.display_name.split(",")[0] ?? q;
  const stateName = (addr.state ?? "").toLowerCase();
  const stateAbbr = STATE_ABBR[stateName] ?? "";

  const cleanCity = cityPart.toLowerCase().replace(/\s+/g, " ").trim();
  const name = stateAbbr ? `${cleanCity}, ${stateAbbr}` : cleanCity;
  const lat = Number.parseFloat(r.lat);
  const lng = Number.parseFloat(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(null);
  }

  return NextResponse.json({ name, lat, lng });
}
