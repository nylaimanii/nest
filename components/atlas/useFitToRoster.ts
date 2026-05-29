"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";

import type { CityRecord } from "@/lib/atlas/cities";

// canvas-size floor below which fitBounds can't satisfy padding + bounds
// and MapLibre logs "Map cannot fit within canvas…". below this we fall
// back to a flyTo/jumpTo on the newest city.
const MIN_FIT_WIDTH = 400;
const MIN_FIT_HEIGHT = 300;
const PADDING = 40;

function rosterBounds(
  roster: CityRecord[],
): [[number, number], [number, number]] {
  const lngs = roster.map((c) => c.lng);
  const lats = roster.map((c) => c.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function canvasReady(map: MaplibreMap): boolean {
  const rect = map.getContainer().getBoundingClientRect();
  return rect.width >= MIN_FIT_WIDTH && rect.height >= MIN_FIT_HEIGHT;
}

/**
 * Frame the map to the current roster.
 *   - first run after the map has loaded → snap-fit (duration 0) so cold
 *     loads always show every pin, no fly-in.
 *   - subsequent roster.length changes → animated fit (700ms).
 *   - canvas too small → jumpTo / flyTo the newest city at zoom 5.
 *   - roster.length < 1 → no-op (keeps the default continental-US view).
 *
 * `mapReady` is flipped to true by AtlasMap's onLoad — without it, the
 * effect runs before the map is mounted and silently no-ops.
 */
export function useFitToRoster(
  mapRef: RefObject<MapRef | null>,
  roster: CityRecord[],
  mapReady: boolean,
): void {
  const initialFitDone = useRef(false);
  const prevLength = useRef(roster.length);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (!initialFitDone.current) {
      initialFitDone.current = true;
      prevLength.current = roster.length;
      if (roster.length < 1) return;

      if (!canvasReady(map)) {
        const newest = roster[roster.length - 1];
        if (newest) {
          map.jumpTo({ center: [newest.lng, newest.lat], zoom: 5 });
        }
        return;
      }

      map.fitBounds(rosterBounds(roster), {
        padding: { top: PADDING, right: PADDING, bottom: PADDING, left: PADDING },
        maxZoom: 5,
        duration: 0,
      });
      return;
    }

    if (roster.length === prevLength.current) return;
    prevLength.current = roster.length;
    if (roster.length < 2) return;

    if (!canvasReady(map)) {
      const newest = roster[roster.length - 1];
      if (newest) {
        map.flyTo({
          center: [newest.lng, newest.lat],
          zoom: 5,
          duration: 700,
        });
      }
      return;
    }

    map.fitBounds(rosterBounds(roster), {
      padding: { top: PADDING, right: PADDING, bottom: PADDING, left: PADDING },
      maxZoom: 6,
      duration: 700,
    });
  }, [roster, mapRef, mapReady]);
}
