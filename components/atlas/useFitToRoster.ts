"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { CityRecord } from "@/lib/atlas/cities";

// canvas-size floor below which fitBounds can't satisfy padding + bounds
// and MapLibre logs "Map cannot fit within canvas…". below this we fall
// back to a flyTo on the newest city instead of forcing the fit.
const MIN_FIT_WIDTH = 400;
const MIN_FIT_HEIGHT = 300;

/**
 * After mount, whenever roster.length changes:
 *   - <2 cities → no-op
 *   - canvas too small → flyTo the newest city at zoom 5 (graceful degrade)
 *   - otherwise   → fitBounds across the roster with editorial padding
 * First mount is skipped so the initial continental-US view stays intact.
 */
export function useFitToRoster(
  mapRef: RefObject<MapRef | null>,
  roster: CityRecord[],
): void {
  const initialized = useRef(false);
  const prevLength = useRef(roster.length);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      prevLength.current = roster.length;
      return;
    }
    if (roster.length === prevLength.current) return;
    prevLength.current = roster.length;
    if (roster.length < 2) return;

    const map = mapRef.current?.getMap();
    if (!map) return;

    const rect = map.getContainer().getBoundingClientRect();
    if (rect.width < MIN_FIT_WIDTH || rect.height < MIN_FIT_HEIGHT) {
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

    const lngs = roster.map((c) => c.lng);
    const lats = roster.map((c) => c.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: { top: 40, right: 40, bottom: 40, left: 40 },
        maxZoom: 6,
        duration: 700,
      },
    );
  }, [roster, mapRef]);
}
