// PLACEHOLDERS — v1 illustrative "drift" assumptions.
// drift = "what tends to happen without active planning":
// people start later than they planned, and the fertility falloff at the
// later age means fewer of the kids they wanted actually arrive.

import type { SimInputs, SimSnapshot } from "@/types";
import { fertilityAt, runSim } from "./model";

/**
 * how many years a planned start tends to slip. scales modestly with how
 * late the wanted start already is — later planners drift more, which lets
 * bigger gaps emerge under the same fertility ratio. placeholder.
 */
function driftDelayFor(startAge: number): number {
  return 3 + Math.max(0, Math.floor((startAge - 32) / 3));
}
/** ceiling for the drift start age (after this it's a different conversation). */
const DRIFT_MAX_AGE = 44;

/** carrier age (in this v1, the lower of user/partner) at a given start age. */
function carrierAgeAt(inputs: SimInputs, startAge: number): number {
  const carrierNow = Math.min(
    inputs.userAge,
    inputs.partnerAge ?? inputs.userAge,
  );
  return carrierNow + (startAge - inputs.userAge);
}

/** kids actually achieved on drift = wanted × (drift fertility ÷ wanted fertility). */
function driftKidsFor(inputs: SimInputs): {
  driftStartAge: number;
  driftKids: number;
} {
  const driftStartAge = Math.min(
    inputs.startAge + driftDelayFor(inputs.startAge),
    DRIFT_MAX_AGE,
  );
  const fertWanted = fertilityAt(carrierAgeAt(inputs, inputs.startAge));
  const fertDrift = fertilityAt(carrierAgeAt(inputs, driftStartAge));
  const ratio = fertWanted > 0 ? fertDrift / fertWanted : 1;
  const driftKids = Math.max(
    0,
    Math.min(inputs.kidsWanted, Math.round(inputs.kidsWanted * ratio)),
  );
  return { driftStartAge, driftKids };
}

/** the simulation snapshot for the drift path — same engine, drift-adjusted inputs. */
export function runDrift(inputs: SimInputs): SimSnapshot {
  const { driftStartAge, driftKids } = driftKidsFor(inputs);
  return runSim({
    ...inputs,
    startAge: driftStartAge,
    kidsWanted: driftKids,
  });
}

export interface GapSummary {
  wantedKids: number;
  likelyKids: number;
  kidGap: number;
  wantedStartAge: number;
  driftStartAge: number;
  /** percent (0–100). */
  fertilityWanted: number;
  /** percent (0–100). */
  fertilityDrift: number;
  /** annual benefits the wanted path would already have captured. */
  benefitsLeftOnTable: number;
  /** 2–3 short honest strings, all templated from the numbers above. */
  frictions: string[];
}

export function gapSummary(inputs: SimInputs): GapSummary {
  const { driftStartAge, driftKids } = driftKidsFor(inputs);
  const fertWanted = fertilityAt(carrierAgeAt(inputs, inputs.startAge));
  const fertDrift = fertilityAt(carrierAgeAt(inputs, driftStartAge));

  const wantedKids = inputs.kidsWanted;
  const kidGap = wantedKids - driftKids;

  // mirrors the benefits formula in model.ts so the two snapshots agree.
  const benefitsLeftOnTable =
    Math.round(
      (2000 * inputs.kidsWanted +
        (inputs.householdIncome < 150000 ? 6000 : 3000)) /
        100,
    ) * 100;

  const delta = driftStartAge - inputs.startAge;
  const frictions: string[] = [];
  if (delta >= 2) {
    frictions.push(`you start about ${delta} years later than you intend.`);
  }
  if (kidGap >= 1) {
    frictions.push(
      `that delay most likely costs you ${kidGap} of the ${wantedKids} kids you want.`,
    );
  }
  frictions.push(
    `you're leaving about $${benefitsLeftOnTable.toLocaleString("en-US")}/yr in benefits unclaimed.`,
  );

  return {
    wantedKids,
    likelyKids: driftKids,
    kidGap,
    wantedStartAge: inputs.startAge,
    driftStartAge,
    fertilityWanted: Math.round(fertWanted * 100),
    fertilityDrift: Math.round(fertDrift * 100),
    benefitsLeftOnTable,
    frictions,
  };
}
