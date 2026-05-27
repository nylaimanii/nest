import * as React from "react";

import { cn } from "@/lib/utils";
import { MonoLabel } from "./MonoLabel";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** field name, rendered as a mono uppercase label. */
  label: string;
  /** the figure itself — always mono. */
  value: string;
  /** optional small mono delta below the value. */
  delta?: string;
  /** render the value in deep green instead of ink. */
  accent?: boolean;
}

export const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  ({ className, label, value, delta, accent = false, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
      <MonoLabel>{label}</MonoLabel>
      <span
        className={cn(
          "font-mono text-3xl leading-none",
          accent ? "text-green" : "text-ink",
        )}
      >
        {value}
      </span>
      {delta ? (
        <span className="font-mono text-[0.75rem] text-muted">{delta}</span>
      ) : null}
    </div>
  ),
);
Stat.displayName = "Stat";
