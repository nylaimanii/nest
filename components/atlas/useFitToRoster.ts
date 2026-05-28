"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { CityRecord } from "@/lib/atlas/cities";

/**
 * After mount, whenever roster.length changes and we have ≥ 2 cities,
 * fit the map to their combined bounds with editorial padding. First
 * mount is skipped so the initial continental-US view stays intact.
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

    const lngs = roster.map((c) => c.lng);
    const lats = roster.map((c) => c.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: { top: 80, right: 80, bottom: 80, left: 80 },
        maxZoom: 6,
        duration: 700,
      },
    );
  }, [roster, mapRef]);
}
