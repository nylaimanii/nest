"use client";

import { X } from "lucide-react";

import { AtlasSlider } from "@/components/atlas/AtlasSlider";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { CitySearch } from "@/components/atlas/CitySearch";
import { cn } from "@/lib/utils";
import { useAtlasStore } from "@/store/atlas";
import type { AtlasWeights } from "@/lib/atlas/score";

const WEIGHT_ROWS: { key: keyof AtlasWeights; label: string }[] = [
  { key: "schools", label: "schools" },
  { key: "cost", label: "cost" },
  { key: "safety", label: "safety" },
  { key: "greenSpace", label: "green space" },
  { key: "careerFit", label: "career fit" },
];

export function RosterList() {
  const roster = useAtlasStore((s) => s.roster);
  const scores = useAtlasStore((s) => s.scores);
  const activeCityId = useAtlasStore((s) => s.activeCityId);
  const setActiveCity = useAtlasStore((s) => s.setActiveCity);
  const removeCity = useAtlasStore((s) => s.removeCity);
  const weights = useAtlasStore((s) => s.weights);
  const setWeight = useAtlasStore((s) => s.setWeight);

  return (
    <aside className="flex w-[280px] flex-col gap-6 border-r border-line p-6">
      <CitySearch />

      <div className="flex flex-col gap-3">
        <MonoLabel>COMPARING</MonoLabel>
        <ul className="flex flex-col gap-1">
          {roster.map((c) => {
            const score = scores.find((s) => s.city.id === c.id);
            const active = c.id === activeCityId;
            return (
              <li
                key={c.id}
                className="group flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setActiveCity(c.id)}
                  // every row keeps the same border-width so activate
                  // only swaps the border color — no horizontal shift.
                  className={cn(
                    "flex min-w-0 flex-1 items-baseline justify-between border-l-2 py-1 pl-3 pr-1 text-left",
                    active
                      ? "border-[color:var(--color-green)]"
                      : "border-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "truncate font-serif text-[0.98rem] lowercase transition-colors",
                      active
                        ? "text-ink"
                        : "text-muted group-hover:text-ink",
                    )}
                  >
                    {c.name}
                  </span>
                  <span
                    className={cn(
                      "ml-2 shrink-0 font-mono text-[0.85rem]",
                      active ? "text-ink" : "text-muted",
                    )}
                  >
                    {score?.total ?? "—"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeCity(c.id)}
                  aria-label={`remove ${c.name}`}
                  className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                >
                  <X
                    className="h-3 w-3 text-terracotta"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-5">
        <MonoLabel>WEIGHTS</MonoLabel>
        {WEIGHT_ROWS.map(({ key, label }) => (
          <AtlasSlider
            key={key}
            label={label}
            value={weights[key]}
            min={0}
            max={5}
            step={1}
            onChange={(v) => setWeight(key, v)}
            format={(v) => String(v)}
          />
        ))}
      </div>

      <p className="mt-auto font-serif text-[0.85rem] italic text-muted">
        weights tune the score for what matters to you.
      </p>
    </aside>
  );
}
