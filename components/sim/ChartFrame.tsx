"use client";

import * as React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { MonoLabel } from "@/components/atlas/MonoLabel";

interface ChartFrameContextValue {
  width: number;
  height: number;
}

const ChartFrameContext = createContext<ChartFrameContextValue>({
  width: 0,
  height: 220,
});

/** read the measured width + fixed height from the nearest ChartFrame ancestor. */
export function useChartFrame(): ChartFrameContextValue {
  return useContext(ChartFrameContext);
}

export interface ChartFrameProps {
  label: string;
  caption?: string;
  height?: number;
  children: React.ReactNode;
}

/**
 * Atlas chart chrome that owns the measurement. measures its body width via
 * ResizeObserver and exposes {width, height} through ChartFrameContext.
 * children render only when measured width >= 100 — child charts then pass
 * those exact numbers as `width` and `height` props directly to Recharts'
 * chart components (LineChart, AreaChart, …), so Recharts never goes
 * through its internal -1 sentinel state. resize handling is the
 * ResizeObserver feeding fresh widths into context.
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
        {width >= 100 ? (
          <ChartFrameContext.Provider value={{ width, height }}>
            {children}
          </ChartFrameContext.Provider>
        ) : null}
      </div>
      {caption ? (
        <p className="font-serif text-[0.85rem] italic text-muted">
          {caption}
        </p>
      ) : null}
    </section>
  );
}
