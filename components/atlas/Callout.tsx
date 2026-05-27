import * as React from "react";

import { AtlasCard, type AtlasCardProps } from "./Card";

export interface CalloutProps extends Omit<AtlasCardProps, "tone"> {
  /** "the reframe" / "the purpose line" = green; hard-truth = terracotta. */
  tone?: "green" | "terracotta";
}

export const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(
  ({ tone = "green", ...props }, ref) => (
    <AtlasCard ref={ref} tone={tone} {...props} />
  ),
);
Callout.displayName = "Callout";
