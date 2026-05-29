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
  /** "currency" → `$X,XXX` when blurred, raw digits when focused. */
  format?: "number" | "currency";
  /** optional small affordance rendered next to the MonoLabel (e.g. "no partner →"). */
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Atlas-tone bare text input. internally buffers the typed string so we
 * don't snap-to-min mid-typing; on blur, numeric inputs clamp to `min`
 * and `max`. with format="currency" the input switches type to text and
 * shows `$X,XXX` while not focused, raw digits while focused.
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
  format,
  rightSlot,
  className,
}: AtlasTextInputProps) {
  const [buffer, setBuffer] = useState(value === "" ? "" : String(value));
  const [focused, setFocused] = useState(false);

  // keep buffer in sync when the parent value changes (e.g. scenario load).
  useEffect(() => {
    setBuffer(value === "" ? "" : String(value));
  }, [value]);

  const isCurrency = format === "currency";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = isCurrency
      ? e.currentTarget.value.replace(/[$,\s]/g, "")
      : e.currentTarget.value;
    setBuffer(raw);
    onChange(raw);
  }

  function handleBlur() {
    setFocused(false);
    if (type !== "number" && !isCurrency) return;
    if (buffer === "" || buffer === "-") return;
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

  // currency: text input always; display switches on focus.
  const effectiveType = isCurrency ? "text" : type;
  const numericValue =
    typeof value === "number" ? value : Number(value);
  const displayValue =
    isCurrency && !focused && Number.isFinite(numericValue)
      ? `$${numericValue.toLocaleString("en-US")}`
      : buffer;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <MonoLabel>{label}</MonoLabel>
        {rightSlot}
      </div>
      <input
        type={effectiveType}
        inputMode={isCurrency ? "numeric" : undefined}
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        min={isCurrency ? undefined : min}
        max={isCurrency ? undefined : max}
        step={isCurrency ? undefined : step}
        disabled={disabled}
        aria-label={label}
        className="w-full rounded-[2px] border-b border-line bg-transparent py-2 font-mono text-[0.95rem] text-ink placeholder:text-muted placeholder:italic focus:border-green focus:outline-none focus:ring-1 focus:ring-green/30 disabled:text-muted"
      />
    </div>
  );
}
