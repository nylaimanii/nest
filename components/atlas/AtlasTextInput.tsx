"use client";

import * as React from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { MonoLabel } from "./MonoLabel";

export interface AtlasTextInputProps {
  label: string;
  /** controlled value from the parent (sim store). */
  value: string | number;
  /** fires on every keystroke with the raw string. parent decides whether to commit. */
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** optional small affordance rendered next to the MonoLabel (e.g. "no partner →"). */
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Atlas-tone bare text input. internally buffers the typed string so we
 * don't snap-to-min mid-typing; on blur, numeric inputs clamp up to `min`
 * (snap-to-max not enforced — let users type a temporary out-of-range
 * value while editing). parent receives the eventually-committed value
 * via onChange.
 */
export function AtlasTextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
  disabled,
  rightSlot,
  className,
}: AtlasTextInputProps) {
  const [buffer, setBuffer] = useState(value === "" ? "" : String(value));

  // keep buffer in sync when the parent value changes (e.g. scenario load).
  useEffect(() => {
    setBuffer(value === "" ? "" : String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.currentTarget.value;
    setBuffer(next);
    onChange(next);
  }

  function handleBlur() {
    if (type !== "number") return;
    if (buffer === "" || buffer === "-") return; // leave intentionally-empty values alone
    const n = Number(buffer);
    if (!Number.isFinite(n)) return;
    if (min !== undefined && n < min) {
      setBuffer(String(min));
      onChange(String(min));
      return;
    }
    if (max !== undefined && n > max) {
      setBuffer(String(max));
      onChange(String(max));
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <MonoLabel>{label}</MonoLabel>
        {rightSlot}
      </div>
      <input
        type={type}
        value={buffer}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        className="w-full rounded-[2px] border-b border-line bg-transparent py-2 font-mono text-[0.95rem] text-ink placeholder:text-muted placeholder:italic focus:border-green focus:outline-none focus:ring-1 focus:ring-green/30 disabled:text-muted"
      />
    </div>
  );
}
