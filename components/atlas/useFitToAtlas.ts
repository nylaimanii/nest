"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";

import type { CityRecord } from "@/lib/atlas/cities";

// canvas-size floor below which fitBounds can't satisfy padding + bounds
// and MapLibre logs "Map cannot fit within canvas…". below this we fall
// back to flyTo/jumpTo on the target.
const MIN_FIT_WIDTH = 400;
const MIN_FIT_HEIGHT = 300;
const PADDING = 60;

function pinsBounds(
  pins: CityRecord[],
): [[number, number], [number, number]] {
  const lngs = pins.map((c) => c.lng);
  const lats = pins.map((c) => c.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function canvasReady(map: MaplibreMap): boolean {
  const rect = map.getContainer().getBoundingClientRect();
  return rect.width >= MIN_FIT_WIDTH && rect.height >= MIN_FIT_HEIGHT;
}

/** rough "is the bounding box all in the lower-48 + AK/HI" check — chosen
 *  conservatively so anything outside the continental + alaska + hawaii
 *  envelope flips to the wider international zoom cap. */
function spreadsGlobally(pins: CityRecord[]): boolean {
  for (const c of pins) {
    if (c.lng < -170 || c.lng > -60) return true;
    if (c.lat < 18 || c.lat > 72) return true;
  }
  return false;
}

/**
 * Frame the map to target + all alternates. first run after the map has
 * loaded → snap-fit (duration 0). subsequent target/alternate changes →
 * animated fit (700ms). target-only (no alternates) → flyTo target at
 * zoom 5. canvas too small → jumpTo / flyTo target.
 *
 * `mapReady` is flipped to true by AtlasMap's onLoad — without it, the
 * effect runs before the map is mounted and silently no-ops.
 */
export function useFitToAtlas(
  mapRef: RefObject<MapRef | null>,
  target: CityRecord | null,
  alternates: CityRecord[],
  mapReady: boolean,
): void {
  const initialFitDone = useRef(false);
  const prevKey = useRef<string>("");

  // identity key — when target.id + alternates ids change, refire.
  const key = `${target?.id ?? ""}|${alternates.map((a) => a.id).join(",")}`;

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (!target) return;

    const pins = [target, ...alternates];
    const isInitial = !initialFitDone.current;
    const unchanged = !isInitial && key === prevKey.current;
    prevKey.current = key;

    if (unchanged) return;
    initialFitDone.current = true;

    const duration = isInitial ? 0 : 700;

    if (pins.length === 1 || !canvasReady(map)) {
      const mover = isInitial
        ? () => map.jumpTo({ center: [target.lng, target.lat], zoom: 5 })
        : () => map.flyTo({ center: [target.lng, target.lat], zoom: 5, duration });
      mover();
      return;
    }

    const maxZoom = spreadsGlobally(pins) ? 4 : 6;
    map.fitBounds(pinsBounds(pins), {
      padding: { top: PADDING, right: PADDING, bottom: PADDING, left: PADDING },
      maxZoom,
      duration,
    });
  }, [key, mapRef, mapReady, target, alternates]);
}
