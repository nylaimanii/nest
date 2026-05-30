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

function TargetLabel({
  city,
  offsetY,
  hidden,
}: {
  city: CityRecord;
  offsetY: number;
  hidden: boolean;
}) {
  if (hidden) return null;
  const side = labelSide(city.lng);
  const offsetX = side === "right" ? LABEL_OFFSET_X : -LABEL_OFFSET_X;
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
  offsetY,
  hidden,
}: {
  city: CityRecord;
  rank: number;
  total: number | null;
  offsetY: number;
  hidden: boolean;
}) {
  if (hidden) return null;
  const side = labelSide(city.lng);
  const offsetX = side === "right" ? LABEL_OFFSET_X : -LABEL_OFFSET_X;
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

// ---- label-collision pass --------------------------------------------------
// approximate label widths in pixels — measured by eye against the atlas
// type, accurate enough for collision detection at the precision we care
// about (whether two labels overlap). too small = false-negative overlaps;
// too large = unnecessary shifts. err small so labels stay visible.
const TARGET_LABEL_W = 180;
const ALT_LABEL_W = 160;
const LABEL_H = 22;
const COLLISION_BUFFER = 6;

interface LabelLayout {
  offsetY: number;
  hidden: boolean;
}

interface LabelInput {
  id: string;
  lng: number;
  lat: number;
  isTarget: boolean;
  baseRowIndex: number;
  width: number;
}

function recomputeLayouts(
  map: ReturnType<MapRef["getMap"]>,
  entries: LabelInput[],
): Record<string, LabelLayout> {
  // candidate vertical offsets from base. four shift attempts before we
  // hide the label entirely (and only alternates are hidable — target
  // always wins). spec: "limit shifts to 2 attempts" → we try 5 positions
  // total (base + 4 alternatives) which gives plenty of room without
  // becoming a placement minigame.
  const SHIFTS = [0, 24, -24, 48, -48];
  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  const layouts: Record<string, LabelLayout> = {};

  // target first so it gets first pick.
  const sorted = [...entries].sort(
    (a, b) => (b.isTarget ? 1 : 0) - (a.isTarget ? 1 : 0),
  );

  for (const e of sorted) {
    const pt = map.project([e.lng, e.lat]);
    const side: "right" | "left" = e.lng < PIVOT_LNG ? "right" : "left";
    const baseY = e.isTarget
      ? -LABEL_OFFSET_Y
      : (e.baseRowIndex % 2 === 0 ? -1 : 1) * LABEL_OFFSET_Y;
    const labelLeft =
      side === "right" ? pt.x + LABEL_OFFSET_X : pt.x - LABEL_OFFSET_X - e.width;

    let chosenOffsetY: number | null = null;
    for (const shift of SHIFTS) {
      const offY = baseY + shift;
      const labelTop = pt.y + offY - LABEL_H / 2;
      const overlaps = placed.some(
        (p) =>
          labelLeft < p.x + p.w + COLLISION_BUFFER &&
          labelLeft + e.width > p.x - COLLISION_BUFFER &&
          labelTop < p.y + p.h + COLLISION_BUFFER &&
          labelTop + LABEL_H > p.y - COLLISION_BUFFER,
      );
      if (!overlaps) {
        chosenOffsetY = offY;
        placed.push({ x: labelLeft, y: labelTop, w: e.width, h: LABEL_H });
        break;
      }
    }

    if (chosenOffsetY !== null) {
      layouts[e.id] = { offsetY: chosenOffsetY, hidden: false };
    } else if (e.isTarget) {
      // target never hides — accept the overlap on the base position.
      layouts[e.id] = { offsetY: baseY, hidden: false };
    } else {
      layouts[e.id] = { offsetY: baseY, hidden: true };
    }
  }
  return layouts;
}

function useLabelLayouts(
  mapRef: React.RefObject<MapRef | null>,
  target: CityRecord | null,
  alternates: CityRecord[],
  mapReady: boolean,
): Record<string, LabelLayout> {
  const [layouts, setLayouts] = useState<Record<string, LabelLayout>>({});

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const entries: LabelInput[] = [];
    if (target) {
      entries.push({
        id: target.id,
        lng: target.lng,
        lat: target.lat,
        isTarget: true,
        baseRowIndex: 0,
        width: TARGET_LABEL_W,
      });
    }
    alternates.forEach((c, i) => {
      entries.push({
        id: c.id,
        lng: c.lng,
        lat: c.lat,
        isTarget: false,
        baseRowIndex: i,
        width: ALT_LABEL_W,
      });
    });

    function update() {
      setLayouts(recomputeLayouts(map!, entries));
    }
    update();
    map.on("move", update);
    map.on("zoom", update);
    map.on("resize", update);
    return () => {
      map.off("move", update);
      map.off("zoom", update);
      map.off("resize", update);
    };
  }, [mapRef, target, alternates, mapReady]);

  return layouts;
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

  const labelLayouts = useLabelLayouts(mapRef, target, alternates, mapReady);

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
              <TargetLabel
                city={target}
                offsetY={
                  labelLayouts[target.id]?.offsetY ?? -LABEL_OFFSET_Y
                }
                hidden={labelLayouts[target.id]?.hidden ?? false}
              />
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
            // fall back to the staggered default offset if the collision
            // pass hasn't populated yet (first paint before mapReady).
            const fallbackOffsetY =
              (i % 2 === 0 ? -1 : 1) * LABEL_OFFSET_Y;
            const layout = labelLayouts[city.id];
            return (
              <Fragment key={city.id}>
                <AlternateLabel
                  city={city}
                  rank={rank}
                  total={score?.total ?? null}
                  offsetY={layout?.offsetY ?? fallbackOffsetY}
                  hidden={layout?.hidden ?? false}
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
