// scientific-atlas palette overrides applied at runtime against the
// OpenFreeMap positron style. positron is fetched from
// https://tiles.openfreemap.org/styles/positron (free, no token, fair-use,
// OpenStreetMap attribution required — see app/globals.css for the
// styling of .maplibregl-ctrl-attrib).
//
// strategy: hide every default label (symbol layer) so our custom
// leader-line labels are the only place city names appear; otherwise just
// retune fill/line colors. paint properties that don't exist on a given
// layer are silently swallowed (each set is wrapped in try/catch).

import type { Map as MaplibreMap } from "maplibre-gl";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

const C_LAND = "#FAF8F4"; // bone — primary surface
const C_WATER = "#EEEAE2"; // slightly cooler bone
const C_LINE = "#D8D2C8"; // hairline borders
const C_ROAD = "#6B655C"; // muted

function safe(fn: () => void): void {
  try {
    fn();
  } catch {
    // layer/property might not exist on this style; that's fine.
  }
}

export function applyAtlasPalette(map: MaplibreMap): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();
    const type = layer.type;

    // hide every default label — our LeaderLabel components own city names.
    if (type === "symbol") {
      safe(() => map.setLayoutProperty(layer.id, "visibility", "none"));
      continue;
    }

    // background → bone
    if (type === "background") {
      safe(() => map.setPaintProperty(layer.id, "background-color", C_LAND));
      continue;
    }

    // water → cooler bone
    if (id.includes("water") || id.includes("ocean") || id.includes("river") || id.includes("lake")) {
      if (type === "fill") {
        safe(() => map.setPaintProperty(layer.id, "fill-color", C_WATER));
        safe(() => map.setPaintProperty(layer.id, "fill-outline-color", C_LINE));
      } else if (type === "line") {
        safe(() => map.setPaintProperty(layer.id, "line-color", C_WATER));
      }
      continue;
    }

    // land / parks / earth → bone
    if (
      id.includes("land") ||
      id.includes("earth") ||
      id.includes("park") ||
      id.includes("forest") ||
      id.includes("grass") ||
      id.includes("wood") ||
      id.includes("landcover") ||
      id.includes("landuse")
    ) {
      if (type === "fill") {
        safe(() => map.setPaintProperty(layer.id, "fill-color", C_LAND));
      }
      continue;
    }

    // state/country boundaries → 1px line color
    if (id.includes("boundary") || id.includes("admin") || id.includes("border")) {
      if (type === "line") {
        safe(() => map.setPaintProperty(layer.id, "line-color", C_LINE));
        safe(() => map.setPaintProperty(layer.id, "line-width", 1));
        safe(() => map.setPaintProperty(layer.id, "line-opacity", 1));
      }
      continue;
    }

    // roads — major only at hairline muted; everything sub-arterial hidden.
    if (
      id.includes("road") ||
      id.includes("highway") ||
      id.includes("motorway") ||
      id.includes("street") ||
      id.includes("transport") ||
      id.includes("bridge") ||
      id.includes("tunnel")
    ) {
      const minor =
        id.includes("minor") ||
        id.includes("residential") ||
        id.includes("service") ||
        id.includes("path") ||
        id.includes("track") ||
        id.includes("pedestrian") ||
        id.includes("footway");
      if (minor) {
        safe(() => map.setLayoutProperty(layer.id, "visibility", "none"));
      } else if (type === "line") {
        safe(() => map.setPaintProperty(layer.id, "line-color", C_ROAD));
        safe(() => map.setPaintProperty(layer.id, "line-opacity", 0.4));
        safe(() => map.setPaintProperty(layer.id, "line-width", 0.5));
      }
      continue;
    }

    // buildings hidden for editorial restraint
    if (id.includes("building")) {
      safe(() => map.setLayoutProperty(layer.id, "visibility", "none"));
      continue;
    }
  }
}
