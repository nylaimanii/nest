import { AtlasCard } from "@/components/atlas/Card";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { cn } from "@/lib/utils";
import type { SideData } from "@/lib/sim/compare";

export interface MetricDelta {
  display: string;
  tone: "green" | "terracotta" | "muted";
}

export interface Deltas {
  wantedKids: MetricDelta | null;
  likelyKids: MetricDelta | null;
  kidGap: MetricDelta | null;
  startingNet: MetricDelta | null;
  kidCost: MetricDelta | null;
  peakBurden: MetricDelta | null;
  fertilityStart: MetricDelta | null;
}

interface ScenarioColumnProps {
  side: "a" | "b";
  scenarioLabel: string;
  data: SideData;
  /** present only on side B — null on side A. */
  deltas: Deltas | null;
}

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

function summaryLine(inputs: SideData["inputs"]): string {
  const incomeK = `${Math.round(inputs.householdIncome / 1000)}k`;
  return `${inputs.kidsWanted} kids · start ${inputs.startAge} · $${incomeK} · ${inputs.field}`;
}

interface MiniCardProps {
  label: string;
  value: string;
  valueTone?: "ink" | "green" | "terracotta";
  large?: boolean;
  delta?: MetricDelta | null;
}

function MiniCard({
  label,
  value,
  valueTone = "ink",
  large = false,
  delta,
}: MiniCardProps) {
  const valueClass =
    valueTone === "green"
      ? "text-green"
      : valueTone === "terracotta"
        ? "text-terracotta"
        : "text-ink";
  const deltaClass = !delta
    ? ""
    : delta.tone === "green"
      ? "text-green"
      : delta.tone === "terracotta"
        ? "text-terracotta"
        : "text-muted";
  return (
    <AtlasCard className="p-4">
      <MonoLabel>{label}</MonoLabel>
      <div
        className={cn(
          "mt-2 font-mono leading-none",
          large ? "text-[2.4rem]" : "text-[1.4rem]",
          valueClass,
        )}
      >
        {value}
      </div>
      {delta ? (
        <div className={cn("mt-1 font-mono text-[0.75rem]", deltaClass)}>
          {delta.display}
        </div>
      ) : null}
    </AtlasCard>
  );
}

export function ScenarioColumn({
  side,
  scenarioLabel,
  data,
  deltas,
}: ScenarioColumnProps) {
  const { inputs, snapshot, gap } = data;

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* header strip */}
      <div className="flex flex-col gap-1">
        <MonoLabel tone={side === "a" ? "green" : "terracotta"}>
          {side === "a" ? "SCENARIO A" : "SCENARIO B"}
        </MonoLabel>
        <h2 className="mt-1 font-serif text-[1.5rem] leading-tight lowercase text-ink">
          {scenarioLabel}
        </h2>
        <p className="font-serif text-[0.9rem] italic text-muted">
          {summaryLine(inputs)}
        </p>
      </div>

      <div className="h-px bg-line" />

      {/* mini-cards stack */}
      <div className="flex flex-col gap-4">
        <MiniCard
          label="WANTED"
          value={`${gap.wantedKids} kids @ age ${gap.wantedStartAge}`}
          delta={deltas?.wantedKids ?? null}
        />
        <MiniCard
          label="LIKELY"
          value={`${gap.likelyKids} kids @ age ${gap.driftStartAge}`}
          delta={deltas?.likelyKids ?? null}
        />
        <MiniCard
          label="THE GAP"
          value={`${gap.kidGap}`}
          large
          valueTone={gap.kidGap === 0 ? "green" : "terracotta"}
          delta={deltas?.kidGap ?? null}
        />
        <MiniCard
          label="STARTING NET (YR 1)"
          value={usd(snapshot.netCashByYear[0])}
          delta={deltas?.startingNet ?? null}
        />
        <MiniCard
          label="10-YR KID COST"
          value={usd(snapshot.cumulativeChildCost[9])}
          delta={deltas?.kidCost ?? null}
        />
        <MiniCard
          label="PEAK BURDEN"
          value={pct(snapshot.burdenRatio)}
          delta={deltas?.peakBurden ?? null}
        />
        <MiniCard
          label="FERTILITY @ START"
          value={pct(snapshot.fertilityProbAtStart)}
          delta={deltas?.fertilityStart ?? null}
        />
      </div>
    </div>
  );
}
