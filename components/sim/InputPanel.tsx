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

// when "add partner →" is clicked we seed sensible defaults so the recompute
// shows the two-earner shape immediately. these mirror DEFAULT_INPUTS so a
// user toggling partner on/off lands somewhere realistic, not zeroed.
const PARTNER_SEED = {
  income: 80000,
  workIntensity: 45,
  field: "registered nurse",
} as const;

export function InputPanel() {
  // read DRAFT inputs — what the user is typing, not what the math is
  // currently running against. setDraftInput updates this only; clicking
  // RECOMPUTE in the page header commits + runs the engine.
  const draft = useSimStore((s) => s.draftInputs);
  const setDraftInput = useSimStore((s) => s.setDraftInput);

  // local buffer for the field typeahead so the user can keep typing without
  // the store snapping to the partial string mid-keystroke. every keystroke
  // writes through; the buffer is used purely to drive the unsourced hint.
  const [fieldBuffer, setFieldBuffer] = useState<string>(draft.field);
  const [fieldUnsourced, setFieldUnsourced] = useState<boolean>(
    draft.field !== "" && findOccupation(draft.field) === null,
  );
  useEffect(() => {
    const t = setTimeout(() => {
      setFieldUnsourced(
        fieldBuffer !== "" && findOccupation(fieldBuffer) === null,
      );
    }, 400);
    return () => clearTimeout(t);
  }, [fieldBuffer]);

  // partner field buffer + unsourced hint, same pattern as the user side.
  const partnerFieldValue = draft.partnerField ?? "";
  const [partnerFieldBuffer, setPartnerFieldBuffer] = useState<string>(
    partnerFieldValue,
  );
  const [partnerFieldUnsourced, setPartnerFieldUnsourced] = useState<boolean>(
    partnerFieldValue !== "" && findOccupation(partnerFieldValue) === null,
  );
  useEffect(() => {
    const t = setTimeout(() => {
      setPartnerFieldUnsourced(
        partnerFieldBuffer !== "" &&
          findOccupation(partnerFieldBuffer) === null,
      );
    }, 400);
    return () => clearTimeout(t);
  }, [partnerFieldBuffer]);

  // when the draft.partnerField changes via outside paths (scenario load
  // etc), keep the local buffer in sync.
  useEffect(() => {
    setPartnerFieldBuffer(draft.partnerField ?? "");
  }, [draft.partnerField]);

  // startAge can reach the lower of the model floor and userAge so the
  // high-fertility band stays reachable from the slider.
  const startAgeMin = Math.min(RANGES.startAge.min, draft.userAge);

  const hasPartner = draft.partnerAge !== null;

  function addPartner() {
    // partner age + the three job fields all light up together. recompute
    // is still required for the math to update.
    setDraftInput(
      "partnerAge",
      Math.min(RANGES.partnerAge.max, draft.userAge + 1),
    );
    setDraftInput("partnerIncome", PARTNER_SEED.income);
    setDraftInput("partnerWorkIntensity", PARTNER_SEED.workIntensity);
    setDraftInput("partnerField", PARTNER_SEED.field);
  }

  function removePartner() {
    setDraftInput("partnerAge", null);
    setDraftInput("partnerIncome", null);
    setDraftInput("partnerWorkIntensity", null);
    setDraftInput("partnerField", null);
  }

  return (
    <div className="flex max-w-[360px] flex-col gap-10 border-r border-line p-8">
      {/* ───────────── section 1: what you want ───────────── */}
      <div className="flex flex-col gap-5">
        <MonoLabel>WHAT YOU WANT</MonoLabel>

        <AtlasTextInput
          label="KIDS WANTED"
          value={draft.kidsWanted}
          onChange={(s) => {
            if (s === "" || s === "-") return;
            const n = Number(s);
            if (!Number.isFinite(n)) return;
            setDraftInput("kidsWanted", Math.max(0, Math.floor(n)));
          }}
          type="number"
          min={0}
          step={1}
        />

        <AtlasTextInput
          label="START AT AGE"
          value={draft.startAge}
          onChange={(s) => {
            if (s === "" || s === "-") return;
            const n = Number(s);
            if (!Number.isFinite(n)) return;
            setDraftInput("startAge", Math.round(n));
          }}
          type="number"
          min={startAgeMin}
          max={RANGES.startAge.max}
          step={1}
        />

        <AtlasTextInput
          label="USER INCOME"
          value={draft.householdIncome}
          onChange={(s) => {
            if (s === "" || s === "-") return;
            const n = Number(s);
            if (!Number.isFinite(n)) return;
            setDraftInput("householdIncome", Math.max(0, Math.round(n)));
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
          value={draft.userAge}
          onChange={(s) => {
            if (s === "") return;
            const n = Number(s);
            if (Number.isFinite(n)) setDraftInput("userAge", n);
          }}
          type="number"
          min={RANGES.userAge.min}
          max={RANGES.userAge.max}
        />

        <AtlasDial
          label="USER WORK INTENSITY"
          value={draft.workIntensity}
          onChange={(v) => setDraftInput("workIntensity", v)}
          min={RANGES.workIntensity.min}
          max={RANGES.workIntensity.max}
          step={RANGES.workIntensity.step}
          format={(v) => `${v} hrs/week`}
          leftAnchor="STEADY"
          rightAnchor="INTENSE"
        />

        <AtlasTypeahead
          label="USER FIELD"
          value={fieldBuffer}
          onChange={(s) => {
            setFieldBuffer(s);
            setDraftInput("field", s);
          }}
          suggestions={OCCUPATION_LABELS}
          hint={
            fieldUnsourced
              ? "estimate · v1 — using defaults for income growth and stability."
              : undefined
          }
        />

        {hasPartner ? (
          <AtlasTextInput
            label="PARTNER AGE"
            value={draft.partnerAge ?? ""}
            onChange={(s) => {
              if (s === "") {
                removePartner();
                return;
              }
              const n = Number(s);
              if (Number.isFinite(n)) setDraftInput("partnerAge", n);
            }}
            type="number"
            min={RANGES.partnerAge.min}
            max={RANGES.partnerAge.max}
            rightSlot={
              <button
                type="button"
                onClick={removePartner}
                className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
              >
                no partner →
              </button>
            }
          />
        ) : (
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
                onClick={addPartner}
                className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
              >
                add partner →
              </button>
            }
          />
        )}

        {hasPartner ? (
          <>
            <AtlasTextInput
              label="PARTNER INCOME"
              value={draft.partnerIncome ?? 0}
              onChange={(s) => {
                if (s === "" || s === "-") return;
                const n = Number(s);
                if (!Number.isFinite(n)) return;
                setDraftInput("partnerIncome", Math.max(0, Math.round(n)));
              }}
              type="number"
              format="currency"
              min={0}
              step={1}
            />

            <AtlasDial
              label="PARTNER WORK INTENSITY"
              value={
                draft.partnerWorkIntensity ?? PARTNER_SEED.workIntensity
              }
              onChange={(v) => setDraftInput("partnerWorkIntensity", v)}
              min={RANGES.workIntensity.min}
              max={RANGES.workIntensity.max}
              step={RANGES.workIntensity.step}
              format={(v) => `${v} hrs/week`}
              leftAnchor="STEADY"
              rightAnchor="INTENSE"
            />

            <AtlasTypeahead
              label="PARTNER FIELD"
              value={partnerFieldBuffer}
              onChange={(s) => {
                setPartnerFieldBuffer(s);
                setDraftInput("partnerField", s);
              }}
              suggestions={OCCUPATION_LABELS}
              hint={
                partnerFieldUnsourced
                  ? "estimate · v1 — using defaults for income growth and stability."
                  : undefined
              }
            />
          </>
        ) : null}

        <AtlasTypeahead
          label="HOUSEHOLD CITY"
          value={draft.city}
          onChange={(s) => setDraftInput("city", s)}
          suggestions={CITY_SUGGESTIONS}
          placeholder="new york, ny"
          panelFooter="any city worldwide — full data for the 20 us metros listed above, climate + country signals for everywhere else."
        />
      </div>
    </div>
  );
}
