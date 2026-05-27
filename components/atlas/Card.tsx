import * as React from "react";

import { cn } from "@/lib/utils";
import { MonoLabel, type MonoLabelProps } from "./MonoLabel";

type Tone = "default" | "green" | "terracotta";

const leftAccent: Record<Tone, string> = {
  default: "",
  green: "border-l-[6px] border-l-green",
  terracotta: "border-l-[6px] border-l-terracotta",
};

const labelTone: Record<Tone, NonNullable<MonoLabelProps["tone"]>> = {
  default: "muted",
  green: "green",
  terracotta: "terracotta",
};

export interface AtlasCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** adds a 6px left accent border (master-doc callout look). */
  tone?: Tone;
  /** mono uppercase label rendered at the top of the card. */
  label?: string;
}

export const AtlasCard = React.forwardRef<HTMLDivElement, AtlasCardProps>(
  ({ className, tone = "default", label, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-card p-6 text-ink",
        leftAccent[tone],
        className,
      )}
      {...props}
    >
      {label ? (
        <MonoLabel tone={labelTone[tone]} className="mb-2 block">
          {label}
        </MonoLabel>
      ) : null}
      {children}
    </div>
  ),
);
AtlasCard.displayName = "AtlasCard";
