"use client";

import { useState } from "react";

import { AtlasTextInput } from "@/components/atlas/AtlasTextInput";
import { AtlasTypeahead } from "@/components/atlas/AtlasTypeahead";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { CITIES } from "@/lib/atlas/cities";
import { RANGES } from "@/lib/sim/defaults";
import { useSimStore } from "@/store/sim";
import type { SimInputs } from "@/types";

const CITY_SUGGESTIONS: readonly string[] = CITIES.map((c) => c.name);

const CAREER_OPTIONS: ReadonlyArray<SimInputs["careerTrack"]> = [
  "steady",
  "ascending",
  "demanding",
];

const FIELD_OPTIONS: ReadonlyArray<SimInputs["field"]> = [
  "tech",
  "finance",
  "biotech",
  "government",
  "manufacturing",
  "healthcare",
  "creative",
];

function isCareerTrack(s: string): s is SimInputs["careerTrack"] {
  return (CAREER_OPTIONS as readonly string[]).includes(s);
}
function isField(s: string): s is SimInputs["field"] {
  return (FIELD_OPTIONS as readonly string[]).includes(s);
}

export function InputPanel() {
  const inputs = useSimStore((s) => s.inputs);
  const setInput = useSimStore((s) => s.setInput);

  // local buffers for typeahead fields whose committed store value is a
  // strict enum — we keep the raw typed string here and only write through
  // when it matches a valid option. lets the user type "tec" and see
  // suggestions without dropping the careerTrack/field state.
  const [careerBuffer, setCareerBuffer] = useState<string>(inputs.careerTrack);
  const [fieldBuffer, setFieldBuffer] = useState<string>(inputs.field);

  const careerValid = isCareerTrack(careerBuffer);
  const fieldValid = isField(fieldBuffer);

  // startAge can reach the lower of the model floor (24) and userAge so the
  // high-fertility band stays reachable from the slider.
  const startAgeMin = Math.min(RANGES.startAge.min, inputs.userAge);

  return (
    <div className="flex max-w-[360px] flex-col gap-10 border-r border-line p-8">
      {/* ───────────── section 1: what you want ───────────── */}
      <div className="flex flex-col gap-5">
        <MonoLabel>WHAT YOU WANT</MonoLabel>

        <AtlasTextInput
          label="KIDS WANTED"
          value={inputs.kidsWanted}
          onChange={(s) => {
            if (s === "" || s === "-") return;
            const n = Number(s);
            if (!Number.isFinite(n)) return;
            // floor + clamp >=0 so non-integers settle to a clean int and
            // negatives can't sneak through mid-typing. no upper cap.
            setInput("kidsWanted", Math.max(0, Math.floor(n)));
          }}
          type="number"
          min={0}
          step={1}
        />

        <AtlasTextInput
          label="START AT AGE"
          value={inputs.startAge}
          onChange={(s) => {
            if (s === "" || s === "-") return;
            const n = Number(s);
            if (!Number.isFinite(n)) return;
            setInput("startAge", Math.round(n));
          }}
          type="number"
          min={startAgeMin}
          max={RANGES.startAge.max}
          step={1}
        />

        <AtlasTextInput
          label="HOUSEHOLD INCOME"
          value={inputs.householdIncome}
          onChange={(s) => {
            if (s === "" || s === "-") return;
            const n = Number(s);
            if (!Number.isFinite(n)) return;
            // accept any positive integer; no upper cap so users can model
            // their real income, not a slider-bound proxy.
            setInput("householdIncome", Math.max(0, Math.round(n)));
          }}
          type="number"
          format="currency"
          min={0}
          step={1}
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

        <AtlasTypeahead
          label="CITY"
          value={inputs.city}
          onChange={(s) => setInput("city", s)}
          suggestions={CITY_SUGGESTIONS}
          placeholder="new york, ny"
          panelFooter="any city worldwide works — sourced data shown for US metros above."
        />

        <AtlasTypeahead
          label="CAREER"
          value={careerBuffer}
          onChange={(s) => {
            setCareerBuffer(s);
            if (isCareerTrack(s)) setInput("careerTrack", s);
          }}
          suggestions={CAREER_OPTIONS}
          hint={
            careerValid || careerBuffer === ""
              ? undefined
              : `press one of: ${CAREER_OPTIONS.join(", ")}`
          }
        />

        <AtlasTypeahead
          label="FIELD"
          value={fieldBuffer}
          onChange={(s) => {
            setFieldBuffer(s);
            if (isField(s)) setInput("field", s);
          }}
          suggestions={FIELD_OPTIONS}
          hint={
            fieldValid || fieldBuffer === ""
              ? undefined
              : `press one of: ${FIELD_OPTIONS.join(", ")}`
          }
        />
      </div>
    </div>
  );
}
