"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { MonoLabel } from "./MonoLabel";

export interface AtlasDialProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** how to render the live value above the thumb (default = String). */
  format?: (v: number) => string;
  /** small all-caps mono label pinned to the left edge under the track. */
  leftAnchor?: string;
  /** small all-caps mono label pinned to the right edge under the track. */
  rightAnchor?: string;
  /** small italic mono muted line rendered under the anchors. used by
   *  onboarding to surface "drag to set work intensity" when the user
   *  hasn't touched the dial yet (so the visible value isn't read as a
   *  confirmed choice). */
  placeholder?: string;
  className?: string;
}

/**
 * editorial intensity dial. atlas-tone slider whose visual weight comes
 * from the anchor copy at the extremes ("STEADY" ↔ "INTENSE") rather
 * than a numeric scale. the live value floats just above the thumb. for
 * pure-numeric tuning use AtlasSlider; this one is for *feel*.
 */
export function AtlasDial({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  leftAnchor,
  rightAnchor,
  placeholder,
  className,
}: AtlasDialProps) {
  const range = Math.max(max - min, 1);
  const pct = Math.min(Math.max(((value - min) / range) * 100, 0), 100);

  // when a placeholder is shown, dim the live value + track so it reads
  // as "not yet chosen" rather than a confident displayed setting.
  const unset = !!placeholder;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <MonoLabel>{label}</MonoLabel>
      <div className="relative flex flex-col gap-2 pt-6">
        {/* live value, floats above the thumb position. */}
        <span
          className={cn(
            "pointer-events-none absolute -translate-x-1/2 font-mono text-[0.8rem]",
            unset ? "text-muted" : "text-ink",
          )}
          style={{ left: `${pct}%`, top: 0 }}
        >
          {format(value)}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          aria-label={label}
          className={cn("atlas-slider", unset && "opacity-60")}
          style={{
            background: `linear-gradient(to right, var(--color-green) 0%, var(--color-green) ${pct}%, var(--color-line) ${pct}%, var(--color-line) 100%)`,
          }}
        />
        {leftAnchor || rightAnchor ? (
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted">
              {leftAnchor ?? ""}
            </span>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted">
              {rightAnchor ?? ""}
            </span>
          </div>
        ) : null}
        {placeholder ? (
          <span className="font-mono text-[0.7rem] italic text-muted">
            {placeholder}
          </span>
        ) : null}
      </div>
    </div>
  );
}
