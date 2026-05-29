"use client";

import { useState } from "react";

import { AtlasDial } from "@/components/atlas/AtlasDial";
import { AtlasTextInput } from "@/components/atlas/AtlasTextInput";
import { AtlasTypeahead } from "@/components/atlas/AtlasTypeahead";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { CITIES } from "@/lib/atlas/cities";
import { RANGES } from "@/lib/sim/defaults";
import { OCCUPATION_LABELS } from "@/lib/sim/fields";
import { useSimStore } from "@/store/sim";
import type { SimInputs } from "@/types";

const CITY_SUGGESTIONS: readonly string[] = CITIES.map((c) => c.name);

// the local form state is deliberately separate from the sim store. nothing
// flows through to useSimStore until the user clicks "begin →", so a closed
// or abandoned modal leaves DEFAULT_INPUTS untouched. numeric fields are
// held as strings so the empty/unset state is representable.
interface FormState {
  userAge: string;
  partnerAge: number | null;
  city: string;
  kidsWanted: string;
  startAge: string;
  income: string;
  workIntensity: number;
  field: string;
  partnerIncome: string;
  partnerWorkIntensity: number;
  partnerField: string;
}

const INITIAL_FORM: FormState = {
  userAge: "",
  partnerAge: 30,
  city: "",
  kidsWanted: "",
  startAge: "",
  income: "",
  workIntensity: 50,
  field: "software developer",
  partnerIncome: "",
  partnerWorkIntensity: 45,
  partnerField: "registered nurse",
};

interface OnboardingModalProps {
  open: boolean;
  /** called when the user clicks "begin →" OR "skip — use demo values".
   *  the parent flips its showOnboarding state false; the localStorage
   *  flag is written from inside the modal so navigation away mid-flow
   *  doesn't accidentally suppress the modal forever. */
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const applyInputs = useSimStore((s) => s.applyInputs);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  if (!open) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const hasPartner = form.partnerAge !== null;

  // canSubmit: 5 core fields filled AND (no partner OR partnerIncome filled).
  // we don't validate the numeric content here — AtlasTextInput already
  // enforces min/max + Number.isFinite on commit.
  const canSubmit =
    form.userAge.trim() !== "" &&
    form.city.trim() !== "" &&
    form.kidsWanted.trim() !== "" &&
    form.startAge.trim() !== "" &&
    form.income.trim() !== "" &&
    (!hasPartner || form.partnerIncome.trim() !== "");

  function markOnboarded() {
    try {
      localStorage.setItem("nest.onboarded", "true");
    } catch {
      // safari private mode + corporate policies can throw; soldier on.
    }
  }

  function skipOnboarding() {
    markOnboarded();
    onClose();
  }

  function beginWithValues() {
    if (!canSubmit) return;

    // build a Partial<SimInputs> from every non-empty field. applyInputs
    // merges with DEFAULT_INPUTS internally, so anything the user left
    // alone (work intensity / field for the user, etc) stays at default.
    const next: Partial<SimInputs> = {};

    const userAgeN = Number(form.userAge);
    if (Number.isFinite(userAgeN)) next.userAge = Math.round(userAgeN);

    if (hasPartner && form.partnerAge !== null) {
      next.partnerAge = Math.round(form.partnerAge);
    } else {
      next.partnerAge = null;
      next.partnerIncome = null;
      next.partnerWorkIntensity = null;
      next.partnerField = null;
    }

    if (form.city.trim()) next.city = form.city.trim();

    const kidsN = Number(form.kidsWanted);
    if (Number.isFinite(kidsN)) next.kidsWanted = Math.max(0, Math.floor(kidsN));

    const startN = Number(form.startAge);
    if (Number.isFinite(startN)) next.startAge = Math.round(startN);

    const incomeN = Number(form.income);
    if (Number.isFinite(incomeN)) next.householdIncome = Math.max(0, Math.round(incomeN));

    next.workIntensity = form.workIntensity;
    if (form.field.trim()) next.field = form.field.trim();

    if (hasPartner) {
      const piN = Number(form.partnerIncome);
      if (Number.isFinite(piN)) next.partnerIncome = Math.max(0, Math.round(piN));
      next.partnerWorkIntensity = form.partnerWorkIntensity;
      if (form.partnerField.trim()) next.partnerField = form.partnerField.trim();
    }

    applyInputs(next);
    markOnboarded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-bone/95 px-8 py-12 backdrop-blur-sm">
      <div className="w-full max-w-[560px]">
        {/* ───── header ───── */}
        <MonoLabel tone="muted">WELCOME TO NEST</MonoLabel>
        <h1 className="mt-3 font-serif text-[2.4rem] leading-[1.1] lowercase text-ink">
          tell us about your situation.
        </h1>
        <p className="mt-4 max-w-[44ch] font-serif text-[1.05rem] italic text-muted">
          nest models real planning math against your real life — not a demo
          scenario. six quick fields and we&apos;re in.
        </p>

        {/* ───── 6 core fields ───── */}
        <div className="mt-12 flex flex-col gap-7">
          <AtlasTextInput
            label="YOUR AGE"
            value={form.userAge}
            onChange={(s) => update("userAge", s)}
            type="number"
            min={RANGES.userAge.min}
            max={RANGES.userAge.max}
            step={1}
          />

          {hasPartner ? (
            <AtlasTextInput
              label="PARTNER AGE"
              value={form.partnerAge ?? ""}
              onChange={(s) => {
                if (s === "") {
                  update("partnerAge", null);
                  return;
                }
                const n = Number(s);
                if (Number.isFinite(n)) update("partnerAge", n);
              }}
              type="number"
              min={RANGES.partnerAge.min}
              max={RANGES.partnerAge.max}
              rightSlot={
                <button
                  type="button"
                  onClick={() => update("partnerAge", null)}
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
                /* disabled */
              }}
              type="number"
              placeholder="single"
              disabled
              rightSlot={
                <button
                  type="button"
                  onClick={() => update("partnerAge", 30)}
                  className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
                >
                  add partner →
                </button>
              }
            />
          )}

          <AtlasTypeahead
            label="HOUSEHOLD CITY"
            value={form.city}
            onChange={(s) => update("city", s)}
            suggestions={CITY_SUGGESTIONS}
            placeholder="new york, ny"
            panelFooter="any city worldwide — full data for the 20 us metros listed above, climate + country signals for everywhere else."
          />

          <AtlasTextInput
            label="KIDS WANTED"
            value={form.kidsWanted}
            onChange={(s) => update("kidsWanted", s)}
            type="number"
            min={0}
            step={1}
          />

          <AtlasTextInput
            label="START AT AGE"
            value={form.startAge}
            onChange={(s) => update("startAge", s)}
            type="number"
            min={RANGES.startAge.min}
            max={RANGES.startAge.max}
            step={1}
          />

          <AtlasTextInput
            label="HOUSEHOLD INCOME"
            value={form.income}
            onChange={(s) => update("income", s)}
            type="number"
            format="currency"
            min={0}
            step={1}
          />
        </div>

        {/* ───── partner sub-section (only when a partner exists) ───── */}
        {hasPartner ? (
          <>
            <hr className="my-7 border-line" />
            <MonoLabel tone="muted">YOUR PARTNER</MonoLabel>
            <div className="mt-4 flex flex-col gap-7">
              <AtlasTextInput
                label="PARTNER INCOME"
                value={form.partnerIncome}
                onChange={(s) => update("partnerIncome", s)}
                type="number"
                format="currency"
                min={0}
                step={1}
              />
              <AtlasDial
                label="PARTNER WORK INTENSITY"
                value={form.partnerWorkIntensity}
                onChange={(v) => update("partnerWorkIntensity", v)}
                min={RANGES.workIntensity.min}
                max={RANGES.workIntensity.max}
                step={RANGES.workIntensity.step}
                format={(v) => `${v} hrs/week`}
                leftAnchor="STEADY"
                rightAnchor="INTENSE"
              />
              <AtlasTypeahead
                label="PARTNER FIELD"
                value={form.partnerField}
                onChange={(s) => update("partnerField", s)}
                suggestions={OCCUPATION_LABELS}
              />
            </div>
          </>
        ) : null}

        {/* ───── your work sub-section (always shown) ───── */}
        <hr className="my-7 border-line" />
        <MonoLabel tone="muted">YOUR WORK</MonoLabel>
        <div className="mt-4 flex flex-col gap-7">
          <AtlasDial
            label="WORK INTENSITY"
            value={form.workIntensity}
            onChange={(v) => update("workIntensity", v)}
            min={RANGES.workIntensity.min}
            max={RANGES.workIntensity.max}
            step={RANGES.workIntensity.step}
            format={(v) => `${v} hrs/week`}
            leftAnchor="STEADY"
            rightAnchor="INTENSE"
          />
          <AtlasTypeahead
            label="YOUR FIELD"
            value={form.field}
            onChange={(s) => update("field", s)}
            suggestions={OCCUPATION_LABELS}
          />
        </div>

        {/* ───── CTA row ───── */}
        <div className="mt-12 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={skipOnboarding}
            className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted transition-colors hover:text-ink"
          >
            skip — use demo values →
          </button>
          <button
            type="button"
            onClick={beginWithValues}
            disabled={!canSubmit}
            className="rounded-[2px] bg-green px-10 py-3 font-serif text-[1.05rem] italic text-bone transition-colors hover:bg-green-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            begin →
          </button>
        </div>
      </div>
    </div>
  );
}
