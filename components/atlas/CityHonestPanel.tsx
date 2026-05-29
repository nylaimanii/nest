"use client";

import { cn } from "@/lib/utils";
import { contextFrom, useAtlasStore } from "@/store/atlas";
import { useSimStore } from "@/store/sim";
import {
  PREFERENCE_FACTORS,
  scoreCity,
  type AtlasFactor,
  type CityScore,
} from "@/lib/atlas/score";
import type { CityRecord } from "@/lib/atlas/cities";

import { MonoLabel } from "./MonoLabel";

const DASH = "— v1 dataset";
const NEUTRAL_LOW = 50;
const NEUTRAL_HIGH = 75;

type DotTone = "green" | "terracotta" | "ink" | "muted" | "none";

function objectiveTone(value: number | null, weight: number): DotTone {
  if (value === null) return "none";
  if (weight >= 4 && value >= NEUTRAL_HIGH) return "green";
  if (weight >= 4 && value <= NEUTRAL_LOW) return "terracotta";
  if (weight <= 1) return "muted";
  return "ink";
}

function preferenceTone(value: number | null, weight: number): DotTone {
  if (value === null) return "none";
  if (weight <= 1) return "muted";
  if (weight >= 4 && value >= NEUTRAL_HIGH) return "green";
  if (weight >= 4 && value <= NEUTRAL_LOW) return "terracotta";
  return "ink";
}

function toneFor(
  factor: AtlasFactor,
  value: number | null,
  weight: number,
): DotTone {
  return PREFERENCE_FACTORS.has(factor)
    ? preferenceTone(value, weight)
    : objectiveTone(value, weight);
}

function splitNameForState(name: string) {
  const [cityPart, statePart] = name.split(",").map((s) => s.trim());
  return { city: cityPart ?? name, state: (statePart ?? "").toUpperCase() };
}

function MatchDot({ tone }: { tone: DotTone }) {
  if (tone === "none") return null;
  const color =
    tone === "green"
      ? "bg-[color:var(--color-green)]"
      : tone === "terracotta"
        ? "bg-terracotta"
        : tone === "muted"
          ? "bg-[color:var(--color-line)]"
          : "bg-ink";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", color)}
    />
  );
}

// ---- target-mode row -------------------------------------------------------

interface RowProps {
  label: string;
  raw: string;
  tone: DotTone;
  weight: number;
}

function Row({ label, raw, tone, weight }: RowProps) {
  const muted = tone === "muted" || tone === "none";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2">
      <span
        className={cn(
          "font-serif text-[0.95rem] lowercase italic",
          muted ? "text-muted" : "text-ink",
          weight >= 4 && !muted && "font-medium",
        )}
      >
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "font-mono text-[0.85rem] tabular-nums",
            tone === "none"
              ? "text-muted italic"
              : muted
                ? "text-muted"
                : "text-ink",
          )}
        >
          {raw}
        </span>
        <MatchDot tone={tone} />
      </span>
    </div>
  );
}

// ---- compare-mode row ------------------------------------------------------

type DeltaTone = "green" | "terracotta" | "muted";

interface DeltaDisplay {
  text: string;
  tone: DeltaTone;
}

function numericDelta(
  altValue: number | null,
  targetValue: number | null,
  betterIsHigher: boolean,
): DeltaDisplay | null {
  if (altValue === null || targetValue === null) return null;
  const diff = Math.round(altValue - targetValue);
  if (diff === 0) {
    return { text: "= vs target", tone: "muted" };
  }
  const arrow = diff > 0 ? "▴" : "▾";
  const sign = diff > 0 ? "+" : "";
  const tone: DeltaTone =
    diff === 0
      ? "muted"
      : (diff > 0) === betterIsHigher
        ? "green"
        : "terracotta";
  return { text: `${arrow} ${sign}${diff} vs target`, tone };
}

function preferenceDelta(
  factor: "communitySize" | "weather",
  altCity: CityRecord,
  targetCity: CityRecord,
): DeltaDisplay | null {
  if (factor === "communitySize") {
    const a = altCity.metroPopulation;
    const t = targetCity.metroPopulation;
    if (a === null || t === null) return null;
    if (a < t * 0.6) return { text: "smaller community", tone: "muted" };
    if (a > t * 1.6) return { text: "larger community", tone: "muted" };
    return { text: "similar community", tone: "muted" };
  }
  // weather
  const a = altCity.annualSunnyDays;
  const t = targetCity.annualSunnyDays;
  if (a === null || t === null) return null;
  if (a >= t + 25) return { text: "sunnier", tone: "muted" };
  if (a <= t - 25) return { text: "grayer", tone: "muted" };
  return { text: "similar climate", tone: "muted" };
}

interface CompareRowProps {
  label: string;
  altRaw: string;
  delta: DeltaDisplay | null;
  tone: DotTone;
  weight: number;
}

function CompareRow({ label, altRaw, delta, tone, weight }: CompareRowProps) {
  const muted = tone === "muted" || tone === "none";
  const deltaClass = !delta
    ? ""
    : delta.tone === "green"
      ? "text-green"
      : delta.tone === "terracotta"
        ? "text-terracotta"
        : "text-muted";
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-3 border-b border-line/60 py-2">
      <span
        className={cn(
          "font-serif text-[0.95rem] lowercase italic",
          muted ? "text-muted" : "text-ink",
          weight >= 4 && !muted && "font-medium",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-[0.85rem] tabular-nums",
          tone === "none"
            ? "text-muted italic"
            : muted
              ? "text-muted"
              : "text-ink",
        )}
      >
        {altRaw}
      </span>
      <span className={cn("font-mono text-[0.7rem]", deltaClass)}>
        {delta?.text ?? ""}
      </span>
      <MatchDot tone={tone} />
    </div>
  );
}

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <MonoLabel tone="muted">{heading}</MonoLabel>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

// ---- row builders shared by both modes -------------------------------------

interface RowMeta {
  factor: AtlasFactor;
  label: string;
  /** "objective higher" or "objective lower" or "preference". */
  kind: "higherBetter" | "lowerBetter" | "preference";
}

const KID_ROWS: RowMeta[] = [
  { factor: "schools", label: "schools", kind: "higherBetter" },
  { factor: "safety", label: "safety", kind: "higherBetter" },
  { factor: "greenSpace", label: "green space", kind: "higherBetter" },
  { factor: "communitySize", label: "community", kind: "preference" },
];

const FAMILY_ROWS: RowMeta[] = [
  { factor: "cost", label: "cost of living", kind: "lowerBetter" },
  { factor: "rentBurden", label: "rent burden", kind: "lowerBetter" },
  { factor: "childcareCost", label: "childcare burden", kind: "lowerBetter" },
  { factor: "weather", label: "weather", kind: "preference" },
];

const YOU_ROWS: RowMeta[] = [
  { factor: "careerFit", label: "career fit", kind: "higherBetter" },
];

const PARTNER_CAREER_ROW: RowMeta = {
  factor: "partnerCareer",
  label: "partner career",
  kind: "higherBetter",
};

function rawForRow(
  row: RowMeta,
  city: CityRecord,
  score: CityScore,
  totalIncome: number,
  userField: string,
  partnerField: string | null,
): string {
  switch (row.factor) {
    case "schools":
      return city.schoolScore === null ? DASH : `${city.schoolScore}/100`;
    case "safety":
      return city.safetyScore === null ? DASH : `${city.safetyScore}/100`;
    case "greenSpace":
      return city.greenSpacePct === null ? DASH : `${city.greenSpacePct}%`;
    case "communitySize":
      return score.perFactor.communitySize.raw;
    case "cost":
      return city.costOfLiving === null
        ? DASH
        : `${city.costOfLiving} (us avg 100)`;
    case "rentBurden":
      return city.medianRent2BR === null || totalIncome <= 0
        ? DASH
        : `${Math.round(((city.medianRent2BR * 12) / totalIncome) * 100)}% of income`;
    case "childcareCost":
      return city.childcareMonthly === null || totalIncome <= 0
        ? DASH
        : `${Math.round(((city.childcareMonthly * 12) / (totalIncome * 0.76)) * 100)}% of take-home`;
    case "weather":
      return city.annualSunnyDays === null
        ? DASH
        : `${city.annualSunnyDays} sunny days/yr`;
    case "careerFit":
      return city.careerHubFor.length === 0
        ? DASH
        : `${userField} → ${
            score.perFactor.careerFit.value !== null &&
            score.perFactor.careerFit.value >= 100
              ? "match"
              : "no match"
          }`;
    case "partnerCareer":
      if (partnerField === null) return "— no partner";
      return city.careerHubFor.length === 0
        ? DASH
        : `${partnerField} → ${
            score.perFactor.partnerCareer.value !== null &&
            score.perFactor.partnerCareer.value >= 100
              ? "match"
              : "no match"
          }`;
  }
}

/** alternate value − target value, sign-flipped for lower-better factors
 *  so the "better/worse" tone is consistent. */
function computeDelta(
  row: RowMeta,
  altScore: CityScore,
  targetScore: CityScore,
  altCity: CityRecord,
  targetCity: CityRecord,
): DeltaDisplay | null {
  if (row.kind === "preference") {
    return preferenceDelta(
      row.factor as "communitySize" | "weather",
      altCity,
      targetCity,
    );
  }
  // both objective branches use the score.value (already 0-100 with higher=
  // better, since lower-better factors are inverted upstream in score.ts).
  return numericDelta(
    altScore.perFactor[row.factor].value,
    targetScore.perFactor[row.factor].value,
    true,
  );
}

// ---- the panel -------------------------------------------------------------

export function CityHonestPanel() {
  const target = useAtlasStore((s) => s.target);
  const alternates = useAtlasStore((s) => s.alternates);
  const selectedAlternateId = useAtlasStore((s) => s.selectedAlternateId);
  const setSelectedAlternateId = useAtlasStore((s) => s.setSelectedAlternateId);
  const weights = useAtlasStore((s) => s.weights);

  const simInputs = useSimStore((s) => s.inputs);

  if (!target) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8">
        <p className="font-serif italic text-muted">
          no target city yet — pick one on simulation.
        </p>
      </div>
    );
  }

  const ctx = contextFrom(simInputs, weights);
  const targetScore = scoreCity(target, ctx);

  const userField = simInputs.field;
  const partnerField = simInputs.partnerField;
  const totalIncome =
    simInputs.householdIncome + (simInputs.partnerIncome ?? 0);

  const youRows = partnerField !== null
    ? [...YOU_ROWS, PARTNER_CAREER_ROW]
    : YOU_ROWS;

  const selectedAlternate =
    selectedAlternateId !== null
      ? alternates.find((a) => a.id === selectedAlternateId) ?? null
      : null;

  // ---- MODE A: target view ----
  if (!selectedAlternate) {
    return <TargetView
      target={target}
      targetScore={targetScore}
      weights={weights}
      totalIncome={totalIncome}
      userField={userField}
      partnerField={partnerField}
      youRows={youRows}
    />;
  }

  // ---- MODE B: compare ----
  const altScore = scoreCity(selectedAlternate, ctx);
  return (
    <CompareView
      target={target}
      targetScore={targetScore}
      alternate={selectedAlternate}
      altScore={altScore}
      weights={weights}
      totalIncome={totalIncome}
      userField={userField}
      partnerField={partnerField}
      youRows={youRows}
      onBack={() => setSelectedAlternateId(null)}
    />
  );
}

// ---- MODE A: target view ---------------------------------------------------

function TargetView({
  target,
  targetScore,
  weights,
  totalIncome,
  userField,
  partnerField,
  youRows,
}: {
  target: CityRecord;
  targetScore: CityScore;
  weights: AtlasFactorWeights;
  totalIncome: number;
  userField: string;
  partnerField: string | null;
  youRows: RowMeta[];
}) {
  const { city, state } = splitNameForState(target.name);
  const stateLine = state ? `${city.toUpperCase()} · ${state}` : city.toUpperCase();
  const totalIsNull = targetScore.total === null;
  const totalTone: "green" | "terracotta" | "ink" = totalIsNull
    ? "ink"
    : targetScore.total! >= 70
      ? "green"
      : targetScore.total! <= 40
        ? "terracotta"
        : "ink";

  function rowFor(meta: RowMeta) {
    const raw = rawForRow(
      meta,
      target,
      targetScore,
      totalIncome,
      userField,
      partnerField,
    );
    return (
      <Row
        key={meta.label}
        label={meta.label}
        raw={raw}
        tone={toneFor(
          meta.factor,
          targetScore.perFactor[meta.factor].value,
          weights[meta.factor],
        )}
        weight={weights[meta.factor]}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-7 overflow-y-auto p-8">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted">
          your target —
        </p>
        <h2 className="font-serif text-[2.4rem] leading-tight lowercase text-ink">
          {city}
        </h2>
        <MonoLabel tone="muted">{stateLine}</MonoLabel>
      </header>

      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1">
          <MonoLabel tone="muted">VISION MATCH</MonoLabel>
          <span
            className={cn(
              "font-mono text-[3.5rem] leading-none tabular-nums",
              totalTone === "green"
                ? "text-green"
                : totalTone === "terracotta"
                  ? "text-terracotta"
                  : "text-ink",
            )}
          >
            {totalIsNull ? "—" : targetScore.total}
          </span>
        </div>
        <span className="pb-2 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted">
          {targetScore.confidence === "high"
            ? "high confidence"
            : targetScore.confidence === "partial"
              ? "partial data"
              : "unknown"}
        </span>
      </div>

      <p className="max-w-[40ch] font-serif italic leading-relaxed text-ink">
        {targetScore.honestTradeoff}
      </p>

      <Section heading="FOR THE KID">{KID_ROWS.map(rowFor)}</Section>
      <Section heading="FOR THE FAMILY">{FAMILY_ROWS.map(rowFor)}</Section>
      <Section heading="FOR YOU">{youRows.map(rowFor)}</Section>

      <p className="font-serif italic text-muted">
        data sourced for the 20 us metros below. weather and community size
        are preference factors — there's no objectively-better value, only
        what fits your family. anything tagged ESTIMATE · V1 is illustrative
        until we expand the dataset.
      </p>
    </div>
  );
}

// ---- MODE B: compare view --------------------------------------------------

type AtlasFactorWeights = Record<AtlasFactor, number>;

function CompareView({
  target,
  targetScore,
  alternate,
  altScore,
  weights,
  totalIncome,
  userField,
  partnerField,
  youRows,
  onBack,
}: {
  target: CityRecord;
  targetScore: CityScore;
  alternate: CityRecord;
  altScore: CityScore;
  weights: AtlasFactorWeights;
  totalIncome: number;
  userField: string;
  partnerField: string | null;
  youRows: RowMeta[];
  onBack: () => void;
}) {
  const altParts = splitNameForState(alternate.name);
  const totalDelta =
    altScore.total !== null && targetScore.total !== null
      ? altScore.total - targetScore.total
      : null;
  const totalDeltaTone: "green" | "terracotta" | "ink" =
    totalDelta === null
      ? "ink"
      : totalDelta > 0
        ? "green"
        : totalDelta < 0
          ? "terracotta"
          : "ink";
  const totalDeltaText =
    totalDelta === null
      ? "—"
      : totalDelta > 0
        ? `+${totalDelta} pts overall`
        : totalDelta < 0
          ? `${totalDelta} pts overall`
          : "equal overall";

  function compareRowFor(meta: RowMeta) {
    const altRaw = rawForRow(
      meta,
      alternate,
      altScore,
      totalIncome,
      userField,
      partnerField,
    );
    const delta = computeDelta(meta, altScore, targetScore, alternate, target);
    return (
      <CompareRow
        key={meta.label}
        label={meta.label}
        altRaw={altRaw}
        delta={delta}
        tone={toneFor(
          meta.factor,
          altScore.perFactor[meta.factor].value,
          weights[meta.factor],
        )}
        weight={weights[meta.factor]}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-7 overflow-y-auto p-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted">
            other match —
          </p>
          <button
            type="button"
            onClick={onBack}
            className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
          >
            ← back to target
          </button>
        </div>
        <h2 className="font-serif text-[2.4rem] leading-tight lowercase text-ink">
          {altParts.city}
        </h2>
        <p className="font-serif text-[0.95rem] italic text-muted">
          vs your target {target.name}:{" "}
          <span
            className={cn(
              "font-mono",
              totalDeltaTone === "green"
                ? "text-green"
                : totalDeltaTone === "terracotta"
                  ? "text-terracotta"
                  : "text-ink",
            )}
          >
            {totalDeltaText}
          </span>
        </p>
      </header>

      <p className="max-w-[40ch] font-serif italic leading-relaxed text-ink">
        {altScore.honestTradeoff}
      </p>

      <Section heading="FOR THE KID">{KID_ROWS.map(compareRowFor)}</Section>
      <Section heading="FOR THE FAMILY">{FAMILY_ROWS.map(compareRowFor)}</Section>
      <Section heading="FOR YOU">{youRows.map(compareRowFor)}</Section>

      <p className="font-serif italic text-muted">
        data sourced for the 20 us metros below. weather and community size
        are preference factors — there's no objectively-better value, only
        what fits your family. anything tagged ESTIMATE · V1 is illustrative
        until we expand the dataset.
      </p>
    </div>
  );
}
