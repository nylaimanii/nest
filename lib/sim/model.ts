// PLACEHOLDERS — every constant here is v1 illustrative.
// Replace with sourced values + per-city deltas in lib/sim/model.real.ts later.

import type { SimInputs, SimSnapshot } from "@/types";
import { findCityByName } from "@/lib/atlas/cities";
import {
  DEFAULT_OCCUPATION,
  findOccupation,
  type Occupation,
} from "./fields";
import { computeTakeHome, stateAbbrevFromCity, type FilingStatus } from "./tax";

// ----- placeholder constants ------------------------------------------------

// fallback per-kid annual cost in USD, indexed by the child's age (0..9).
// only used when the user's city isn't in the atlas dataset. shape (full
// daycare → school taper) stays the same as the sourced curve below.
const KID_COST_BY_AGE_FALLBACK = [
  22000, 22000, 22000, 18000, 16000, 16000, 14000, 14000, 14000, 14000,
] as const;

// childcare-heavy years 0–3 at full annual; tapers post-school start.
const AGE_MULTIPLIERS = [1, 1, 1, 0.8, 0.6, 0.6, 0.4, 0.4, 0.4, 0.4] as const;

/** city-sourced 10-year cost curve per kid. falls back to placeholder. */
function kidCostCurveFor(city: string): {
  curve: number[];
  sourced: boolean;
  childcareMonthlyUsed: number;
} {
  const hit = findCityByName(city);
  if (hit && hit.childcareMonthly !== null) {
    const annual = hit.childcareMonthly * 12;
    const curve = AGE_MULTIPLIERS.map((m) =>
      Math.round((annual * m) / 100) * 100,
    );
    return {
      curve,
      sourced: true,
      childcareMonthlyUsed: hit.childcareMonthly,
    };
  }
  return {
    curve: Array.from(KID_COST_BY_AGE_FALLBACK),
    sourced: false,
    // the fallback first-three-years cost ÷ 12, just to give the UI a number.
    childcareMonthlyUsed: Math.round(KID_COST_BY_AGE_FALLBACK[0] / 12 / 100) * 100,
  };
}

/**
 * income grows faster the more intense the work, with diminishing returns
 * past 60hrs. base growth = 1.5%/year. each hour over 40 adds ~0.2% annual
 * growth, capped at 8% (= 0.015 + 0.065). values below 40 don't subtract
 * below the floor — a 30hr/wk schedule still grows at base 1.5%/year.
 */
function yearGrowthRate(workIntensity: number): number {
  return 0.015 + Math.min(0.065, Math.max(0, (workIntensity - 40) * 0.002));
}

/**
 * time-poverty penalty on kidCost as it enters the BURDEN ratio (never the
 * dollar figures shown in the panel). past 55hrs/week, every extra hour
 * adds 0.5% perceived burden, capped at +15%. for ≤55, multiplier = 1.
 */
function timePenaltyMultiplier(workIntensity: number): number {
  if (workIntensity <= 55) return 1;
  return Math.min(1.15, 1 + (workIntensity - 55) * 0.005);
}

function incomeStabilityFor(volatility: number): SimSnapshot["incomeStability"] {
  if (volatility < 0.1) return "high";
  if (volatility < 0.2) return "moderate";
  return "low";
}

// tax math now lives in lib/sim/tax.ts (2026 federal brackets + std
// deduction + CTC + 10-state lookup). drift.ts/score.ts frictions still
// use a 0.76 placeholder in their human-readable phrases — out of scope
// for this step.

// fertility curve anchors: [carrier age, chance of conceiving].
const FERTILITY_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [24, 0.94],
  [28, 0.86],
  [32, 0.76],
  [35, 0.66],
  [37, 0.52],
  [39, 0.38],
  [42, 0.2],
];

const HORIZON = 10;

// ----- helpers --------------------------------------------------------------

const round100 = (n: number) => Math.round(n / 100) * 100;
const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

/** linear interpolation across the fertility anchors, clamped to [0.20, 0.94].
 *  exported so the FertilityCurve chart can sample the same curve. */
export function fertilityAt(age: number): number {
  const lo = FERTILITY_ANCHORS[0];
  const hi = FERTILITY_ANCHORS[FERTILITY_ANCHORS.length - 1];
  if (age <= lo[0]) return lo[1];
  if (age >= hi[0]) return hi[1];
  for (let i = 0; i < FERTILITY_ANCHORS.length - 1; i++) {
    const [a1, p1] = FERTILITY_ANCHORS[i];
    const [a2, p2] = FERTILITY_ANCHORS[i + 1];
    if (age >= a1 && age <= a2) {
      const t = (age - a1) / (a2 - a1);
      return p1 + t * (p2 - p1);
    }
  }
  return clamp(0.5, 0.2, 0.94);
}

// ----- the function --------------------------------------------------------

export function runSim(inputs: SimInputs): SimSnapshot {
  const baseYear = new Date().getFullYear();

  const years: number[] = [];
  const ageOverTime: number[] = [];
  for (let i = 0; i < HORIZON; i++) {
    years.push(baseYear + i);
    ageOverTime.push(inputs.userAge + i);
  }

  // kid arrival year offsets (0..HORIZON-1 or beyond if outside window).
  // spaced 2.5 years apart starting at startAge, rounded to whole years.
  // for high kidsWanted (5+), some arrivals land past the 10-yr horizon —
  // that's intentional: those kids don't contribute to the in-window cost,
  // and the model silently ignores them via the kidAge bounds check below.
  const arrivalOffsets: number[] = [];
  for (let k = 0; k < inputs.kidsWanted; k++) {
    const arrivalAge = inputs.startAge + k * 2.5;
    arrivalOffsets.push(Math.round(arrivalAge) - inputs.userAge);
  }

  // per-year totals
  const kidCost: number[] = [];
  const grossIncome: number[] = [];
  const takeHomeByYear: number[] = [];
  const netCashByYear: number[] = [];
  const cumulativeChildCost: number[] = [];

  let running = 0;

  // resolve USER occupation — null fall-through means the user typed
  // something not in our BLS-sourced set, so we use the default shape but
  // report occupationSourced=false to the UI.
  const occMatch: Occupation | null = findOccupation(inputs.field);
  const occ = occMatch ?? DEFAULT_OCCUPATION;
  const occupationSourced = occMatch !== null;
  const occupationUsed = occMatch ? occMatch.label : inputs.field;

  // resolve PARTNER occupation — only meaningful when a partner is present.
  // partner growth uses the same shape so two-earner households compound
  // independently, then we sum gross at each year.
  const hasPartner = inputs.partnerAge != null;
  const partnerOccMatch: Occupation | null =
    hasPartner && inputs.partnerField
      ? findOccupation(inputs.partnerField)
      : null;
  const partnerOcc = partnerOccMatch ?? DEFAULT_OCCUPATION;
  const partnerOccupationSourced = hasPartner ? partnerOccMatch !== null : null;
  const partnerOccupationUsed = hasPartner
    ? (partnerOccMatch ? partnerOccMatch.label : (inputs.partnerField ?? ""))
    : null;

  // BLS growth figures are 10-year cumulative, so divide by 10 to get an
  // annual contribution layered on top of the intensity-driven rate.
  const annualGrowth =
    yearGrowthRate(inputs.workIntensity) + occ.projectedGrowth / 10;
  const partnerAnnualGrowth = hasPartner
    ? yearGrowthRate(inputs.partnerWorkIntensity ?? 0) +
      partnerOcc.projectedGrowth / 10
    : 0;
  const timePenalty = timePenaltyMultiplier(inputs.workIntensity);

  const filing: FilingStatus = hasPartner ? "married_jointly" : "single";
  const state = stateAbbrevFromCity(inputs.city);
  const { curve: kidCostCurve, sourced: childcareSourced, childcareMonthlyUsed } =
    kidCostCurveFor(inputs.city);

  const partnerBase = hasPartner ? inputs.partnerIncome ?? 0 : 0;

  for (let i = 0; i < HORIZON; i++) {
    let yearKidCost = 0;
    // CTC applies to dependents 0–17 — within our 10-year horizon every
    // in-window arrival is below 18, but spec the check for clarity.
    let kidsAlive = 0;
    for (const off of arrivalOffsets) {
      const kidAge = i - off;
      if (kidAge >= 0 && kidAge <= 9) {
        yearKidCost += kidCostCurve[kidAge];
      }
      if (kidAge >= 0 && kidAge <= 17) kidsAlive += 1;
    }
    const userGross = inputs.householdIncome * Math.pow(1 + annualGrowth, i);
    const partnerGross = partnerBase * Math.pow(1 + partnerAnnualGrowth, i);
    const gross = userGross + partnerGross;
    const tax = computeTakeHome(gross, kidsAlive, filing, state);
    const takeHome = tax.takeHome;
    const net = round100(takeHome - yearKidCost);

    kidCost.push(yearKidCost);
    grossIncome.push(gross);
    takeHomeByYear.push(takeHome);
    netCashByYear.push(net);
    running += yearKidCost;
    cumulativeChildCost.push(round100(running));
  }

  // fertility at the start of trying: carrier age = min(userAge, partnerAge)
  // projected forward by (startAge - userAge). exposing this through the
  // startAge slider is the point of the field name.
  const carrierAgeNow = Math.min(
    inputs.userAge,
    inputs.partnerAge ?? inputs.userAge,
  );
  const carrierAgeAtStart = carrierAgeNow + (inputs.startAge - inputs.userAge);
  const fertilityProbAtStart = round2(
    clamp(fertilityAt(carrierAgeAtStart), 0.2, 0.94),
  );

  // combined base for opportunity-cost + benefits-threshold math. for a
  // single-mode user this is just householdIncome; for two-earner it's the
  // sum of both at year 0 (pre-growth), matching how the rest of the engine
  // treats partner contribution.
  const baseTotalIncome = inputs.householdIncome + partnerBase;

  // negative number vs. no-kids baseline.
  const lifetimeEarningsDelta = -round100(
    0.07 * baseTotalIncome * 10 * inputs.kidsWanted,
  );

  const benefitsCapturable = round100(
    2000 * inputs.kidsWanted +
      (baseTotalIncome < 150000 ? 6000 : 3000),
  );

  // peak burden ratio across the 10-year window — time penalty inflates
  // the perceived kidCost in the ratio (not in the cash flow shown), so
  // demanding hours show up as "burden" without lying about the dollar.
  let peakBurden = 0;
  for (let i = 0; i < HORIZON; i++) {
    const th = takeHomeByYear[i];
    const ratio = th > 0 ? (kidCost[i] * timePenalty) / th : 0;
    if (ratio > peakBurden) peakBurden = ratio;
  }
  const burdenRatio = round2(clamp(peakBurden, 0, 1));

  return Object.freeze({
    inputs,
    years,
    ageOverTime,
    netCashByYear,
    takeHomeByYear,
    cumulativeChildCost,
    fertilityProbAtStart,
    lifetimeEarningsDelta,
    benefitsCapturable,
    burdenRatio,
    childcareSourced,
    childcareMonthlyUsed,
    occupationUsed,
    occupationSourced,
    incomeStability: incomeStabilityFor(occ.volatility),
    partnerOccupationUsed,
    partnerOccupationSourced,
    partnerIncomeStability: hasPartner
      ? incomeStabilityFor(partnerOcc.volatility)
      : null,
  }) as SimSnapshot;
}
