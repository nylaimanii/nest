"use client";

import { AtlasSelect } from "@/components/atlas/AtlasSelect";
import { AtlasSlider } from "@/components/atlas/AtlasSlider";
import { AtlasTextInput } from "@/components/atlas/AtlasTextInput";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { RANGES } from "@/lib/sim/defaults";
import { useSimStore } from "@/store/sim";
import type { SimInputs } from "@/types";

const CAREER_OPTIONS: ReadonlyArray<{
  value: SimInputs["careerTrack"];
  label: string;
}> = [
  { value: "steady", label: "steady" },
  { value: "ascending", label: "ascending" },
  { value: "demanding", label: "demanding" },
];

const FIELD_OPTIONS: ReadonlyArray<{
  value: SimInputs["field"];
  label: string;
}> = [
  { value: "tech", label: "tech" },
  { value: "finance", label: "finance" },
  { value: "biotech", label: "biotech" },
  { value: "government", label: "government" },
  { value: "manufacturing", label: "manufacturing" },
  { value: "healthcare", label: "healthcare" },
  { value: "creative", label: "creative" },
];

export function InputPanel() {
  const inputs = useSimStore((s) => s.inputs);
  const setInput = useSimStore((s) => s.setInput);

  // startAge can reach the lower of the model floor (24) and userAge so the
  // high-fertility band stays reachable from the slider.
  const startAgeMin = Math.min(RANGES.startAge.min, inputs.userAge);

  return (
    <div className="flex max-w-[360px] flex-col gap-10 border-r border-line p-8">
      {/* ───────────── section 1: what you want ───────────── */}
      <div className="flex flex-col gap-6">
        <MonoLabel>WHAT YOU WANT</MonoLabel>
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

      {/* ───────────── section 2: your situation ───────────── */}
      <div className="flex flex-col gap-5">
        <MonoLabel>YOUR SITUATION</MonoLabel>

        <AtlasTextInput
          label="USER AGE"
          value={inputs.userAge}
          onChange={(s) => {
            if (s === "") return;
            const n = Number(s);
            if (Number.isFinite(n)) setInput("userAge", n);
          }}
          type="number"
          min={RANGES.userAge.min}
          max={RANGES.userAge.max}
        />

        {inputs.partnerAge === null ? (
          <AtlasTextInput
            label="PARTNER AGE"
            value=""
            onChange={() => {
              /* disabled while in single-mode */
            }}
            type="number"
            placeholder="single"
            disabled
            rightSlot={
              <button
                type="button"
                onClick={() =>
                  setInput(
                    "partnerAge",
                    Math.min(RANGES.partnerAge.max, inputs.userAge + 1),
                  )
                }
                className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
              >
                add partner →
              </button>
            }
          />
        ) : (
          <AtlasTextInput
            label="PARTNER AGE"
            value={inputs.partnerAge}
            onChange={(s) => {
              if (s === "") {
                setInput("partnerAge", null);
                return;
              }
              const n = Number(s);
              if (Number.isFinite(n)) setInput("partnerAge", n);
            }}
            type="number"
            min={RANGES.partnerAge.min}
            max={RANGES.partnerAge.max}
            rightSlot={
              <button
                type="button"
                onClick={() => setInput("partnerAge", null)}
                className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
              >
                no partner →
              </button>
            }
          />
        )}

        <AtlasTextInput
          label="CITY"
          value={inputs.city}
          onChange={(s) => setInput("city", s)}
          type="text"
          placeholder="new york, ny"
        />

        <AtlasSelect
          label="CAREER"
          value={inputs.careerTrack}
          onChange={(v) => setInput("careerTrack", v)}
          options={CAREER_OPTIONS}
        />

        <AtlasSelect
          label="FIELD"
          value={inputs.field}
          onChange={(v) => setInput("field", v)}
          options={FIELD_OPTIONS}
        />
      </div>
    </div>
  );
}
