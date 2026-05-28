"use client";

import { Marker } from "react-map-gl/maplibre";

import { MonoLabel } from "@/components/atlas/MonoLabel";
import type { CityRecord } from "@/lib/atlas/cities";
import type { CityScore } from "@/lib/atlas/score";

interface FieldGuideCardProps {
  city: CityRecord;
  /** 1-indexed roster position. */
  index: number;
  score: CityScore | undefined;
}

// upper-side card anchored ~80px off the active pin on the inward side.
// inward heuristic mirrors LeaderLabel so they consistently stay on-map.
const PIVOT_LNG = -96.5;
const CARD_OFFSET_X = 80;
const CARD_OFFSET_Y = -60;
const CARD_WIDTH = 220;

function splitNameForState(name: string): { city: string; state: string } {
  const [cityPart, statePart] = name.split(",").map((s) => s.trim());
  return { city: cityPart ?? name, state: (statePart ?? "").toUpperCase() };
}

export function FieldGuideCard({
  city,
  index,
  score,
}: FieldGuideCardProps) {
  const side: "right" | "left" = city.lng < PIVOT_LNG ? "right" : "left";
  const offsetX = side === "right" ? CARD_OFFSET_X : -CARD_OFFSET_X;
  const offsetY = CARD_OFFSET_Y;

  // near corner of the card — pin-side bottom corner where the leader meets.
  const nearX = side === "right" ? offsetX : offsetX;
  const nearY = offsetY + 0; // leader meets the top edge near the inside corner

  const { city: cityShort, state } = splitNameForState(city.name);
  const stateLine = state
    ? `${(index + 1).toString().padStart(2, "0")}. ${cityShort.toUpperCase()} · ${state}`
    : `${(index + 1).toString().padStart(2, "0")}. ${cityShort.toUpperCase()}`;
  const tradeoff = score?.honestTradeoff ?? "—";

  return (
    <Marker longitude={city.lng} latitude={city.lat} anchor="center">
      <div
        className="pointer-events-none"
        style={{ position: "relative", width: 0, height: 0, zIndex: 10 }}
      >
        {/* leader line from pin (0,0) to near-corner of card, 1px deep-green */}
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
            x2={nearX}
            y2={nearY}
            stroke="#1F4D3A"
            strokeOpacity={0.7}
            strokeWidth={1}
          />
        </svg>

        {/* the card */}
        <div
          style={{
            position: "absolute",
            left: `${offsetX}px`,
            top: `${offsetY}px`,
            width: `${CARD_WIDTH}px`,
            transform:
              side === "right" ? "translate(0, 0)" : "translate(-100%, 0)",
          }}
          className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4"
        >
          <MonoLabel tone="muted">{stateLine}</MonoLabel>
          <p className="font-serif text-[1.05rem] italic lowercase text-ink">
            {city.name}
          </p>
          <p
            className="font-serif text-[0.8rem] italic text-muted"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {tradeoff}
          </p>
        </div>
      </div>
    </Marker>
  );
}
