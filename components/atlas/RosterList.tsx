"use client";

import { X } from "lucide-react";

import { AtlasImportance } from "@/components/atlas/AtlasImportance";
import { CitySearch } from "@/components/atlas/CitySearch";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { cn } from "@/lib/utils";
import { useAtlasStore } from "@/store/atlas";
import { useSimStore } from "@/store/sim";
import type { AtlasWeights } from "@/lib/atlas/score";

interface WeightRow {
  key: keyof AtlasWeights;
  label: string;
}

const KID_ROWS: WeightRow[] = [
  { key: "schools", label: "schools" },
  { key: "safety", label: "safety" },
  { key: "greenSpace", label: "green space" },
  { key: "communitySize", label: "community size" },
];

const FAMILY_ROWS: WeightRow[] = [
  { key: "cost", label: "cost of living" },
  { key: "rentBurden", label: "rent burden" },
  { key: "childcareCost", label: "childcare cost" },
  { key: "weather", label: "weather" },
];

const YOU_ROWS: WeightRow[] = [
  { key: "careerFit", label: "career fit" },
];

const PARTNER_CAREER_ROW: WeightRow = {
  key: "partnerCareer",
  label: "partner career",
};

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted">
      {children}
    </div>
  );
}

export function RosterList() {
  const roster = useAtlasStore((s) => s.roster);
  const scores = useAtlasStore((s) => s.scores);
  const activeCityId = useAtlasStore((s) => s.activeCityId);
  const setActiveCity = useAtlasStore((s) => s.setActiveCity);
  const removeCity = useAtlasStore((s) => s.removeCity);
  // draftWeights drive the UI; the committed `weights` only matter to
  // scoreCity, which runs on RECOMPUTE.
  const draftWeights = useAtlasStore((s) => s.draftWeights);
  const setDraftWeight = useAtlasStore((s) => s.setDraftWeight);
  // PARTNER CAREER appears only when the user actually has a partner — read
  // from committed inputs so toggling partner on /simulation requires a
  // recompute to reveal the weight row (consistent with the rest of the UI).
  const hasPartner = useSimStore((s) => s.inputs.partnerAge !== null);

  const youRows = hasPartner ? [...YOU_ROWS, PARTNER_CAREER_ROW] : YOU_ROWS;

  return (
    <aside className="flex max-h-[calc(100vh-200px)] w-[280px] flex-col gap-6 overflow-y-auto border-r border-line p-6">
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

      <div className="flex flex-col gap-3">
        <MonoLabel>WHAT MATTERS TO YOU</MonoLabel>

        <SubHeading>FOR THE KID</SubHeading>
        <div className="flex flex-col gap-4">
          {KID_ROWS.map(({ key, label }) => (
            <AtlasImportance
              key={key}
              label={label}
              value={draftWeights[key]}
              onChange={(v) => setDraftWeight(key, v)}
            />
          ))}
        </div>

        <SubHeading>FOR THE FAMILY</SubHeading>
        <div className="flex flex-col gap-4">
          {FAMILY_ROWS.map(({ key, label }) => (
            <AtlasImportance
              key={key}
              label={label}
              value={draftWeights[key]}
              onChange={(v) => setDraftWeight(key, v)}
            />
          ))}
        </div>

        <SubHeading>FOR YOU</SubHeading>
        <div className="flex flex-col gap-4">
          {youRows.map(({ key, label }) => (
            <AtlasImportance
              key={key}
              label={label}
              value={draftWeights[key]}
              onChange={(v) => setDraftWeight(key, v)}
            />
          ))}
        </div>
      </div>

      <p className="mt-auto font-serif text-[0.85rem] italic text-muted">
        what matters to you tunes the match for each city.
      </p>
    </aside>
  );
}
