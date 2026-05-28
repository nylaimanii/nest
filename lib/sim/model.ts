// PLACEHOLDERS — every constant here is v1 illustrative.
// Replace with sourced values + per-city deltas in lib/sim/model.real.ts later.

import type { SimInputs, SimSnapshot } from "@/types";

// ----- placeholder constants ------------------------------------------------

// per-kid annual cost in USD, indexed by the child's age (0..9).
// front-loaded toward childcare-heavy early years, taper after school start.
const KID_COST_BY_AGE = [
  22000, 22000, 22000, 18000, 16000, 16000, 14000, 14000, 14000, 14000,
] as const;

// gross-income multipliers per year over 10 years, by careerTrack.
const INCOME_TRACK: Record<SimInputs["careerTrack"], readonly number[]> = {
  steady: [1.0, 1.02, 1.03, 1.04, 1.05, 1.06, 1.07, 1.08, 1.09, 1.1],
  ascending: [1.0, 1.05, 1.1, 1.16, 1.22, 1.28, 1.34, 1.4, 1.46, 1.52],
  demanding: [1.0, 1.08, 1.16, 1.24, 1.32, 1.4, 1.48, 1.56, 1.64, 1.72],
};

// flat effective tax rate (placeholder).
const TAX_RATE = 0.24;
const TAKEHOME = 1 - TAX_RATE;

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
  const arrivalOffsets: number[] = [];
  for (let k = 0; k < inputs.kidsWanted; k++) {
    const arrivalAge = inputs.startAge + k * 2.5;
    arrivalOffsets.push(Math.round(arrivalAge) - inputs.userAge);
  }

  // per-year totals
  const kidCost: number[] = [];
  const grossIncome: number[] = [];
  const netCashByYear: number[] = [];
  const cumulativeChildCost: number[] = [];

  let running = 0;
  const track = INCOME_TRACK[inputs.careerTrack];

  for (let i = 0; i < HORIZON; i++) {
    let yearKidCost = 0;
    for (const off of arrivalOffsets) {
      const kidAge = i - off;
      if (kidAge >= 0 && kidAge <= 9) {
        yearKidCost += KID_COST_BY_AGE[kidAge];
      }
    }
    const gross = inputs.householdIncome * track[i];
    const net = round100(gross * TAKEHOME - yearKidCost);

    kidCost.push(yearKidCost);
    grossIncome.push(gross);
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

  // negative number vs. no-kids baseline.
  const lifetimeEarningsDelta = -round100(
    0.07 * inputs.householdIncome * 10 * inputs.kidsWanted,
  );

  const benefitsCapturable = round100(
    2000 * inputs.kidsWanted +
      (inputs.householdIncome < 150000 ? 6000 : 3000),
  );

  // peak burden ratio across the 10-year window.
  let peakBurden = 0;
  for (let i = 0; i < HORIZON; i++) {
    const takehome = grossIncome[i] * TAKEHOME;
    const ratio = takehome > 0 ? kidCost[i] / takehome : 0;
    if (ratio > peakBurden) peakBurden = ratio;
  }
  const burdenRatio = round2(clamp(peakBurden, 0, 1));

  return Object.freeze({
    inputs,
    years,
    ageOverTime,
    netCashByYear,
    cumulativeChildCost,
    fertilityProbAtStart,
    lifetimeEarningsDelta,
    benefitsCapturable,
    burdenRatio,
  }) as SimSnapshot;
}
