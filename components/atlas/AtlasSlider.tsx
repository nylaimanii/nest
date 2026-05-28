"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { MonoLabel } from "./MonoLabel";

export interface AtlasSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** how to render the value on the top-right of the row (default = String). */
  format?: (v: number) => string;
  className?: string;
}

export function AtlasSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  className,
}: AtlasSliderProps) {
  const range = Math.max(max - min, 1);
  const pct = Math.min(Math.max(((value - min) / range) * 100, 0), 100);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <MonoLabel>{label}</MonoLabel>
        <span className="font-mono text-[0.85rem] text-ink">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        aria-label={label}
        className="atlas-slider"
        style={{
          background: `linear-gradient(to right, var(--color-green) 0%, var(--color-green) ${pct}%, var(--color-line) ${pct}%, var(--color-line) 100%)`,
        }}
      />
    </div>
  );
}
