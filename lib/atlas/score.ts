// determinism rule (CLAUDE.md): scores are CODE, never LLM-generated.
// honest tradeoff strings are templated from the numbers below, not prose.

import { findOccupation } from "@/lib/sim/fields";
import {
  computeTakeHome,
  stateAbbrevFromCity,
  type FilingStatus,
} from "@/lib/sim/tax";
import type { CityRecord } from "./cities";

export type AtlasWeights = {
  schools: number; // 0–5 importance
  safety: number;
  greenSpace: number;
  communitySize: number;
  cost: number;
  rentBurden: number;
  childcareCost: number;
  weather: number;
  careerFit: number;
  partnerCareer: number;
};

export type AtlasFactor = keyof AtlasWeights;

export type FactorScore = {
  value: number | null; // normalized 0–100 (null if no data)
  weighted: number | null;
  raw: string;
};

export type CityScore = {
  city: CityRecord;
  total: number | null;
  perFactor: Record<AtlasFactor, FactorScore>;
  honestTradeoff: string;
  confidence: "high" | "partial" | "unknown";
};

export interface ScoreContext {
  weights: AtlasWeights;
  /** user's gross income, USD (model.ts SimInputs.householdIncome). */
  userIncome: number;
  /** partner's gross income, USD or null when no partner. */
  partnerIncome: number | null;
  /** user occupation free-string. */
  userField: string;
  /** partner occupation free-string or null when no partner. */
  partnerField: string | null;
  filing: FilingStatus;
  kidsWanted: number;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

// ---- per-factor 0–100 scoring (higher = better, or for preference
//      factors: higher = more of the trait, not necessarily "better") -------

function schoolsScore(c: CityRecord): number | null {
  return c.schoolScore;
}
function safetyScore(c: CityRecord): number | null {
  return c.safetyScore;
}
/** 30%+ green = 100; linear from 0. */
function greenScore(c: CityRecord): number | null {
  if (c.greenSpacePct === null) return null;
  return clamp((c.greenSpacePct / 30) * 100, 0, 100);
}

/** preference factor: smaller pop scores higher on "community feel," but
 *  the dot logic + descriptive label make clear neither is objectively
 *  better. piecewise per spec. */
function communityScore(c: CityRecord): number | null {
  if (c.metroPopulation === null) return null;
  if (c.metroPopulation < 500000) return 100;
  if (c.metroPopulation < 1500000) return 75;
  if (c.metroPopulation < 3000000) return 50;
  return 25;
}
export function communityLabel(pop: number | null): string {
  if (pop === null) return "— v1 dataset";
  if (pop < 500000) return "strong community feel";
  if (pop < 1500000) return "medium metro";
  if (pop < 3000000) return "large metro";
  return "very large metro";
}

/** invert COL: 80 → 100, 180 → 0; clamped. */
function costScore(c: CityRecord): number | null {
  if (c.costOfLiving === null) return null;
  return clamp(100 - (c.costOfLiving - 80), 0, 100);
}

/** lower rent/income ratio = better. piecewise per spec. */
function rentBurdenScore(c: CityRecord, totalIncome: number): number | null {
  if (c.medianRent2BR === null || totalIncome <= 0) return null;
  const ratio = (c.medianRent2BR * 12) / totalIncome;
  if (ratio < 0.2) return 100;
  if (ratio < 0.3) return 75;
  if (ratio < 0.4) return 50;
  if (ratio < 0.5) return 25;
  return 10;
}

/** lower childcare-as-percent-of-take-home = better. piecewise per spec. */
function childcareCostScore(
  c: CityRecord,
  takeHome: number,
): number | null {
  if (c.childcareMonthly === null || takeHome <= 0) return null;
  const annual = c.childcareMonthly * 12;
  const burden = annual / takeHome;
  if (burden < 0.1) return 100;
  if (burden < 0.2) return 75;
  if (burden < 0.3) return 50;
  if (burden < 0.4) return 25;
  return 10;
}

/** preference factor: sunny vs gray. piecewise per spec. */
function weatherScore(c: CityRecord): number | null {
  if (c.annualSunnyDays === null) return null;
  if (c.annualSunnyDays >= 250) return 100;
  if (c.annualSunnyDays >= 200) return 75;
  if (c.annualSunnyDays >= 150) return 50;
  return 25;
}

/** match → 100; data but no match → 50; no data → null. shared by user
 *  and partner career factors. */
function careerScoreFor(c: CityRecord, field: string): number | null {
  if (c.careerHubFor.length === 0) return null;
  const occ = findOccupation(field);
  const category = occ ? occ.category : field.trim().toLowerCase();
  return c.careerHubFor.includes(category) ? 100 : 50;
}

function factorValue(
  c: CityRecord,
  f: AtlasFactor,
  ctx: ScoreContext,
  derived: { totalIncome: number; takeHome: number },
): number | null {
  switch (f) {
    case "schools":
      return schoolsScore(c);
    case "safety":
      return safetyScore(c);
    case "greenSpace":
      return greenScore(c);
    case "communitySize":
      return communityScore(c);
    case "cost":
      return costScore(c);
    case "rentBurden":
      return rentBurdenScore(c, derived.totalIncome);
    case "childcareCost":
      return childcareCostScore(c, derived.takeHome);
    case "weather":
      return weatherScore(c);
    case "careerFit":
      return careerScoreFor(c, ctx.userField);
    case "partnerCareer":
      // null when no partner — atlas panel hides the row entirely.
      if (ctx.partnerField === null) return null;
      return careerScoreFor(c, ctx.partnerField);
  }
}

function rawFor(c: CityRecord, f: AtlasFactor, ctx: ScoreContext): string {
  switch (f) {
    case "schools":
      return c.schoolScore === null ? "— v1 dataset" : String(c.schoolScore);
    case "safety":
      return c.safetyScore === null ? "— v1 dataset" : String(c.safetyScore);
    case "greenSpace":
      return c.greenSpacePct === null ? "— v1 dataset" : `${c.greenSpacePct}%`;
    case "communitySize":
      return communityLabel(c.metroPopulation);
    case "cost":
      return c.costOfLiving === null
        ? "— v1 dataset"
        : `${c.costOfLiving} index`;
    case "rentBurden":
      return c.medianRent2BR === null
        ? "— v1 dataset"
        : `$${c.medianRent2BR.toLocaleString("en-US")}/mo`;
    case "childcareCost":
      return c.childcareMonthly === null
        ? "— v1 dataset"
        : `$${c.childcareMonthly.toLocaleString("en-US")}/mo`;
    case "weather":
      return c.annualSunnyDays === null
        ? "— v1 dataset"
        : `${c.annualSunnyDays} sunny days/yr`;
    case "careerFit":
      return c.careerHubFor.length === 0
        ? "— v1 dataset"
        : c.careerHubFor.join(", ");
    case "partnerCareer":
      if (ctx.partnerField === null) return "— no partner";
      return c.careerHubFor.length === 0
        ? "— v1 dataset"
        : c.careerHubFor.join(", ");
  }
}

// ---- honest tradeoff phrases ----------------------------------------------

function bestPhrase(c: CityRecord, userField: string): string | null {
  if (c.schoolScore !== null && c.schoolScore >= 80) return "top schools";
  if (c.greenSpacePct !== null && c.greenSpacePct >= 25)
    return "exceptional green space";
  const occ = findOccupation(userField);
  const category = occ ? occ.category : userField.trim().toLowerCase();
  if (c.careerHubFor.includes(category))
    return `career-aligned for ${userField}`;
  if (c.safetyScore !== null && c.safetyScore >= 80) return "very safe";
  if (c.costOfLiving !== null && c.costOfLiving <= 95)
    return "affordable for a major metro";
  return null;
}

function worstPhrase(
  c: CityRecord,
  takeHome: number,
): string | null {
  if (c.childcareMonthly !== null && takeHome > 0) {
    const pct = Math.round(((c.childcareMonthly * 12) / takeHome) * 100);
    if (pct >= 25) return `childcare eats ${pct}% of your take-home`;
  }
  if (c.medianRent2BR !== null && c.medianRent2BR >= 3000)
    return `rent is $${c.medianRent2BR.toLocaleString("en-US")}/mo for a 2BR`;
  if (c.schoolScore !== null && c.schoolScore < 70) return "schools below median";
  if (c.greenSpacePct !== null && c.greenSpacePct < 10)
    return "less green than you'd like";
  if (c.safetyScore !== null && c.safetyScore < 70)
    return "safety below average for the size";
  return null;
}

function composeTradeoff(
  c: CityRecord,
  confidence: CityScore["confidence"],
  userField: string,
  takeHome: number,
): string {
  if (confidence === "unknown") {
    return "not enough data yet — v1 dataset doesn't cover this metro.";
  }
  const best = bestPhrase(c, userField);
  const worst = worstPhrase(c, takeHome);
  if (best && worst) return `${best}, but ${worst}.`;
  if (best) return `${best}.`;
  if (worst) return `${worst}.`;
  return "balanced across the board.";
}

// ---- the function ---------------------------------------------------------

const ALL_FACTORS: AtlasFactor[] = [
  "schools",
  "safety",
  "greenSpace",
  "communitySize",
  "cost",
  "rentBurden",
  "childcareCost",
  "weather",
  "careerFit",
  "partnerCareer",
];

/** preference factors don't have an objective "better." dot logic still
 *  uses the value, but the UI shows a descriptive label instead of a number
 *  and the tone palette emphasizes match-to-preference, not value judgement. */
export const PREFERENCE_FACTORS: ReadonlySet<AtlasFactor> = new Set<AtlasFactor>([
  "communitySize",
  "weather",
]);

export function scoreCity(c: CityRecord, ctx: ScoreContext): CityScore {
  const totalIncome = ctx.userIncome + (ctx.partnerIncome ?? 0);
  const state = stateAbbrevFromCity(c.name);
  const { takeHome } = computeTakeHome(
    totalIncome,
    Math.max(0, ctx.kidsWanted),
    ctx.filing,
    state,
  );
  const derived = { totalIncome, takeHome };

  const perFactor = {} as Record<AtlasFactor, FactorScore>;
  let weightedSum = 0;
  let weightTotal = 0;
  let availableCount = 0;

  for (const f of ALL_FACTORS) {
    const value = factorValue(c, f, ctx, derived);
    const weight = ctx.weights[f];
    const raw = rawFor(c, f, ctx);

    if (value === null) {
      perFactor[f] = { value: null, weighted: null, raw };
      continue;
    }
    if (weight > 0) {
      availableCount += 1;
      weightedSum += value * weight;
      weightTotal += weight;
      perFactor[f] = { value, weighted: value * weight, raw };
    } else {
      perFactor[f] = { value, weighted: null, raw };
    }
  }

  let confidence: CityScore["confidence"];
  if (availableCount >= 5) confidence = "high";
  else if (availableCount >= 2) confidence = "partial";
  else confidence = "unknown";

  const total =
    availableCount >= 2 && weightTotal > 0
      ? Math.round(weightedSum / weightTotal)
      : null;

  return {
    city: c,
    total,
    perFactor,
    honestTradeoff: composeTradeoff(c, confidence, ctx.userField, takeHome),
    confidence,
  };
}
