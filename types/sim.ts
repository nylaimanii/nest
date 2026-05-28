// simulation domain types — the contract between the deterministic engine
// (lib/sim/) and the UI. money/timing/fertility numbers come from CODE,
// never from the LLM (CLAUDE.md determinism rule).

export type SimInputs = {
  /** 22–45 */
  userAge: number;
  /** 22–45 or null (single) */
  partnerAge: number | null;
  /** annual gross, USD */
  householdIncome: number;
  /** free-string for now; map step replaces this */
  city: string;
  /** 0–4 */
  kidsWanted: number;
  /** 24–42, must be >= userAge */
  startAge: number;
  /** affects earnings shape */
  careerTrack: "steady" | "ascending" | "demanding";
};

export type SimSnapshot = {
  inputs: SimInputs;
  /** length 10: calendar years (now..now+9) */
  years: number[];
  /** length 10: user's age each year */
  ageOverTime: number[];
  /** length 10: household cash flow each year (gross - taxes - kid costs) */
  netCashByYear: number[];
  /** length 10: running total of kid costs */
  cumulativeChildCost: number[];
  /** chance of conceiving at startAge (0..1, 2 decimals) */
  fertilityProbAtStart: number;
  /** negative number vs. no-kids baseline */
  lifetimeEarningsDelta: number;
  /** per-year, current rules-of-thumb */
  benefitsCapturable: number;
  /** peak year kid-cost / take-home (0..1) */
  burdenRatio: number;
};
