"use client";

import Link from "next/link";

import { Callout } from "@/components/atlas/Callout";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { compareSnapshots, type SideData } from "@/lib/sim/compare";
import { useAppStore } from "@/store/app";
import { useCompareStore } from "@/store/compare";
import { ScenarioColumn, type Deltas, type MetricDelta } from "./ScenarioColumn";

// ---- delta formatters ----------------------------------------------------

function fmtMoney(n: number): string {
  const sign = n > 0 ? "+" : "−";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
}
function fmtPctPoints(n: number): string {
  const points = Math.round(n * 100);
  const sign = points > 0 ? "+" : "−";
  return `${sign}${Math.abs(points)} pts`;
}
function fmtInt(n: number): string {
  const sign = n > 0 ? "+" : "−";
  return `${sign}${Math.abs(n)}`;
}

// tone mapping:
//   higher = better → STARTING NET, LIKELY kids, FERTILITY
//   higher = worse  → THE GAP, KID COST, PEAK BURDEN
//   neutral         → WANTED kids (pure preference, no judgment)
function tone(n: number, higherIs: "better" | "worse"): MetricDelta["tone"] {
  if (n === 0) return "muted";
  const positiveIsGreen = higherIs === "better";
  if (n > 0) return positiveIsGreen ? "green" : "terracotta";
  return positiveIsGreen ? "terracotta" : "green";
}

function computeDeltas(a: SideData, b: SideData): Deltas {
  const dWanted = b.gap.wantedKids - a.gap.wantedKids;
  const dLikely = b.gap.likelyKids - a.gap.likelyKids;
  const dGap = b.gap.kidGap - a.gap.kidGap;
  const dStarting = b.snapshot.netCashByYear[0] - a.snapshot.netCashByYear[0];
  const dKidCost =
    b.snapshot.cumulativeChildCost[9] - a.snapshot.cumulativeChildCost[9];
  const dBurden = b.snapshot.burdenRatio - a.snapshot.burdenRatio;
  const dFert =
    b.snapshot.fertilityProbAtStart - a.snapshot.fertilityProbAtStart;

  return {
    wantedKids:
      dWanted === 0 ? null : { display: fmtInt(dWanted), tone: "muted" },
    likelyKids:
      dLikely === 0
        ? null
        : { display: fmtInt(dLikely), tone: tone(dLikely, "better") },
    kidGap:
      dGap === 0 ? null : { display: fmtInt(dGap), tone: tone(dGap, "worse") },
    startingNet:
      dStarting === 0
        ? null
        : { display: fmtMoney(dStarting), tone: tone(dStarting, "better") },
    kidCost:
      dKidCost === 0
        ? null
        : { display: fmtMoney(dKidCost), tone: tone(dKidCost, "worse") },
    peakBurden:
      Math.abs(dBurden) < 0.005
        ? null
        : { display: fmtPctPoints(dBurden), tone: tone(dBurden, "worse") },
    fertilityStart:
      Math.abs(dFert) < 0.005
        ? null
        : { display: fmtPctPoints(dFert), tone: tone(dFert, "better") },
  };
}

// ---- empty state ---------------------------------------------------------

function EmptyState() {
  return (
    <div className="mx-auto mt-4 w-full max-w-[640px]">
      <Callout label="PICK A SECOND SCENARIO TO COMPARE">
        <p className="font-serif italic leading-relaxed text-ink">
          create a second scenario on the simulation page, then come back.
          compare needs two saved scenarios side-by-side.
        </p>
        <Link
          href="/simulation"
          className="mt-4 inline-block rounded-[2px] bg-green px-5 py-2.5 font-serif text-[0.95rem] italic text-bone transition-colors hover:bg-green-2"
        >
          go save another scenario →
        </Link>
      </Callout>
    </div>
  );
}

// ---- the view ------------------------------------------------------------

export function CompareView() {
  const scenarios = useAppStore((s) => s.scenarios);
  const activeId = useAppStore((s) => s.activeScenarioId);
  const bId = useCompareStore((s) => s.bId);
  const setB = useCompareStore((s) => s.setB);

  const a = scenarios.find((s) => s.id === activeId);
  const others = scenarios.filter((s) => s.id !== activeId);
  // explicit bId wins, otherwise fall back to the first non-active scenario.
  const explicitB = bId
    ? scenarios.find((s) => s.id === bId && s.id !== activeId)
    : undefined;
  const b = explicitB ?? others[0];

  if (!a || !b) return <EmptyState />;

  const pair = compareSnapshots(a.inputs, b.inputs);
  const deltas = computeDeltas(pair.a, pair.b);

  return (
    <div className="mt-2 flex flex-col gap-6">
      {/* B picker */}
      <div className="flex items-center justify-end gap-3">
        <MonoLabel tone="muted">SCENARIO B:</MonoLabel>
        <select
          value={b.id}
          onChange={(e) => setB(e.currentTarget.value)}
          className="rounded-[2px] border border-line bg-bone px-3 py-1.5 font-mono text-[0.8rem] text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          aria-label="select scenario B"
        >
          {others.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2-column compare */}
      <div className="grid grid-cols-2 gap-0">
        <div className="border-r border-line">
          <ScenarioColumn
            side="a"
            scenarioLabel={a.label}
            data={pair.a}
            deltas={null}
          />
        </div>
        <div>
          <ScenarioColumn
            side="b"
            scenarioLabel={b.label}
            data={pair.b}
            deltas={deltas}
          />
        </div>
      </div>
    </div>
  );
}
