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
// or abandoned modal leaves DEFAULT_INPUTS untouched.
//
// review fix: every "opt-in" field starts EMPTY (or with a touched flag for
// dials). only fields the user actively sets get included in the applyInputs
// payload — anything left untouched preserves DEFAULT_INPUTS without lying
// to the user that they chose it.
interface FormState {
  userAge: string;
  partnerAge: number | null;
  city: string;
  kidsWanted: string;
  startAge: string;
  income: string;
  workIntensity: number;
  workIntensityTouched: boolean;
  field: string;
  partnerIncome: string;
  partnerWorkIntensity: number;
  partnerWorkIntensityTouched: boolean;
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
  workIntensityTouched: false,
  field: "",
  partnerIncome: "",
  partnerWorkIntensity: 45,
  partnerWorkIntensityTouched: false,
  partnerField: "",
};

// keys validation can flag. workIntensity / field / partnerWorkIntensity /
// partnerField are all opt-in — they have safe DEFAULT_INPUTS fallbacks
// and don't surface errors.
type ValidatedKey =
  | "userAge"
  | "partnerAge"
  | "city"
  | "kidsWanted"
  | "startAge"
  | "income"
  | "partnerIncome";

type ErrorMap = Partial<Record<ValidatedKey, string>>;
type TouchedMap = Partial<Record<ValidatedKey, boolean>>;

// order matters — "scroll + focus the first error" walks this list top-down
// so the user lands on the highest-on-the-page invalid field first.
const FIELD_ORDER: ValidatedKey[] = [
  "userAge",
  "partnerAge",
  "city",
  "kidsWanted",
  "startAge",
  "income",
  "partnerIncome",
];

const INPUT_IDS: Record<ValidatedKey, string> = {
  userAge: "onboarding-userAge",
  partnerAge: "onboarding-partnerAge",
  city: "onboarding-city",
  kidsWanted: "onboarding-kidsWanted",
  startAge: "onboarding-startAge",
  income: "onboarding-income",
  partnerIncome: "onboarding-partnerIncome",
};

function validateForm(form: FormState): ErrorMap {
  const errors: ErrorMap = {};
  const hasPartner = form.partnerAge !== null;

  if (form.userAge.trim() === "") {
    errors.userAge = "required";
  } else {
    const n = Number(form.userAge);
    if (!Number.isFinite(n)) errors.userAge = "must be a number";
    else if (n < RANGES.userAge.min)
      errors.userAge = `must be ${RANGES.userAge.min} or older`;
    else if (n > RANGES.userAge.max)
      errors.userAge = `must be ${RANGES.userAge.max} or younger`;
  }

  if (hasPartner) {
    const n = form.partnerAge!;
    if (!Number.isFinite(n)) errors.partnerAge = "must be a number";
    else if (n < RANGES.partnerAge.min)
      errors.partnerAge = `must be ${RANGES.partnerAge.min} or older`;
    else if (n > RANGES.partnerAge.max)
      errors.partnerAge = `must be ${RANGES.partnerAge.max} or younger`;
  }

  if (form.city.trim() === "") errors.city = "required";

  if (form.kidsWanted.trim() === "") {
    errors.kidsWanted = "required";
  } else {
    const n = Number(form.kidsWanted);
    if (!Number.isFinite(n)) errors.kidsWanted = "must be a number";
    else if (n < 0) errors.kidsWanted = "must be 0 or more";
  }

  if (form.startAge.trim() === "") {
    errors.startAge = "required";
  } else {
    const n = Number(form.startAge);
    if (!Number.isFinite(n)) errors.startAge = "must be a number";
    else if (n < RANGES.startAge.min)
      errors.startAge = `must be ${RANGES.startAge.min} or older`;
    else if (n > RANGES.startAge.max)
      errors.startAge = `must be ${RANGES.startAge.max} or younger`;
  }

  if (form.income.trim() === "") {
    errors.income = "required";
  } else {
    const n = Number(form.income);
    if (!Number.isFinite(n)) errors.income = "must be a number";
    else if (n <= 0) errors.income = "must be greater than 0";
  }

  if (hasPartner) {
    if (form.partnerIncome.trim() === "") {
      errors.partnerIncome = "required";
    } else {
      const n = Number(form.partnerIncome);
      if (!Number.isFinite(n)) errors.partnerIncome = "must be a number";
      else if (n <= 0) errors.partnerIncome = "must be greater than 0";
    }
  }

  return errors;
}

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const applyInputs = useSimStore((s) => s.applyInputs);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [touched, setTouched] = useState<TouchedMap>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  if (!open) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function markTouched(key: ValidatedKey) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  const hasPartner = form.partnerAge !== null;
  const errors = validateForm(form);
  const errorCount = Object.keys(errors).length;

  function errorFor(key: ValidatedKey): string | undefined {
    if (submitAttempted) return errors[key];
    return touched[key] ? errors[key] : undefined;
  }

  function togglePartner() {
    setForm((prev) => {
      if (prev.partnerAge !== null) {
        return { ...prev, partnerAge: null };
      }
      const userN = Number(prev.userAge);
      const seed =
        Number.isFinite(userN) && userN > 0
          ? Math.min(RANGES.partnerAge.max, Math.round(userN) + 1)
          : 30;
      return { ...prev, partnerAge: seed };
    });
  }

  function markOnboarded() {
    try {
      localStorage.setItem("nest.onboarded", "true");
    } catch {
      /* safari private mode + corporate policies can throw; soldier on. */
    }
  }

  function skipOnboarding() {
    markOnboarded();
    onClose();
  }

  function beginWithValues() {
    setSubmitAttempted(true);

    const currentErrors = validateForm(form);
    if (Object.keys(currentErrors).length > 0) {
      for (const key of FIELD_ORDER) {
        if (currentErrors[key]) {
          const el = document.getElementById(INPUT_IDS[key]);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            window.setTimeout(() => el.focus(), 50);
          }
          break;
        }
      }
      return;
    }

    // build a Partial<SimInputs>. only include fields the user actually
    // set — anything left blank keeps the DEFAULT_INPUTS value rather
    // than overriding it with a coerced fallback the user didn't choose.
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
    if (Number.isFinite(incomeN))
      next.householdIncome = Math.max(0, Math.round(incomeN));

    // opt-in fields — only commit if the user actively set them. untouched
    // dials and empty typeaheads preserve DEFAULT_INPUTS.
    if (form.workIntensityTouched) next.workIntensity = form.workIntensity;
    if (form.field.trim()) next.field = form.field.trim();

    if (hasPartner) {
      const piN = Number(form.partnerIncome);
      if (Number.isFinite(piN))
        next.partnerIncome = Math.max(0, Math.round(piN));
      if (form.partnerWorkIntensityTouched)
        next.partnerWorkIntensity = form.partnerWorkIntensity;
      if (form.partnerField.trim()) next.partnerField = form.partnerField.trim();
    }

    applyInputs(next);
    markOnboarded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bone/95 px-8 py-12 backdrop-blur-sm">
      {/* fixed-height container: header + CTA pin, body scrolls. ensures
          the modal never spills off a 1366×768 viewport while keeping the
          "begin →" button reachable without scrolling the whole page. */}
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col">
        {/* ───── header (pinned) ───── */}
        <div className="shrink-0 pb-6">
          <MonoLabel tone="muted">WELCOME TO NEST</MonoLabel>
          <h1 className="mt-3 font-serif text-[2.4rem] leading-[1.1] lowercase text-ink">
            tell us about your situation.
          </h1>
          <p className="mt-4 max-w-[44ch] font-serif text-[1.05rem] italic text-muted">
            nest models real planning math against your real life — not a demo
            scenario. six quick fields and we&apos;re in.
          </p>
        </div>

        {/* ───── form (scrollable) ───── */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          <div className="flex flex-col gap-7">
            <AtlasTextInput
              label="YOUR AGE"
              value={form.userAge}
              onChange={(s) => update("userAge", s)}
              onBlur={() => markTouched("userAge")}
              type="number"
              min={RANGES.userAge.min}
              max={RANGES.userAge.max}
              step={1}
              inputId={INPUT_IDS.userAge}
              error={errorFor("userAge")}
            />

            {hasPartner ? (
              <AtlasTextInput
                label="PARTNER AGE"
                value={form.partnerAge ?? ""}
                onChange={(s) => {
                  if (s === "") return;
                  const n = Number(s);
                  if (Number.isFinite(n)) update("partnerAge", n);
                }}
                onBlur={() => markTouched("partnerAge")}
                type="number"
                min={RANGES.partnerAge.min}
                max={RANGES.partnerAge.max}
                inputId={INPUT_IDS.partnerAge}
                error={errorFor("partnerAge")}
                rightSlot={
                  <button
                    type="button"
                    onClick={togglePartner}
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
                inputId={INPUT_IDS.partnerAge}
                rightSlot={
                  <button
                    type="button"
                    onClick={togglePartner}
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
              onBlur={() => markTouched("city")}
              suggestions={CITY_SUGGESTIONS}
              placeholder="new york, ny"
              inputId={INPUT_IDS.city}
              error={errorFor("city")}
              panelFooter="any city worldwide — full data for the 20 us metros listed above, climate + country signals for everywhere else."
            />

            <AtlasTextInput
              label="KIDS WANTED"
              value={form.kidsWanted}
              onChange={(s) => update("kidsWanted", s)}
              onBlur={() => markTouched("kidsWanted")}
              type="number"
              min={0}
              step={1}
              inputId={INPUT_IDS.kidsWanted}
              error={errorFor("kidsWanted")}
            />

            <AtlasTextInput
              label="START AT AGE"
              value={form.startAge}
              onChange={(s) => update("startAge", s)}
              onBlur={() => markTouched("startAge")}
              type="number"
              min={RANGES.startAge.min}
              max={RANGES.startAge.max}
              step={1}
              inputId={INPUT_IDS.startAge}
              error={errorFor("startAge")}
            />

            <AtlasTextInput
              label="HOUSEHOLD INCOME"
              value={form.income}
              onChange={(s) => update("income", s)}
              onBlur={() => markTouched("income")}
              type="number"
              format="currency"
              min={0}
              step={1}
              inputId={INPUT_IDS.income}
              error={errorFor("income")}
            />
          </div>

          {hasPartner ? (
            <>
              <hr className="my-7 border-line" />
              <MonoLabel tone="muted">YOUR PARTNER</MonoLabel>
              <div className="mt-4 flex flex-col gap-7">
                <AtlasTextInput
                  label="PARTNER INCOME"
                  value={form.partnerIncome}
                  onChange={(s) => update("partnerIncome", s)}
                  onBlur={() => markTouched("partnerIncome")}
                  type="number"
                  format="currency"
                  min={0}
                  step={1}
                  inputId={INPUT_IDS.partnerIncome}
                  error={errorFor("partnerIncome")}
                />
                <AtlasDial
                  label="PARTNER WORK INTENSITY"
                  value={form.partnerWorkIntensity}
                  onChange={(v) => {
                    update("partnerWorkIntensity", v);
                    update("partnerWorkIntensityTouched", true);
                  }}
                  min={RANGES.workIntensity.min}
                  max={RANGES.workIntensity.max}
                  step={RANGES.workIntensity.step}
                  format={(v) => `${v} hrs/week`}
                  leftAnchor="STEADY"
                  rightAnchor="INTENSE"
                  placeholder={
                    form.partnerWorkIntensityTouched
                      ? undefined
                      : "drag to set partner work intensity — leaving blank keeps the default."
                  }
                />
                <AtlasTypeahead
                  label="PARTNER FIELD"
                  value={form.partnerField}
                  onChange={(s) => update("partnerField", s)}
                  suggestions={OCCUPATION_LABELS}
                  hint={
                    form.partnerField.trim() === ""
                      ? "optional — leaving blank keeps the default."
                      : undefined
                  }
                />
              </div>
            </>
          ) : null}

          <hr className="my-7 border-line" />
          <MonoLabel tone="muted">YOUR WORK</MonoLabel>
          <div className="mt-4 flex flex-col gap-7">
            <AtlasDial
              label="WORK INTENSITY"
              value={form.workIntensity}
              onChange={(v) => {
                update("workIntensity", v);
                update("workIntensityTouched", true);
              }}
              min={RANGES.workIntensity.min}
              max={RANGES.workIntensity.max}
              step={RANGES.workIntensity.step}
              format={(v) => `${v} hrs/week`}
              leftAnchor="STEADY"
              rightAnchor="INTENSE"
              placeholder={
                form.workIntensityTouched
                  ? undefined
                  : "drag to set work intensity — leaving blank keeps the default."
              }
            />
            <AtlasTypeahead
              label="YOUR FIELD"
              value={form.field}
              onChange={(s) => update("field", s)}
              suggestions={OCCUPATION_LABELS}
              hint={
                form.field.trim() === ""
                  ? "optional — leaving blank keeps the default."
                  : undefined
              }
            />
          </div>
        </div>

        {/* ───── CTA row (pinned) ───── */}
        <div className="shrink-0 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-6">
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
              className="rounded-[2px] bg-green px-10 py-3 font-serif text-[1.05rem] italic text-bone transition-colors hover:bg-green-2"
            >
              begin →
            </button>
          </div>
          {submitAttempted && errorCount > 0 ? (
            <p className="mt-2 self-end font-mono text-[0.7rem] italic text-terracotta">
              {errorCount} field{errorCount === 1 ? "" : "s"} need attention
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
