// shared US state name → 2-letter postal code map. used by the geocode
// route to normalize "city, st" output and by the cityProfile route to
// build the same normalized name format. exported so future callers (the
// step-C unified atlas pipeline, batch ingest scripts, etc.) don't have
// to re-declare 51 entries.

/** keys are full state names lowercased; values are 2-letter codes lowercased
 *  (matching the existing /api/geocode behavior — callers that want
 *  uppercase can call `.toUpperCase()` at the site). */
export const US_STATE_ABBR: Record<string, string> = {
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

/** case-insensitive lookup. returns the 2-letter code (lowercase) or null. */
export function stateAbbrevFromStateName(name: string): string | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return US_STATE_ABBR[key] ?? null;
}
