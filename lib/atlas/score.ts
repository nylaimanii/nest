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
  cost: number;
  safety: number;
  greenSpace: number;
  careerFit: number;
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

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

// ---- per-factor 0–100 scoring (higher = better for kid) -------------------

function schoolsScore(c: CityRecord): number | null {
  return c.schoolScore;
}

/** invert COL: 80 → 100, 180 → 0; clamped. */
function costScore(c: CityRecord): number | null {
  if (c.costOfLiving === null) return null;
  return clamp(100 - (c.costOfLiving - 80), 0, 100);
}

function safetyScore(c: CityRecord): number | null {
  return c.safetyScore;
}

/** 30%+ green = 100; linear from 0. */
function greenScore(c: CityRecord): number | null {
  if (c.greenSpacePct === null) return null;
  return clamp((c.greenSpacePct / 30) * 100, 0, 100);
}

/**
 * resolve the user's free-string field to an occupation category (tech,
 * healthcare, ...) and match against the city's careerHubFor tags. unknown
 * fields fall through to the raw string so a user typing a category name
 * directly (e.g. "tech") still scores.
 *
 * match → 100; data but no match → 50; no data → null.
 */
function careerScore(c: CityRecord, userField: string): number | null {
  if (c.careerHubFor.length === 0) return null;
  const occ = findOccupation(userField);
  const category = occ ? occ.category : userField.trim().toLowerCase();
  return c.careerHubFor.includes(category) ? 100 : 50;
}

function factorValue(
  c: CityRecord,
  f: AtlasFactor,
  userCareer: string,
): number | null {
  switch (f) {
    case "schools":
      return schoolsScore(c);
    case "cost":
      return costScore(c);
    case "safety":
      return safetyScore(c);
    case "greenSpace":
      return greenScore(c);
    case "careerFit":
      return careerScore(c, userCareer);
  }
}

function rawFor(c: CityRecord, f: AtlasFactor): string {
  switch (f) {
    case "schools":
      return c.schoolScore === null ? "— v1 dataset" : String(c.schoolScore);
    case "cost":
      return c.costOfLiving === null
        ? "— v1 dataset"
        : `${c.costOfLiving} index`;
    case "safety":
      return c.safetyScore === null ? "— v1 dataset" : String(c.safetyScore);
    case "greenSpace":
      return c.greenSpacePct === null ? "— v1 dataset" : `${c.greenSpacePct}%`;
    case "careerFit":
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
  userIncome: number,
  filing: FilingStatus,
  userKidsWanted: number,
): string | null {
  if (c.childcareMonthly !== null && userIncome > 0) {
    // real take-home in THIS city (its state tax) at the user's filing /
    // CTC eligibility — same engine model.ts uses.
    const state = stateAbbrevFromCity(c.name);
    const { takeHome } = computeTakeHome(
      userIncome,
      Math.max(0, userKidsWanted),
      filing,
      state,
    );
    if (takeHome > 0) {
      const pct = Math.round(((c.childcareMonthly * 12) / takeHome) * 100);
      if (pct >= 25) return `childcare eats ${pct}% of your take-home`;
    }
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
  userCareer: string,
  userIncome: number,
  filing: FilingStatus,
  userKidsWanted: number,
): string {
  if (confidence === "unknown") {
    return "not enough data yet — v1 dataset doesn't cover this metro.";
  }
  const best = bestPhrase(c, userCareer);
  const worst = worstPhrase(c, userIncome, filing, userKidsWanted);
  // keep all branches in atlas lowercase tone, matching CLAUDE.md.
  if (best && worst) return `${best}, but ${worst}.`;
  if (best) return `${best}.`;
  if (worst) return `${worst}.`;
  return "balanced across the board.";
}

// ---- the function ---------------------------------------------------------

const ALL_FACTORS: AtlasFactor[] = [
  "schools",
  "cost",
  "safety",
  "greenSpace",
  "careerFit",
];

export function scoreCity(
  c: CityRecord,
  w: AtlasWeights,
  userIncome: number,
  userCareer: string,
  filing: FilingStatus,
  userKidsWanted: number,
): CityScore {
  const perFactor = {} as Record<AtlasFactor, FactorScore>;
  let weightedSum = 0;
  let weightTotal = 0;
  let availableCount = 0;

  for (const f of ALL_FACTORS) {
    const value = factorValue(c, f, userCareer);
    const weight = w[f];
    const raw = rawFor(c, f);

    if (value === null) {
      perFactor[f] = { value: null, weighted: null, raw };
      continue;
    }
    // present in perFactor for the panel; only counted toward total when
    // the user actually weights it.
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
  if (availableCount >= 4) confidence = "high";
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
    honestTradeoff: composeTradeoff(
      c,
      confidence,
      userCareer,
      userIncome,
      filing,
      userKidsWanted,
    ),
    confidence,
  };
}
