"use client";

import { AtlasCard } from "@/components/atlas/Card";
import { Stat } from "@/components/atlas/Stat";
import { cn } from "@/lib/utils";
import { useSimStore } from "@/store/sim";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function HonestPanel() {
  const snap = useSimStore((s) => s.snapshot);

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
                snap.childcareSourced ? "text-green" : "text-terracotta",
              )}
            >
              {snap.childcareSourced
                ? `SOURCED · ${snap.inputs.city}`
                : "ESTIMATE · V1"}
            </span>
          </div>
        </AtlasCard>
      </div>
      <p className="font-serif italic text-muted">
        tax math and city childcare reflect real data where available.
        fertility curves and benefit amounts remain v1 illustrative — sourced
        data lands later.
      </p>
    </div>
  );
}
