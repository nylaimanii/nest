// PLACEHOLDER-2026 — bracket thresholds + standard deduction + CTC mirror
// the IRS 2025 inflation-adjusted numbers (publicly available) and will be
// re-confirmed against the IRS 2026 release before public launch. state
// rates are illustrative flat-effective averages for the 10 cities in
// lib/atlas/cities.ts; unknown states fall through to 0 (no tax assumed).
//
// determinism rule (CLAUDE.md): every number here comes from typescript.

export type FilingStatus = "single" | "married_jointly";

interface Bracket {
  readonly upTo: number;
  readonly rate: number;
}

export const FED_BRACKETS_MJ: readonly Bracket[] = [
  { upTo: 23200, rate: 0.1 },
  { upTo: 94300, rate: 0.12 },
  { upTo: 201050, rate: 0.22 },
  { upTo: 383900, rate: 0.24 },
  { upTo: 487450, rate: 0.32 },
  { upTo: 731200, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

export const FED_BRACKETS_SINGLE: readonly Bracket[] = [
  { upTo: 11600, rate: 0.1 },
  { upTo: 47150, rate: 0.12 },
  { upTo: 100525, rate: 0.22 },
  { upTo: 191950, rate: 0.24 },
  { upTo: 243725, rate: 0.32 },
  { upTo: 609350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

export const STD_DEDUCTION = {
  single: 14600,
  married_jointly: 29200,
} as const;

export const CTC_PER_CHILD = 2000;
export const CTC_INCOME_PHASEOUT_MJ = 400000;
export const CTC_INCOME_PHASEOUT_SINGLE = 200000;

/** flat effective state rates for the 10 metros we currently profile. */
export const STATE_TAX: Record<string, number> = {
  NY: 0.065,
  CA: 0.075,
  MA: 0.05,
  TX: 0.0,
  FL: 0.0,
  WA: 0.0,
  IL: 0.0495,
  PA: 0.0307,
  GA: 0.0539,
  CO: 0.044,
};

// ---- helpers --------------------------------------------------------------

const round100 = (n: number) => Math.round(n / 100) * 100;

/** piecewise marginal-bracket federal tax on taxable income. */
function computeFederalTax(
  taxable: number,
  brackets: readonly Bracket[],
): number {
  if (taxable <= 0) return 0;
  let owed = 0;
  let prev = 0;
  for (const b of brackets) {
    if (taxable <= prev) break;
    const top = Math.min(taxable, b.upTo);
    owed += (top - prev) * b.rate;
    prev = b.upTo;
    if (taxable <= b.upTo) break;
  }
  return owed;
}

/** child tax credit with $50-per-$1k phase-out above filing-status threshold. */
function computeCTC(
  kids: number,
  gross: number,
  filing: FilingStatus,
): number {
  if (kids <= 0) return 0;
  const base = CTC_PER_CHILD * kids;
  const threshold =
    filing === "married_jointly"
      ? CTC_INCOME_PHASEOUT_MJ
      : CTC_INCOME_PHASEOUT_SINGLE;
  if (gross <= threshold) return base;
  const excessThousands = Math.ceil((gross - threshold) / 1000);
  const reduction = excessThousands * 50;
  return Math.max(0, base - reduction);
}

// ---- the function ---------------------------------------------------------

export interface TakeHomeResult {
  federal: number;
  state: number;
  /** child tax credit (positive — added back to take-home). */
  ctc: number;
  takeHome: number;
  /** 0..1, four decimals; 1 − takeHome/gross. */
  effectiveRate: number;
}

export function computeTakeHome(
  gross: number,
  kids: number,
  filing: FilingStatus,
  stateAbbrev: string | null,
): TakeHomeResult {
  if (gross <= 0) {
    return { federal: 0, state: 0, ctc: 0, takeHome: 0, effectiveRate: 0 };
  }
  const deduction = STD_DEDUCTION[filing];
  const taxable = Math.max(0, gross - deduction);
  const brackets =
    filing === "married_jointly" ? FED_BRACKETS_MJ : FED_BRACKETS_SINGLE;

  const federalRaw = computeFederalTax(taxable, brackets);
  const stateRate =
    stateAbbrev && STATE_TAX[stateAbbrev] != null
      ? STATE_TAX[stateAbbrev]
      : 0;
  const stateRaw = stateRate * gross;
  const ctcRaw = computeCTC(kids, gross, filing);
  const takeHomeRaw = gross - federalRaw - stateRaw + ctcRaw;

  return {
    federal: round100(federalRaw),
    state: round100(stateRaw),
    ctc: round100(ctcRaw),
    takeHome: round100(takeHomeRaw),
    effectiveRate: Math.round((1 - takeHomeRaw / gross) * 10000) / 10000,
  };
}

/** parse our "city, st" convention. returns the uppercased 2-letter code or null. */
export function stateAbbrevFromCity(city: string): string | null {
  if (!city) return null;
  const parts = city.split(",").map((s) => s.trim());
  if (parts.length < 2) return null;
  const abbrev = parts[1].toUpperCase();
  if (abbrev.length !== 2) return null;
  return abbrev;
}
