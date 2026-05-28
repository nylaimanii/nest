"use client";

import { AtlasCard } from "@/components/atlas/Card";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { Stat } from "@/components/atlas/Stat";
import { cn } from "@/lib/utils";
import { useAtlasStore } from "@/store/atlas";
import { useSimStore } from "@/store/sim";

const DASH = "— v1 dataset";

const asInt = (n: number | null) => (n === null ? DASH : String(n));
const asUsd = (n: number | null) =>
  n === null ? DASH : `$${n.toLocaleString("en-US")}`;
const asPct = (n: number | null) => (n === null ? DASH : `${n}%`);

function splitNameForState(name: string): { city: string; state: string } {
  const [cityPart, statePart] = name.split(",").map((s) => s.trim());
  return { city: cityPart ?? name, state: (statePart ?? "").toUpperCase() };
}

export function CityHonestPanel() {
  const activeCityId = useAtlasStore((s) => s.activeCityId);
  const scores = useAtlasStore((s) => s.scores);
  const income = useSimStore((s) => s.inputs.householdIncome);

  const score = scores.find((s) => s.city.id === activeCityId);
  if (!score) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8">
        <p className="font-serif italic text-muted">
          select a city from the roster to see its honest panel.
        </p>
      </div>
    );
  }

  const c = score.city;
  const { city, state } = splitNameForState(c.name);
  const stateLine = state
    ? `${city.toUpperCase()} · ${state}`
    : city.toUpperCase();

  const totalIsNull = score.total === null;
  const totalTone: "green" | "terracotta" | "ink" = totalIsNull
    ? "ink"
    : score.total! >= 70
      ? "green"
      : score.total! <= 40
        ? "terracotta"
        : "ink";

  const takeHomePct = c.takeHomeAfterChildcarePct
    ? c.takeHomeAfterChildcarePct(income)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-7 p-8">
      <header className="flex flex-col gap-1">
        <h2 className="font-serif text-[2.4rem] leading-tight lowercase text-ink">
          {city}
        </h2>
        <MonoLabel tone="muted">{stateLine}</MonoLabel>
      </header>

      <div className="flex flex-col gap-2">
        <MonoLabel tone="muted">TOTAL SCORE</MonoLabel>
        <span
          className={cn(
            "font-mono text-[3.5rem] leading-none",
            totalTone === "green"
              ? "text-green"
              : totalTone === "terracotta"
                ? "text-terracotta"
                : "text-ink",
          )}
        >
          {totalIsNull ? "—" : score.total}
        </span>
      </div>

      <p className="max-w-[36ch] font-serif italic leading-relaxed text-ink">
        {score.honestTradeoff}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <AtlasCard>
          <Stat label="COST OF LIVING" value={asInt(c.costOfLiving)} />
        </AtlasCard>
        <AtlasCard>
          <Stat label="MEDIAN RENT 2BR" value={asUsd(c.medianRent2BR)} />
        </AtlasCard>
        <AtlasCard>
          <Stat label="SCHOOL SCORE" value={asInt(c.schoolScore)} />
        </AtlasCard>
        <AtlasCard>
          <Stat label="SAFETY SCORE" value={asInt(c.safetyScore)} />
        </AtlasCard>
        <AtlasCard>
          <Stat label="GREEN SPACE" value={asPct(c.greenSpacePct)} />
        </AtlasCard>
        <AtlasCard>
          <Stat label="CHILDCARE / MO" value={asUsd(c.childcareMonthly)} />
        </AtlasCard>
        <AtlasCard className="col-span-2">
          <Stat
            label="TAKE-HOME AFTER CHILDCARE"
            value={asPct(takeHomePct)}
          />
        </AtlasCard>
      </div>

      <p className="font-serif italic text-muted">
        scores are v1 illustrative — sourced atlas lands later.
      </p>
    </div>
  );
}
