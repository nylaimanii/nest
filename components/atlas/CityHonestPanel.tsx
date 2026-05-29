"use client";

import { cn } from "@/lib/utils";
import { useAtlasStore } from "@/store/atlas";
import { useSimStore } from "@/store/sim";
import type { AtlasFactor, CityScore } from "@/lib/atlas/score";
import type { CityRecord } from "@/lib/atlas/cities";

import { MonoLabel } from "./MonoLabel";

const DASH = "— v1 dataset";
const NEUTRAL_LOW = 50;
const NEUTRAL_HIGH = 75;

type DotTone = "green" | "terracotta" | "ink" | "muted" | "none";

/** higher-better value (0–100) + user weight (0–5) → dot tone. */
function toneFor(value: number | null, weight: number): DotTone {
  if (value === null) return "none";
  if (weight >= 4 && value >= NEUTRAL_HIGH) return "green";
  if (weight >= 4 && value <= NEUTRAL_LOW) return "terracotta";
  if (weight <= 1) return "muted";
  return "ink";
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

/** lower-better USD stat → 0–100 higher-better score, given a sensible range. */
function inverseScore(value: number, lo: number, hi: number): number {
  return clamp(100 - ((value - lo) / (hi - lo)) * 100, 0, 100);
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

interface RowInput {
  factor: AtlasFactor;
  label: string;
  value: number | null;
  raw: string;
}

function buildRows(
  c: CityRecord,
  score: CityScore,
  field: string,
  takeHomePct: number | null,
): { forKid: RowInput[]; forFamily: RowInput[]; forYou: RowInput[] } {
  const forKid: RowInput[] = [
    {
      factor: "schools",
      label: "schools",
      value: score.perFactor.schools.value,
      raw: c.schoolScore === null ? DASH : String(c.schoolScore),
    },
    {
      factor: "safety",
      label: "safety",
      value: score.perFactor.safety.value,
      raw: c.safetyScore === null ? DASH : String(c.safetyScore),
    },
    {
      factor: "greenSpace",
      label: "green space",
      value: score.perFactor.greenSpace.value,
      raw: c.greenSpacePct === null ? DASH : `${c.greenSpacePct}%`,
    },
  ];

  // FOR THE FAMILY: cost-related rows all read the "cost" weight so the user's
  // single "cost matters?" preference governs them together.
  const rentValue =
    c.medianRent2BR === null ? null : inverseScore(c.medianRent2BR, 1500, 5000);
  const childcareValue =
    c.childcareMonthly === null
      ? null
      : inverseScore(c.childcareMonthly, 1200, 3000);
  const forFamily: RowInput[] = [
    {
      factor: "cost",
      label: "cost of living",
      value: score.perFactor.cost.value,
      raw: c.costOfLiving === null ? DASH : `${c.costOfLiving} index`,
    },
    {
      factor: "cost",
      label: "median rent (2BR)",
      value: rentValue,
      raw:
        c.medianRent2BR === null
          ? DASH
          : `$${c.medianRent2BR.toLocaleString("en-US")}/mo`,
    },
    {
      factor: "cost",
      label: "childcare per kid",
      value: childcareValue,
      raw:
        c.childcareMonthly === null
          ? DASH
          : `$${c.childcareMonthly.toLocaleString("en-US")}/mo`,
    },
  ];

  // FOR YOU: career fit + the financial breathing-room signal.
  // careerScore returns 100 on match, 50 on data-but-no-match — so the
  // dot logic in toneFor already does the right thing (≥75 green, ≤50
  // terracotta when the user cares).
  const careerRaw =
    c.careerHubFor.length === 0
      ? DASH
      : c.careerHubFor.includes(field)
        ? `${field} (matches)`
        : `not a ${field} hub — ${c.careerHubFor.join(", ")}`;
  const forYou: RowInput[] = [
    {
      factor: "careerFit",
      label: "career fit",
      value: score.perFactor.careerFit.value,
      raw: careerRaw,
    },
    {
      factor: "cost",
      label: "take-home after childcare",
      value: takeHomePct,
      raw: takeHomePct === null ? DASH : `${takeHomePct}%`,
    },
  ];

  return { forKid, forFamily, forYou };
}

export function CityHonestPanel() {
  const activeCityId = useAtlasStore((s) => s.activeCityId);
  const scores = useAtlasStore((s) => s.scores);
  const weights = useAtlasStore((s) => s.weights);
  const income = useSimStore((s) => s.inputs.householdIncome);
  const field = useSimStore((s) => s.inputs.field);

  const score = scores.find((s) => s.city.id === activeCityId);
  if (!score) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8">
        <p className="font-serif italic text-muted">
          select a city from the roster to see how it matches your vision.
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

  const { forKid, forFamily, forYou } = buildRows(c, score, field, takeHomePct);

  return (
    <div className="flex flex-1 flex-col gap-7 overflow-y-auto p-8">
      <header className="flex flex-col gap-1">
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
            {totalIsNull ? "—" : score.total}
          </span>
        </div>
        <span className="pb-2 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted">
          {score.confidence === "high"
            ? "high confidence"
            : score.confidence === "partial"
              ? "partial data"
              : "unknown"}
        </span>
      </div>

      <p className="max-w-[40ch] font-serif italic leading-relaxed text-ink">
        {score.honestTradeoff}
      </p>

      <Section heading="FOR THE KID">
        {forKid.map((r) => (
          <Row
            key={r.label}
            label={r.label}
            raw={r.raw}
            tone={toneFor(r.value, weights[r.factor])}
            weight={weights[r.factor]}
          />
        ))}
      </Section>

      <Section heading="FOR THE FAMILY">
        {forFamily.map((r) => (
          <Row
            key={r.label}
            label={r.label}
            raw={r.raw}
            tone={toneFor(r.value, weights[r.factor])}
            weight={weights[r.factor]}
          />
        ))}
      </Section>

      <Section heading="FOR YOU">
        {forYou.map((r) => (
          <Row
            key={r.label}
            label={r.label}
            raw={r.raw}
            tone={toneFor(r.value, weights[r.factor])}
            weight={weights[r.factor]}
          />
        ))}
      </Section>

      <p className="font-serif italic text-muted">
        scores are v1 illustrative — sourced atlas lands later.
      </p>
    </div>
  );
}
