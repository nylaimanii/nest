"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Map, type MapRef } from "react-map-gl/maplibre";

import { AtlasPin } from "./AtlasPin";
import { FieldGuideCard } from "./FieldGuideCard";
import { LeaderLabel } from "./LeaderLabel";
import { useFitToRoster } from "./useFitToRoster";
import { applyAtlasPalette, MAP_STYLE_URL } from "@/lib/atlas/mapStyle";
import { useAtlasStore } from "@/store/atlas";

const INITIAL_VIEW = { longitude: -96.5, latitude: 39.5, zoom: 3.6 };

export function AtlasMap() {
  const roster = useAtlasStore((s) => s.roster);
  const scores = useAtlasStore((s) => s.scores);
  const activeCityId = useAtlasStore((s) => s.activeCityId);
  const setActiveCity = useAtlasStore((s) => s.setActiveCity);

  const mapRef = useRef<MapRef | null>(null);

  // maplibre-gl is browser-only — defer rendering until client mount so
  // the SSR HTML stays a clean empty bone surface and there's no diff.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) applyAtlasPalette(map);
  }, []);

  // re-apply if the style ever reloads (e.g. base style swap, sprite reload).
  useEffect(() => {
    if (!mounted) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const handler = () => applyAtlasPalette(map);
    map.on("styledata", handler);
    return () => {
      map.off("styledata", handler);
    };
  }, [mounted]);

  useFitToRoster(mapRef, roster);

  return (
    <div
      className="relative h-full min-h-[560px] overflow-hidden bg-bone"
      style={{ position: "relative" }}
    >
      {mounted ? (
        <Map
          ref={mapRef}
          initialViewState={INITIAL_VIEW}
          minZoom={3}
          maxZoom={8}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          mapStyle={MAP_STYLE_URL}
          onLoad={handleLoad}
          attributionControl={{ compact: false }}
          style={{ width: "100%", height: "100%" }}
        >
          {roster.map((city, i) => {
            const score = scores.find((s) => s.city.id === city.id);
            const active = city.id === activeCityId;
            return (
              <Fragment key={city.id}>
                <LeaderLabel
                  city={city}
                  index={i}
                  score={score}
                  active={active}
                />
                <AtlasPin
                  city={city}
                  index={i}
                  active={active}
                  onClick={() => setActiveCity(city.id)}
                />
                {active ? (
                  <FieldGuideCard city={city} index={i} score={score} />
                ) : null}
              </Fragment>
            );
          })}
        </Map>
      ) : null}
    </div>
  );
}
