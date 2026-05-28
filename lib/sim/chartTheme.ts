// chart theme — mirrors the atlas tokens in app/globals.css. recharts can't
// resolve CSS variables in its non-DOM render path (axis labels, ticks),
// so the hex values are duplicated here as literals. keep in sync with @theme.

export const CHART = {
  bone: "#FAF8F4",
  ink: "#1A1A17",
  muted: "#6B655C",
  line: "#D8D2C8",
  card: "#F2EEE6",
  green: "#1F4D3A",
  green2: "#2E6F52",
  terracotta: "#9C3B2E",
} as const;

// shared axis style — mono ticks, hairline axis line, no tick line marks.
export const AXIS_TICK = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fill: CHART.muted,
} as const;

export const AXIS_LINE = { stroke: CHART.line } as const;

// horizontal hairlines only — no vertical grid (per atlas restraint).
export const GRID = {
  stroke: CHART.line,
  strokeDasharray: "2 4",
} as const;

// ---- value formatters ----------------------------------------------------

/** compact dollars: `$91k`, `$1.2m`, `$0`, `−$168k`. for axis ticks. */
export function fmtUSD(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}$${m.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (abs >= 1000) return `${sign}$${Math.round(abs / 1000)}k`;
  return `${sign}$${abs}`;
}

/** full dollars with thousands separators, U+2212 for negatives. for tooltips. */
export function fmtUSDFull(n: number): string {
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toLocaleString("en-US");
  return n < 0 ? `−$${formatted}` : `$${formatted}`;
}

/** percent — input already in 0..100. */
export function fmtPct(n: number): string {
  return `${Math.round(n)}%`;
}
