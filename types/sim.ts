// simulation domain types — the contract between the deterministic engine
// (lib/sim/) and the UI. money/timing/fertility numbers come from CODE,
// never from the LLM (CLAUDE.md determinism rule).

export type SimInputs = {
  /** 18–55 */
  userAge: number;
  /** 18–55 or null (single) */
  partnerAge: number | null;
  /** USER'S annual gross, USD. when a partner is present, their income is
   *  tracked separately in partnerIncome and summed into the model. */
  householdIncome: number;
  /** free-string for now; map step replaces this */
  city: string;
  /** 0–4 */
  kidsWanted: number;
  /** 18–102, see RANGES.startAge for the slider window. */
  startAge: number;
  /** USER work hours per week, 30–80. drives the user's income-growth curve. */
  workIntensity: number;
  /** USER occupation label — matched against lib/sim/fields.ts. free-string;
   *  any value the user types is accepted, sourced fields look up salary +
   *  growth + volatility, others fall through to defaults. */
  field: string;

  // ----- partner-side counterparts (null when no partner) ----- //

  /** partner's annual gross USD, null when no partner. */
  partnerIncome: number | null;
  /** partner work hours per week (30–80), null when no partner. */
  partnerWorkIntensity: number | null;
  /** partner occupation label, null when no partner. */
  partnerField: string | null;
};

export type SimSnapshot = {
  inputs: SimInputs;
  /** length 10: calendar years (now..now+9) */
  years: number[];
  /** length 10: user's age each year */
  ageOverTime: number[];
  /** length 10: post-tax household cash flow each year (take-home − kid costs). */
  netCashByYear: number[];
  /** length 10: post-tax take-home each year, BEFORE kid costs are subtracted. */
  takeHomeByYear: number[];
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
  /** true when the user's city is in the atlas dataset with real childcare data. */
  childcareSourced: boolean;
  /** monthly per-kid childcare $ the model used (sourced or fallback estimate),
   *  or null when the user's city isn't in our dataset at all. the cost-curve
   *  math still runs against a placeholder internally so the simulation
   *  doesn't crash, but the panel renders "—" / "NO DATA" instead of a
   *  confident dollar value that would mislabel a different city's number. */
  childcareMonthlyUsed: number | null;
  /** the resolved USER occupation label, or the user's raw input when no match. */
  occupationUsed: string;
  /** true when the user's field matched the BLS-sourced occupation set. */
  occupationSourced: boolean;
  /** stability tier derived from the USER occupation's volatility. */
  incomeStability: "high" | "moderate" | "low";
  /** partner's resolved occupation label, null when no partner. */
  partnerOccupationUsed: string | null;
  /** true when partner's field matched the BLS set; null when no partner. */
  partnerOccupationSourced: boolean | null;
  /** partner's stability tier derived from their occupation's volatility. */
  partnerIncomeStability: "high" | "moderate" | "low" | null;
};
