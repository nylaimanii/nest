"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, Marker, type MapRef } from "react-map-gl/maplibre";

import { applyAtlasPalette, MAP_STYLE_URL } from "@/lib/atlas/mapStyle";
import { contextFrom, useAtlasStore } from "@/store/atlas";
import { scoreCity } from "@/lib/atlas/score";
import type { CityRecord } from "@/lib/atlas/cities";
import { useSimStore } from "@/store/sim";
import { useFitToAtlas } from "./useFitToAtlas";

const INITIAL_VIEW = { longitude: -96.5, latitude: 39.5, zoom: 3.6 };

// inward heuristic — labels sit toward the map center so they don't run
// off the canvas edge for coastal pins.
const PIVOT_LNG = -96.5;
const LABEL_OFFSET_X = 44;
const LABEL_OFFSET_Y = 14;

function labelSide(lng: number): "right" | "left" {
  return lng < PIVOT_LNG ? "right" : "left";
}

// ---- target pin (one) ------------------------------------------------------
// larger, dominant — green halo always visible, bone 3px ring, no number.
function TargetPin({ city, onClick }: { city: CityRecord; onClick: () => void }) {
  return (
    <Marker
      longitude={city.lng}
      latitude={city.lat}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div className="cursor-pointer" aria-label={`target — ${city.name}`}>
        <svg
          width={48}
          height={48}
          viewBox="-24 -24 48 48"
          style={{ overflow: "visible", display: "block" }}
        >
          <circle r={22} fill="#1F4D3A" fillOpacity={0.25} />
          <circle r={17} fill="#FAF8F4" />
          <circle r={14} fill="#1F4D3A" />
        </svg>
      </div>
    </Marker>
  );
}

function TargetLabel({ city }: { city: CityRecord }) {
  const side = labelSide(city.lng);
  const offsetX = side === "right" ? LABEL_OFFSET_X : -LABEL_OFFSET_X;
  const offsetY = -LABEL_OFFSET_Y;
  return (
    <Marker longitude={city.lng} latitude={city.lat} anchor="center">
      <div
        className="pointer-events-none"
        style={{ position: "relative", width: 0, height: 0 }}
      >
        <svg
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            overflow: "visible",
          }}
        >
          <line
            x1={0}
            y1={0}
            x2={offsetX}
            y2={offsetY}
            stroke="#1F4D3A"
            strokeOpacity={0.8}
            strokeWidth={1}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: `${offsetX}px`,
            top: `${offsetY}px`,
            transform:
              side === "right" ? "translate(0, -50%)" : "translate(-100%, -50%)",
          }}
          className="whitespace-nowrap"
        >
          <span className="font-serif text-[0.9rem] italic lowercase text-green">
            your target — {city.name}
          </span>
        </div>
      </div>
    </Marker>
  );
}

// ---- alternate pin (0-8) ---------------------------------------------------
// smaller, ranked. selected gains halo + r=10.
function AlternatePin({
  city,
  rank,
  selected,
  onClick,
}: {
  city: CityRecord;
  rank: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Marker
      longitude={city.lng}
      latitude={city.lat}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div className="cursor-pointer" aria-label={`alternate ${rank} — ${city.name}`}>
        <svg
          width={32}
          height={32}
          viewBox="-16 -16 32 32"
          style={{ overflow: "visible", display: "block" }}
        >
          {selected ? <circle r={15} fill="#1F4D3A" fillOpacity={0.25} /> : null}
          <circle r={selected ? 12 : 10} fill="#FAF8F4" />
          <circle r={selected ? 10 : 8} fill="#1F4D3A" />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dy=".35em"
            fontFamily="var(--font-mono)"
            fontSize={selected ? 9 : 8}
            fontWeight={500}
            fill="#FAF8F4"
          >
            {rank}
          </text>
        </svg>
      </div>
    </Marker>
  );
}

function AlternateLabel({
  city,
  rank,
  total,
  rowIndex,
}: {
  city: CityRecord;
  rank: number;
  total: number | null;
  rowIndex: number;
}) {
  const side = labelSide(city.lng);
  const offsetX = side === "right" ? LABEL_OFFSET_X : -LABEL_OFFSET_X;
  const offsetY = (rowIndex % 2 === 0 ? -1 : 1) * LABEL_OFFSET_Y;
  return (
    <Marker longitude={city.lng} latitude={city.lat} anchor="center">
      <div
        className="pointer-events-none"
        style={{ position: "relative", width: 0, height: 0 }}
      >
        <svg
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            overflow: "visible",
          }}
        >
          <line
            x1={0}
            y1={0}
            x2={offsetX}
            y2={offsetY}
            stroke="#D8D2C8"
            strokeOpacity={0.7}
            strokeWidth={1}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: `${offsetX}px`,
            top: `${offsetY}px`,
            transform:
              side === "right" ? "translate(0, -50%)" : "translate(-100%, -50%)",
          }}
          className="whitespace-nowrap"
        >
          <span className="font-serif text-[0.85rem] italic lowercase text-ink">
            {rank} · {city.name}
          </span>
          <span className="ml-2 font-mono text-[0.7rem] text-muted">
            · {total ?? "—"}
          </span>
        </div>
      </div>
    </Marker>
  );
}

export function AtlasMap() {
  const target = useAtlasStore((s) => s.target);
  const alternates = useAtlasStore((s) => s.alternates);
  const weights = useAtlasStore((s) => s.weights);
  const selectedAlternateId = useAtlasStore((s) => s.selectedAlternateId);
  const setSelectedAlternateId = useAtlasStore((s) => s.setSelectedAlternateId);
  const simInputs = useSimStore((s) => s.inputs);

  const mapRef = useRef<MapRef | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mapReady, setMapReady] = useState(false);
  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) applyAtlasPalette(map);
    setMapReady(true);
  }, []);

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

  useFitToAtlas(mapRef, target, alternates, mapReady);

  // score alternates once for label totals — same ctx the engine used.
  const alternateScores = useMemo(() => {
    const ctx = contextFrom(simInputs, weights);
    return alternates.map((c) => scoreCity(c, ctx));
  }, [alternates, simInputs, weights]);

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
          {target ? (
            <Fragment>
              <TargetLabel city={target} />
              <TargetPin
                city={target}
                onClick={() => setSelectedAlternateId(null)}
              />
            </Fragment>
          ) : null}
          {alternates.map((city, i) => {
            const rank = i + 1;
            const score = alternateScores[i];
            const selected = city.id === selectedAlternateId;
            return (
              <Fragment key={city.id}>
                <AlternateLabel
                  city={city}
                  rank={rank}
                  total={score?.total ?? null}
                  rowIndex={i}
                />
                <AlternatePin
                  city={city}
                  rank={rank}
                  selected={selected}
                  onClick={() => setSelectedAlternateId(city.id)}
                />
              </Fragment>
            );
          })}
        </Map>
      ) : null}
    </div>
  );
}
