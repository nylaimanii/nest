"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { MonoLabel } from "./MonoLabel";

export interface AtlasTypeaheadProps {
  label: string;
  value: string;
  onChange: (s: string) => void;
  suggestions: readonly string[];
  placeholder?: string;
  className?: string;
  /** small mono hint rendered under the input (e.g. validation message). */
  hint?: string;
  /** optional italic serif footer rendered INSIDE the suggestion panel,
   *  below the suggestions list. used to scope what the suggestions cover
   *  (e.g. "any city worldwide works — sourced data shown for US metros"). */
  panelFooter?: React.ReactNode;
}

const MAX_SUGGESTIONS = 6;

/**
 * Atlas-tone type-in with a small suggestion panel below the input. accepts
 * any free-text — suggestions are help, not gates. arrow keys + enter +
 * escape work; click selects; outside click hides via a short blur timeout
 * so the click registers before the panel disappears.
 */
export function AtlasTypeahead({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  hint,
  panelFooter,
}: AtlasTypeaheadProps) {
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current !== null) {
        window.clearTimeout(hideTimer.current);
      }
    };
  }, []);

  const lower = value.toLowerCase().trim();
  const filtered =
    lower === ""
      ? []
      : suggestions
          .filter((s) => s.toLowerCase().includes(lower) && s.toLowerCase() !== lower)
          .slice(0, MAX_SUGGESTIONS);

  const showPanel = focused && filtered.length > 0;

  function commit(s: string) {
    onChange(s);
    setFocused(false);
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showPanel) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) commit(filtered[highlight]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  return (
    <div className={cn("relative flex flex-col gap-1.5", className)}>
      <MonoLabel>{label}</MonoLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.currentTarget.value);
          setHighlight(0);
        }}
        onFocus={() => {
          setFocused(true);
          if (hideTimer.current !== null) {
            window.clearTimeout(hideTimer.current);
            hideTimer.current = null;
          }
        }}
        onBlur={() => {
          hideTimer.current = window.setTimeout(() => {
            setFocused(false);
            hideTimer.current = null;
          }, 120);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className="w-full rounded-[2px] border-b border-line bg-transparent py-2 font-mono text-[0.95rem] text-ink placeholder:italic placeholder:text-muted focus:border-green focus:outline-none focus:ring-1 focus:ring-green/30"
      />
      {hint ? (
        <span className="font-mono text-[0.7rem] text-muted">{hint}</span>
      ) : null}
      {showPanel ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 flex flex-col rounded-[2px] border border-line bg-bone shadow-sm"
        >
          {filtered.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === highlight}
              // onMouseDown fires BEFORE input blur, so the suggestion
              // commits cleanly without racing the panel-hide timeout.
              onMouseDown={(e) => {
                e.preventDefault();
                commit(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "cursor-pointer px-3 py-1.5 font-serif text-[0.95rem] italic text-ink transition-colors",
                i === highlight ? "bg-card" : "hover:bg-card",
              )}
            >
              {s}
            </li>
          ))}
          {panelFooter ? (
            <li
              aria-hidden="true"
              className="border-t border-line px-3 py-1.5 font-serif text-[0.75rem] italic text-muted"
            >
              {panelFooter}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
