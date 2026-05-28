"use client";

import { AtlasSlider } from "@/components/atlas/AtlasSlider";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { RANGES } from "@/lib/sim/defaults";
import { useSimStore } from "@/store/sim";

export function InputPanel() {
  const inputs = useSimStore((s) => s.inputs);
  const setInput = useSimStore((s) => s.setInput);

  // startAge reaches the lower of the model floor (24) and userAge, so the
  // high-fertility band stays reachable from the slider. (The marker math
  // in FertilityCurve already clamps to the curve's [24,42] domain.)
  const startAgeMin = Math.min(RANGES.startAge.min, inputs.userAge);

  return (
    <div className="flex max-w-[360px] flex-col gap-8 border-r border-line p-8">
      <div className="flex flex-col gap-7">
        <AtlasSlider
          label="kids wanted"
          value={inputs.kidsWanted}
          min={RANGES.kidsWanted.min}
          max={RANGES.kidsWanted.max}
          step={RANGES.kidsWanted.step}
          onChange={(v) => setInput("kidsWanted", v)}
          format={(v) => String(v)}
        />
        <AtlasSlider
          label="start at age"
          value={inputs.startAge}
          min={startAgeMin}
          max={RANGES.startAge.max}
          step={RANGES.startAge.step}
          onChange={(v) => setInput("startAge", v)}
          format={(v) => `age ${v}`}
        />
        <AtlasSlider
          label="household income"
          value={inputs.householdIncome}
          min={RANGES.householdIncome.min}
          max={RANGES.householdIncome.max}
          step={RANGES.householdIncome.step}
          onChange={(v) => setInput("householdIncome", v)}
          format={(v) => `$${v.toLocaleString("en-US")}`}
        />
      </div>

      <div className="flex flex-col gap-3">
        <MonoLabel>FIXED</MonoLabel>
        <dl className="flex flex-col gap-2 font-mono text-[0.75rem] leading-tight">
          <FixedRow term="USER AGE" value={String(inputs.userAge)} />
          <FixedRow term="PARTNER" value={inputs.partnerAge?.toString() ?? "—"} />
          <FixedRow term="CITY" value={inputs.city} />
          <FixedRow term="CAREER" value={inputs.careerTrack} />
        </dl>
      </div>
    </div>
  );
}

function FixedRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-[5.5rem] text-muted">{term}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
