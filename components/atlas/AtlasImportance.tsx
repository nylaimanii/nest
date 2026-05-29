"use client";

import { cn } from "@/lib/utils";
import { MonoLabel } from "./MonoLabel";

export interface AtlasImportanceProps {
  label: string;
  /** 0–5 weight; maps to one of the three tiers below. */
  value: number;
  onChange: (v: number) => void;
}

interface Tier {
  value: 0 | 2 | 5;
  label: string;
  scale: string;
}

const TIERS: ReadonlyArray<Tier> = [
  { value: 0, label: "doesn't matter", scale: "LOW" },
  { value: 2, label: "matters", scale: "MED" },
  { value: 5, label: "matters a lot", scale: "HIGH" },
];

function activeIndex(value: number): 0 | 1 | 2 {
  if (value >= 4) return 2;
  if (value >= 1) return 1;
  return 0;
}

/**
 * 3-tier importance picker for atlas weights. discrete steps map onto the
 * existing 0..5 weight scale: 0 = doesn't matter, 2 = matters, 5 = matters
 * a lot. one row per AtlasWeights key.
 */
export function AtlasImportance({
  label,
  value,
  onChange,
}: AtlasImportanceProps) {
  const ai = activeIndex(value);
  return (
    <div className="flex flex-col gap-2">
      <MonoLabel>{label}</MonoLabel>
      <div className="flex items-end gap-5">
        {TIERS.map((tier, i) => {
          const active = i === ai;
          return (
            <div key={tier.value} className="flex flex-col items-start gap-1">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted">
                {tier.scale}
              </span>
              <button
                type="button"
                onClick={() => onChange(tier.value)}
                aria-pressed={active}
                className={cn(
                  "border-b-2 pb-0.5 font-serif text-[0.85rem] italic transition-colors",
                  active
                    ? "border-green text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {tier.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
