"use client";

import { cn } from "@/lib/utils";
import { useAtlasStore } from "@/store/atlas";
import { useSimStore } from "@/store/sim";
import type { AtlasFactor, CityScore } from "@/lib/atlas/score";
import { PREFERENCE_FACTORS } from "@/lib/atlas/score";

import { MonoLabel } from "./MonoLabel";

const DASH = "— v1 dataset";
const NEUTRAL_LOW = 50;
const NEUTRAL_HIGH = 75;

type DotTone = "green" | "terracotta" | "ink" | "muted" | "none";

/**
 * objective factors: better is objectively better, dot encodes that with
 * a value judgement when the user cares (weight ≥ 4).
 */
function objectiveTone(value: number | null, weight: number): DotTone {
  if (value === null) return "none";
  if (weight >= 4 && value >= NEUTRAL_HIGH) return "green";
  if (weight >= 4 && value <= NEUTRAL_LOW) return "terracotta";
  if (weight <= 1) return "muted";
  return "ink";
}

/**
 * preference factors (communitySize, weather): there's no "better" — just
 * "more of the trait" (smaller/larger metro; sunny/gray). when the user
 * cares (weight ≥ 4) the dot still flips to green when the city matches
 * the high end of the trait scale and terracotta on the low end — but the
 * label below makes clear this is descriptive, not value-judgmental.
 * when weight ≤ 1 it stays muted; otherwise neutral ink.
 */
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
  raw: string;
}

function buildRows(
  score: CityScore,
  userField: string,
  partnerField: string | null,
  totalIncome: number,
): { forKid: RowInput[]; forFamily: RowInput[]; forYou: RowInput[] } {
  const c = score.city;
  const pf = score.perFactor;

  // FOR THE KID — three objective rows plus the preference row for community.
  const forKid: RowInput[] = [
    {
      factor: "schools",
      label: "schools",
      raw: c.schoolScore === null ? DASH : `${c.schoolScore}/100`,
    },
    {
      factor: "safety",
      label: "safety",
      raw: c.safetyScore === null ? DASH : `${c.safetyScore}/100`,
    },
    {
      factor: "greenSpace",
      label: "green space",
      raw: c.greenSpacePct === null ? DASH : `${c.greenSpacePct}%`,
    },
    {
      // preference factor: rawFor() in score.ts already returns the
      // descriptive label ("strong community feel", etc).
      factor: "communitySize",
      label: "community",
      raw: pf.communitySize.raw,
    },
  ];

  // FOR THE FAMILY — cost of living + the two derived burdens + weather.
  // the rent ratio + childcare burden % are descriptive UI labels; the
  // score engine has its own precise take-home math. for the label we use
  // a 0.76 take-home approximation to keep this row cheap — the scoring
  // total (and the SOURCED tags) reflect the precise number.
  const rentDisplay =
    c.medianRent2BR === null || totalIncome <= 0
      ? DASH
      : `${Math.round(((c.medianRent2BR * 12) / totalIncome) * 100)}% of income`;
  const childcareDisplay =
    c.childcareMonthly === null || totalIncome <= 0
      ? DASH
      : `${Math.round(((c.childcareMonthly * 12) / (totalIncome * 0.76)) * 100)}% of take-home`;

  const forFamily: RowInput[] = [
    {
      factor: "cost",
      label: "cost of living",
      raw: c.costOfLiving === null ? DASH : `${c.costOfLiving} (us avg 100)`,
    },
    {
      factor: "rentBurden",
      label: "rent burden",
      raw: rentDisplay,
    },
    {
      factor: "childcareCost",
      label: "childcare burden",
      raw: childcareDisplay,
    },
    {
      factor: "weather",
      label: "weather",
      raw:
        c.annualSunnyDays === null
          ? DASH
          : `${c.annualSunnyDays} sunny days/yr`,
    },
  ];

  // FOR YOU — career fit always, partner career only when partner exists.
  const userCareerDisplay =
    c.careerHubFor.length === 0
      ? DASH
      : `${userField} → ${
          pf.careerFit.value !== null && pf.careerFit.value >= 100
            ? "match"
            : "no match"
        }`;
  const forYou: RowInput[] = [
    {
      factor: "careerFit",
      label: "career fit",
      raw: userCareerDisplay,
    },
  ];
  if (partnerField !== null) {
    const partnerCareerDisplay =
      c.careerHubFor.length === 0
        ? DASH
        : `${partnerField} → ${
            pf.partnerCareer.value !== null && pf.partnerCareer.value >= 100
              ? "match"
              : "no match"
          }`;
    forYou.push({
      factor: "partnerCareer",
      label: "partner career",
      raw: partnerCareerDisplay,
    });
  }

  return { forKid, forFamily, forYou };
}

export function CityHonestPanel() {
  const activeCityId = useAtlasStore((s) => s.activeCityId);
  const scores = useAtlasStore((s) => s.scores);
  const weights = useAtlasStore((s) => s.weights);
  const userField = useSimStore((s) => s.inputs.field);
  const partnerField = useSimStore((s) => s.inputs.partnerField);
  const userIncome = useSimStore((s) => s.inputs.householdIncome);
  const partnerIncome = useSimStore((s) => s.inputs.partnerIncome);
  const totalIncome = userIncome + (partnerIncome ?? 0);

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

  const { forKid, forFamily, forYou } = buildRows(
    score,
    userField,
    partnerField,
    totalIncome,
  );

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
            tone={toneFor(
              r.factor,
              score.perFactor[r.factor].value,
              weights[r.factor],
            )}
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
            tone={toneFor(
              r.factor,
              score.perFactor[r.factor].value,
              weights[r.factor],
            )}
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
            tone={toneFor(
              r.factor,
              score.perFactor[r.factor].value,
              weights[r.factor],
            )}
            weight={weights[r.factor]}
          />
        ))}
      </Section>

      <p className="font-serif italic text-muted">
        data sourced for the 20 us metros below. weather and community size
        are preference factors — there's no objectively-better value, only
        what fits your family. anything tagged ESTIMATE · V1 is illustrative
        until we expand the dataset.
      </p>
    </div>
  );
}
