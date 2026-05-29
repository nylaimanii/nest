"use client";

import { CumulativeCostChart } from "./CumulativeCostChart";
import { FertilityCurve } from "./FertilityCurve";
import { NetCashChart } from "./NetCashChart";

/**
 * The center column of /simulation. Three charts stacked with generous gap,
 * fertility-by-start-age as the hero on top. min-w keeps the column readable
 * even when the viewport pushes the 3-col grid tight.
 */
export function SimCanvas() {
  return (
    <div className="flex min-w-0 flex-col gap-10 p-8">
      <FertilityCurve />
      <NetCashChart />
      <CumulativeCostChart />
    </div>
  );
}
