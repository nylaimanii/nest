"use client";

import { Marker } from "react-map-gl/maplibre";

import type { CityRecord } from "@/lib/atlas/cities";

interface AtlasPinProps {
  city: CityRecord;
  /** 1-indexed roster position rendered inside the pin. */
  index: number;
  active: boolean;
  onClick: () => void;
}

// fixed 40×40 viewport so active/inactive don't reflow Marker positioning.
// active = larger green core (r=11) + 2px bone ring + 25%-alpha halo.
// inactive = green core (r=7) + 2px bone ring, no halo.
export function AtlasPin({ city, index, active, onClick }: AtlasPinProps) {
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
      <div
        className="cursor-pointer"
        aria-label={`pin ${index + 1} — ${city.name}`}
      >
        <svg
          width={40}
          height={40}
          viewBox="-20 -20 40 40"
          style={{ overflow: "visible", display: "block" }}
        >
          {active ? (
            <circle r={18} fill="#1F4D3A" fillOpacity={0.25} />
          ) : null}
          <circle r={active ? 13 : 9} fill="#FAF8F4" />
          <circle r={active ? 11 : 7} fill="#1F4D3A" />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dy=".35em"
            fontFamily="var(--font-mono)"
            fontSize="9"
            fontWeight={500}
            fill="#FAF8F4"
          >
            {index + 1}
          </text>
        </svg>
      </div>
    </Marker>
  );
}
