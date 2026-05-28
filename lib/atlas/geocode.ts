// client helper for the /api/geocode proxy. returns null on any failure
// — never throws to the UI.

export type Geocoded = { name: string; lat: number; lng: number };

export async function geocodeCity(query: string): Promise<Geocoded | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
      method: "GET",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Geocoded | null;
    if (!data) return null;
    if (
      typeof data.name !== "string" ||
      typeof data.lat !== "number" ||
      typeof data.lng !== "number"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
