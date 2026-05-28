"use client";

import { Marker } from "react-map-gl/maplibre";

import type { CityRecord } from "@/lib/atlas/cities";
import type { CityScore } from "@/lib/atlas/score";
import { cn } from "@/lib/utils";

interface LeaderLabelProps {
  city: CityRecord;
  index: number;
  score: CityScore | undefined;
  active: boolean;
}

// "inward" side heuristic — labels sit toward the map center, so they don't
// run off the canvas edge for coastal pins. step's literal "lng<-100 →
// LEFT, else RIGHT" pushes labels outward which clips east-coast labels in
// the default view; flagged in the report.
const PIVOT_LNG = -96.5;
const OFFSET_X_MAG = 44;
const OFFSET_Y_MAG = 14;

const CONFIDENCE_COLOR = {
  high: "#1F4D3A",
  partial: "#1A1A17",
  unknown: "#9C3B2E",
} as const;

export function LeaderLabel({ city, index, score, active }: LeaderLabelProps) {
  const side: "right" | "left" = city.lng < PIVOT_LNG ? "right" : "left";
  const offsetX = side === "right" ? OFFSET_X_MAG : -OFFSET_X_MAG;
  // stagger vertically by row parity to reduce overlap when pins cluster.
  const offsetY = (index % 2 === 0 ? -1 : 1) * OFFSET_Y_MAG;

  const scoreLabel = score?.total !== undefined && score?.total !== null
    ? String(score.total)
    : "—";
  const confidence = score?.confidence ?? "unknown";
  const dotColor = CONFIDENCE_COLOR[confidence];

  return (
    <Marker longitude={city.lng} latitude={city.lat} anchor="center">
      <div
        className="pointer-events-none"
        style={{ position: "relative", width: 0, height: 0 }}
      >
        {/* leader line — 1px from pin (0,0) to label anchor */}
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
            stroke={active ? "#1F4D3A" : "#D8D2C8"}
            strokeOpacity={active ? 0.8 : 0.7}
            strokeWidth={1}
          />
        </svg>

        {/* label — anchored at (offsetX, offsetY) relative to the pin */}
        <div
          style={{
            position: "absolute",
            left: `${offsetX}px`,
            top: `${offsetY}px`,
            transform:
              side === "right"
                ? "translate(0, -50%)"
                : "translate(-100%, -50%)",
          }}
          className={cn(
            "flex flex-col gap-0.5 whitespace-nowrap",
            side === "right" ? "items-start" : "items-end",
          )}
        >
          <span className="font-serif text-[0.85rem] italic lowercase text-ink">
            {city.name}
          </span>
          <div
            className={cn(
              "flex items-center gap-1.5",
              side === "left" ? "flex-row-reverse" : "",
            )}
          >
            <span
              className="block h-1 w-1 rounded-full"
              style={{ backgroundColor: dotColor }}
              aria-hidden="true"
            />
            <span
              className={cn(
                "font-mono text-[0.7rem]",
                active ? "text-ink" : "text-muted",
              )}
            >
              {scoreLabel}
            </span>
          </div>
        </div>
      </div>
    </Marker>
  );
}
