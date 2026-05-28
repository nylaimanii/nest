"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceDot,
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
  fmtPct,
} from "@/lib/sim/chartTheme";
import { fertilityAt } from "@/lib/sim/model";
import { useSimStore } from "@/store/sim";
import { ChartFrame } from "./ChartFrame";

type Row = { age: number; prob: number };

// sample the same curve the model uses, across the supported age window.
function buildCurve(): Row[] {
  const out: Row[] = [];
  for (let age = 24; age <= 42; age++) {
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

export function FertilityCurve() {
  const inputs = useSimStore((s) => s.inputs);
  const snap = useSimStore((s) => s.snapshot);

  // same projection the model uses, so the dot lands exactly where
  // HonestPanel's `FERTILITY @ START` value comes from.
  const markerAge = useMemo(() => {
    const carrierNow = Math.min(
      inputs.userAge,
      inputs.partnerAge ?? inputs.userAge,
    );
    return clamp(carrierNow + (inputs.startAge - inputs.userAge), 24, 42);
  }, [inputs.userAge, inputs.partnerAge, inputs.startAge]);
  const markerPct = Math.round(snap.fertilityProbAtStart * 100);

  const data = useMemo(buildCurve, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // near the right edge of the chart, sit the label to the left of the
  // dot so it doesn't clip; otherwise float it above.
  const labelPosition: "top" | "left" = markerAge >= 39 ? "left" : "top";

  return (
    <ChartFrame
      label="FERTILITY BY START AGE"
      caption="your chosen start age, marked on the curve. drag it."
      height={240}
    >
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
              domain={[24, 42]}
              ticks={[24, 28, 32, 36, 40]}
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
                value={`${markerPct}% @ age ${markerAge}`}
                position={labelPosition}
                offset={12}
                fill={CHART.green}
                fontFamily="var(--font-mono)"
                fontSize={11}
                fontWeight={500}
              />
            </ReferenceDot>
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </ChartFrame>
  );
}
