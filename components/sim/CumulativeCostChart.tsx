"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { ChartFrame, useChartFrame } from "./ChartFrame";

type Row = { year: number; cum: number };

function CumTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const row = p.payload as Row;
  const value = typeof p.value === "number" ? p.value : row.cum;
  return (
    <div className="border border-line bg-bone px-3 py-2 font-mono text-[0.75rem]">
      <div className="text-muted">{row.year}</div>
      <div className="text-ink">{fmtUSDFull(value)}</div>
    </div>
  );
}

function CumulativeCostBody() {
  const { width, height } = useChartFrame();
  const snap = useSimStore((s) => s.snapshot);
  const data: Row[] = snap.years.map((year, i) => ({
    year,
    cum: snap.cumulativeChildCost[i],
  }));

  return (
    <AreaChart
      width={width}
      height={height}
      data={data}
      margin={{ top: 6, right: 8, bottom: 4, left: 8 }}
    >
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
      <Tooltip
        content={CumTooltip}
        cursor={{ stroke: CHART.line, strokeDasharray: "2 4" }}
      />
      <Area
        type="monotone"
        dataKey="cum"
        stroke={CHART.green}
        strokeWidth={2}
        fill={CHART.green}
        fillOpacity={0.12}
        dot={false}
        activeDot={{
          r: 3,
          fill: CHART.green,
          stroke: CHART.bone,
          strokeWidth: 2,
        }}
        isAnimationActive={false}
      />
    </AreaChart>
  );
}

export function CumulativeCostChart() {
  return (
    <ChartFrame
      label="CUMULATIVE CHILD COST"
      caption="what it adds up to over ten years."
    >
      <CumulativeCostBody />
    </ChartFrame>
  );
}
