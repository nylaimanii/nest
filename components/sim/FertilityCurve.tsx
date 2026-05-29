"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
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
  fmtPct,
} from "@/lib/sim/chartTheme";
import { fertilityAt } from "@/lib/sim/model";
import { useSimStore } from "@/store/sim";
import { ChartFrame, useChartFrame } from "./ChartFrame";

type Row = { age: number; prob: number };

// sample the same curve the model uses across the broader window the input
// now allows (18-102 clamps to anchor edges at 18 and 42 respectively).
// 45-50 is rendered behind a faint terracotta band as the "outside reliable
// range" zone — the curve is honest there (clamped to 20% from age 42 on),
// but the user shouldn't read precision into it.
function buildCurve(): Row[] {
  const out: Row[] = [];
  for (let age = 18; age <= 50; age++) {
    out.push({ age, prob: Math.round(fertilityAt(age) * 1000) / 10 });
  }
  return out;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

function CurveTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const row = p.payload as Row;
  const value = typeof p.value === "number" ? p.value : row.prob;
  return (
    <div className="border border-line bg-bone px-3 py-2 font-mono text-[0.75rem]">
      <div className="text-muted">age {row.age}</div>
      <div className="text-ink">{Math.round(value)}%</div>
    </div>
  );
}

function FertilityCurveBody() {
  const { width, height } = useChartFrame();
  const inputs = useSimStore((s) => s.inputs);
  const snap = useSimStore((s) => s.snapshot);

  // same projection the model uses. carrierAgeAtStart is the honest
  // unclamped value (shown in the label); the marker now sits at the
  // visible-chart-clamped position [18, 50] — 18-50 covers most realistic
  // planning ages, so the dot lands on the curve, not pinned to an edge.
  const carrierAgeAtStart = useMemo(() => {
    const carrierNow = Math.min(
      inputs.userAge,
      inputs.partnerAge ?? inputs.userAge,
    );
    return carrierNow + (inputs.startAge - inputs.userAge);
  }, [inputs.userAge, inputs.partnerAge, inputs.startAge]);
  const markerAge = clamp(carrierAgeAtStart, 18, 50);
  const markerPct = Math.round(snap.fertilityProbAtStart * 100);

  const data = useMemo(buildCurve, []);

  // near the right edge of the chart, sit the label to the left of the
  // dot so it doesn't clip; otherwise float it above.
  const labelPosition: "top" | "left" = markerAge >= 46 ? "left" : "top";

  return (
    <LineChart
      width={width}
      height={height}
      data={data}
      margin={{ top: 14, right: 16, bottom: 4, left: 8 }}
    >
      <CartesianGrid
        stroke={GRID.stroke}
        strokeDasharray={GRID.strokeDasharray}
        vertical={false}
      />
      <XAxis
        dataKey="age"
        type="number"
        domain={[18, 50]}
        ticks={[20, 25, 30, 35, 40, 45, 50]}
        tick={AXIS_TICK}
        axisLine={AXIS_LINE}
        tickLine={false}
        padding={{ left: 4, right: 4 }}
      />
      <YAxis
        type="number"
        domain={[0, 100]}
        ticks={[0, 25, 50, 75, 100]}
        tickFormatter={fmtPct}
        tick={AXIS_TICK}
        axisLine={AXIS_LINE}
        tickLine={false}
        width={42}
      />
      <Tooltip
        content={CurveTooltip}
        cursor={{ stroke: CHART.line, strokeDasharray: "2 4" }}
      />

      {/* "outside reliable range" band: 45-50 in faint terracotta. fertilityAt
          clamps to 0.20 for ages ≥42, so values in this band are honestly the
          floor of the curve — the band marks "treat with caution" without
          changing the math. */}
      <ReferenceArea
        x1={45}
        x2={50}
        y1={0}
        y2={100}
        fill={CHART.terracotta}
        fillOpacity={0.05}
        stroke="none"
      />

      {/* the curve itself — ink, monotone, no dots. */}
      <Line
        type="monotone"
        dataKey="prob"
        stroke={CHART.ink}
        strokeWidth={1.5}
        dot={false}
        activeDot={false}
        isAnimationActive={false}
      />

      {/* dropped reference lines through the marker. */}
      <ReferenceLine
        x={markerAge}
        stroke={CHART.green}
        strokeDasharray="3 3"
        strokeWidth={1}
      />
      <ReferenceLine
        y={markerPct}
        stroke={CHART.green}
        strokeOpacity={0.25}
        strokeDasharray="3 3"
        strokeWidth={1}
      />

      {/* the marker — recomputes from the live snapshot. */}
      <ReferenceDot
        x={markerAge}
        y={markerPct}
        r={6}
        fill={CHART.green}
        stroke={CHART.bone}
        strokeWidth={2}
      >
        <Label
          value={`${markerPct}% @ age ${carrierAgeAtStart}`}
          position={labelPosition}
          offset={12}
          fill={CHART.green}
          fontFamily="var(--font-mono)"
          fontSize={11}
          fontWeight={500}
        />
      </ReferenceDot>
    </LineChart>
  );
}

export function FertilityCurve() {
  return (
    <ChartFrame
      label="FERTILITY BY START AGE"
      caption="your chosen start age, marked on the curve. fertility data is reliable for ages 24–42; outside that, we report boundary values."
      height={240}
    >
      <FertilityCurveBody />
    </ChartFrame>
  );
}
