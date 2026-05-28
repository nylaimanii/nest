"use client";

import { AtlasCard } from "@/components/atlas/Card";
import { Stat } from "@/components/atlas/Stat";
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
      </div>
      <p className="font-serif italic text-muted">
        tax math reflects 2026 federal brackets and state lookup. childcare,
        fertility, and benefits remain v1 illustrative — sourced data lands
        later.
      </p>
    </div>
  );
}
