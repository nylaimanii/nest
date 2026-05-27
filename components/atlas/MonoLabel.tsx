import * as React from "react";

import { cn } from "@/lib/utils";

const toneClass = {
  muted: "text-muted",
  green: "text-green",
  terracotta: "text-terracotta",
} as const;

export interface MonoLabelProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof toneClass;
}

export const MonoLabel = React.forwardRef<HTMLSpanElement, MonoLabelProps>(
  ({ className, tone = "muted", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "font-mono text-[0.7rem] uppercase leading-none tracking-[0.12em]",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  ),
);
MonoLabel.displayName = "MonoLabel";
