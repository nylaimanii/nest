"use client";

import { AtlasCard } from "@/components/atlas/Card";
import { Stat } from "@/components/atlas/Stat";
import { cn } from "@/lib/utils";
import { isInternational } from "@/lib/sim/tax";
import { useSimStore } from "@/store/sim";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function HonestPanel() {
  const snap = useSimStore((s) => s.snapshot);
  const international = isInternational(snap.inputs.city);

  // childcare provenance tag: SOURCED (in atlas) → green; ESTIMATE → terracotta;
  // INTERNATIONAL → muted (not a hard truth, just a scope note).
  const tag = international
    ? { label: "INTERNATIONAL · V1", tone: "text-muted" }
    : snap.childcareSourced
      ? { label: `SOURCED · ${snap.inputs.city}`, tone: "text-green" }
      : { label: "ESTIMATE · V1", tone: "text-terracotta" };

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="grid grid-cols-2 gap-4">
        <AtlasCard>
          <Stat label="STARTING NET (yr 1)" value={usd(snap.netCashByYear[0])} />
        </AtlasCard>
        <AtlasCard>
          <Stat
            label="10-YR CUMULATIVE KID COST"
            value={usd(snap.cumulativeChildCost[9])}
          />
        </AtlasCard>
        <AtlasCard>
          <Stat
            label="FERTILITY @ START"
            value={pct(snap.fertilityProbAtStart)}
          />
        </AtlasCard>
        <AtlasCard>
          <Stat
            label="LIFETIME EARNINGS Δ"
            value={`−$${Math.abs(snap.lifetimeEarningsDelta).toLocaleString("en-US")}`}
          />
        </AtlasCard>
        <AtlasCard>
          <Stat
            label="BENEFITS / YR (CAPTURABLE)"
            value={usd(snap.benefitsCapturable)}
          />
        </AtlasCard>
        <AtlasCard>
          <Stat label="PEAK BURDEN RATIO" value={pct(snap.burdenRatio)} />
        </AtlasCard>
        <AtlasCard className="col-span-2">
          <Stat
            label="CHILDCARE / MO"
            value={`$${snap.childcareMonthlyUsed.toLocaleString("en-US")}`}
          />
          <div className="mt-1">
            <span
              className={cn(
                "font-mono text-[0.65rem] uppercase tracking-[0.12em]",
                tag.tone,
              )}
            >
              {tag.label}
            </span>
          </div>
        </AtlasCard>
      </div>
      <p className="font-serif italic text-muted">
        tax math reflects 2026 us federal brackets + state lookup. city
        childcare sourced for 20 us metros. fertility curve is reliable for
        ages 24–42; outside that range we report the boundary value. anything
        else remains v1 illustrative.
        {international ? (
          <>
            {" "}
            international city — tax math uses federal brackets only, no state
            tax; childcare is estimate · v1.
          </>
        ) : null}
      </p>
    </div>
  );
}
