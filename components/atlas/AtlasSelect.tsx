"use client";

import { cn } from "@/lib/utils";
import { MonoLabel } from "./MonoLabel";

export interface AtlasSelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  className?: string;
}

/**
 * Atlas-tone <select>. mono, bone bg, hairline bottom border (no chrome
 * default look); matches AtlasTextInput so the YOUR SITUATION block reads
 * as one editorial form.
 */
export function AtlasSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: AtlasSelectProps<T>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <MonoLabel>{label}</MonoLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value as T)}
        aria-label={label}
        className="w-full rounded-[2px] border-b border-line bg-transparent py-2 font-mono text-[0.95rem] text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
