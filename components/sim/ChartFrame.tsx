"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { MonoLabel } from "@/components/atlas/MonoLabel";

export interface ChartFrameProps {
  /** mono uppercase header. */
  label: string;
  /** muted serif italic one-liner under the chart. */
  caption?: string;
  /** body height in px (default 220). */
  height?: number;
  children: React.ReactNode;
}

/**
 * Atlas chart chrome: small mono header on top, fixed-height chart body,
 * optional muted italic caption underneath. The body holds a measured
 * <div> with a ResizeObserver — children (typically a Recharts
 * ResponsiveContainer) only mount once the box has a real width, which
 * silences Recharts' `width(-1)/height(-1)` first-paint warning.
 */
export function ChartFrame({
  label,
  caption,
  height = 220,
  children,
}: ChartFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="flex flex-col gap-3">
      <MonoLabel>{label}</MonoLabel>
      <div ref={ref} className="w-full min-w-0" style={{ height }}>
        {width > 0 ? children : null}
      </div>
      {caption ? (
        <p className="font-serif text-[0.85rem] italic text-muted">
          {caption}
        </p>
      ) : null}
    </section>
  );
}
