"use client";

import { useEffect, useState } from "react";

import { AtlasDial } from "@/components/atlas/AtlasDial";
import { AtlasTextInput } from "@/components/atlas/AtlasTextInput";
import { AtlasTypeahead } from "@/components/atlas/AtlasTypeahead";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { CITIES } from "@/lib/atlas/cities";
import { RANGES } from "@/lib/sim/defaults";
import { findOccupation, OCCUPATION_LABELS } from "@/lib/sim/fields";
import { useSimStore } from "@/store/sim";

const CITY_SUGGESTIONS: readonly string[] = CITIES.map((c) => c.name);

export function InputPanel() {
  const inputs = useSimStore((s) => s.inputs);
  const setInput = useSimStore((s) => s.setInput);

  // local buffer for the field typeahead so the user can keep typing without
  // the store snapping to the partial string mid-keystroke. every keystroke
  // writes through; the buffer is used purely to drive the unsourced hint.
  const [fieldBuffer, setFieldBuffer] = useState<string>(inputs.field);
  const [fieldUnsourced, setFieldUnsourced] = useState<boolean>(
    inputs.field !== "" && findOccupation(inputs.field) === null,
  );

  // brief debounce — avoids flashing "estimate · v1" while the user is
  // mid-word (typing "softw" on the way to "software developer").
  useEffect(() => {
    const t = setTimeout(() => {
      setFieldUnsourced(
        fieldBuffer !== "" && findOccupation(fieldBuffer) === null,
      );
    }, 400);
    return () => clearTimeout(t);
  }, [fieldBuffer]);

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

        <AtlasDial
          label="WORK INTENSITY"
          value={inputs.workIntensity}
          onChange={(v) => setInput("workIntensity", v)}
          min={RANGES.workIntensity.min}
          max={RANGES.workIntensity.max}
          step={RANGES.workIntensity.step}
          format={(v) => `${v} hrs/week`}
          leftAnchor="STEADY"
          rightAnchor="INTENSE"
        />

        <AtlasTypeahead
          label="FIELD"
          value={fieldBuffer}
          onChange={(s) => {
            setFieldBuffer(s);
            setInput("field", s);
          }}
          suggestions={OCCUPATION_LABELS}
          hint={
            fieldUnsourced
              ? "estimate · v1 — using defaults for income growth and stability."
              : undefined
          }
        />
      </div>
    </div>
  );
}
