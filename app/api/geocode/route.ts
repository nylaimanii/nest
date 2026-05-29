// thin proxy to Nominatim — server-side only so we don't expose the
// User-Agent + accept-language requirements to the browser, and so we can
// cache cleanly with Next's fetch revalidation. returns { name, lat, lng }
// or null. never throws.

import { NextResponse } from "next/server";

import { US_STATE_ABBR } from "@/lib/atlas/usStates";

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
  target.searchParams.set("q", q);

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
  const isUS = addr.country === "United States" || addr.country === undefined;
  const cityPart =
    addr.city ?? addr.town ?? addr.village ?? addr.county ?? r.display_name.split(",")[0] ?? q;
  const stateName = (addr.state ?? "").toLowerCase();
  const stateAbbr = US_STATE_ABBR[stateName] ?? "";

  const cleanCity = cityPart.toLowerCase().replace(/\s+/g, " ").trim();
  // "city, st" for US (when we recognized the state); "city, country" for
  // everything else. country presence is what flips the format — without it,
  // downstream callers can't tell US from international and tax math breaks.
  const countryName = (addr.country ?? "").toLowerCase().trim();
  const name = isUS && stateAbbr
    ? `${cleanCity}, ${stateAbbr}`
    : countryName
      ? `${cleanCity}, ${countryName}`
      : cleanCity;
  const lat = Number.parseFloat(r.lat);
  const lng = Number.parseFloat(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(null);
  }

  return NextResponse.json({ name, lat, lng });
}
