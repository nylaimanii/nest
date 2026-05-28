"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import {
  AXIS_LINE,
  AXIS_TICK,
  CHART,
  GRID,
  fmtUSD,
  fmtUSDFull,
} from "@/lib/sim/chartTheme";
import { useSimStore } from "@/store/sim";
import { ChartFrame } from "./ChartFrame";

type Row = { year: number; net: number };

function CashTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const row = p.payload as Row;
  const value = typeof p.value === "number" ? p.value : row.net;
  return (
    <div className="border border-line bg-bone px-3 py-2 font-mono text-[0.75rem] shadow-none">
      <div className="text-muted">{row.year}</div>
      <div className="text-ink">{fmtUSDFull(value)}</div>
    </div>
  );
}

export function NetCashChart() {
  const snap = useSimStore((s) => s.snapshot);
  const data: Row[] = snap.years.map((year, i) => ({
    year,
    net: snap.netCashByYear[i],
  }));
  const anyUnderwater = snap.netCashByYear.some((n) => n < 0);

  // Recharts measures the DOM in ResponsiveContainer — render only after
  // mount to keep SSR and client hydration identical (empty body on SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ChartFrame
      label="NET HOUSEHOLD CASH"
      caption="after taxes and child costs, each year."
    >
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid
              stroke={GRID.stroke}
              strokeDasharray={GRID.strokeDasharray}
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              interval={1}
              padding={{ left: 4, right: 4 }}
            />
            <YAxis
              tickFormatter={fmtUSD}
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              width={52}
            />
            {anyUnderwater ? (
              <ReferenceLine
                y={0}
                stroke={CHART.terracotta}
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            ) : null}
            <Tooltip
              content={CashTooltip}
              cursor={{ stroke: CHART.line, strokeDasharray: "2 4" }}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke={CHART.green}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 3,
                fill: CHART.green,
                stroke: CHART.bone,
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </ChartFrame>
  );
}
