import * as React from "react";

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
 * optional muted italic caption underneath. No card border — charts breathe
 * on bone. The body div reserves the chart's height so the layout never
 * shifts when ResponsiveContainer mounts.
 */
export function ChartFrame({
  label,
  caption,
  height = 220,
  children,
}: ChartFrameProps) {
  return (
    <section className="flex flex-col gap-3">
      <MonoLabel>{label}</MonoLabel>
      <div className="w-full" style={{ height }}>
        {children}
      </div>
      {caption ? (
        <p className="font-serif text-[0.85rem] italic text-muted">
          {caption}
        </p>
      ) : null}
    </section>
  );
}
