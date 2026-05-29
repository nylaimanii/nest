"use client";

import Link from "next/link";

import { AtlasImportance } from "@/components/atlas/AtlasImportance";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { cn } from "@/lib/utils";
import { contextFrom, useAtlasStore } from "@/store/atlas";
import { scoreCity, type AtlasWeights } from "@/lib/atlas/score";
import { useSimStore } from "@/store/sim";

interface WeightRow {
  key: keyof AtlasWeights;
  label: string;
}

const KID_ROWS: WeightRow[] = [
  { key: "schools", label: "schools" },
  { key: "safety", label: "safety" },
  { key: "greenSpace", label: "green space" },
  { key: "communitySize", label: "community size" },
];

const FAMILY_ROWS: WeightRow[] = [
  { key: "cost", label: "cost of living" },
  { key: "rentBurden", label: "rent burden" },
  { key: "childcareCost", label: "childcare cost" },
  { key: "weather", label: "weather" },
];

const YOU_ROWS: WeightRow[] = [{ key: "careerFit", label: "career fit" }];

const PARTNER_CAREER_ROW: WeightRow = {
  key: "partnerCareer",
  label: "partner career",
};

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted">
      {children}
    </div>
  );
}

/** sidebar provenance subtitle. "full" records suppress the label
 *  entirely so the curated-US-metro path stays clean. */
function targetProvenanceLabel(target: ReturnType<typeof useAtlasStore.getState>["target"]): string | null {
  if (!target) return null;
  const confidence = target.confidence ?? "full";
  if (confidence === "full") return null;
  if (confidence === "partial-us") return "US CITY · LIMITED DATA";
  if (confidence === "partial-global") {
    const country = (target.country ?? "").trim();
    return country
      ? `${country.toUpperCase()} · GLOBAL DATA`
      : "GLOBAL CITY · LIMITED DATA";
  }
  return null;
}

export function AtlasSidebar() {
  const target = useAtlasStore((s) => s.target);
  const isResolvingTarget = useAtlasStore((s) => s.isResolvingTarget);
  const alternates = useAtlasStore((s) => s.alternates);
  const weights = useAtlasStore((s) => s.weights);
  const draftWeights = useAtlasStore((s) => s.draftWeights);
  const setDraftWeight = useAtlasStore((s) => s.setDraftWeight);
  const selectedAlternateId = useAtlasStore((s) => s.selectedAlternateId);
  const setSelectedAlternateId = useAtlasStore((s) => s.setSelectedAlternateId);
  const simInputs = useSimStore((s) => s.inputs);
  const requestedCity = simInputs.city;

  const hasPartner = simInputs.partnerAge !== null;
  const youRows = hasPartner ? [...YOU_ROWS, PARTNER_CAREER_ROW] : YOU_ROWS;

  // committed-state score for the target + ranked alternates. ctx is built
  // from the committed weights — clicking RECOMPUTE refreshes both.
  const ctx = contextFrom(simInputs, weights);
  const targetScore = target ? scoreCity(target, ctx) : null;
  const altScored = alternates.map((c) => ({ city: c, score: scoreCity(c, ctx) }));

  const provenanceLabel = targetProvenanceLabel(target);

  return (
    <aside className="flex max-h-[calc(100vh-200px)] w-[280px] flex-col gap-6 overflow-y-auto border-r border-line p-6">
      {/* ───────────── target ───────────── */}
      <div className="flex flex-col gap-2">
        <MonoLabel>YOUR TARGET CITY</MonoLabel>
        {isResolvingTarget ? (
          <span className="font-serif italic text-muted">
            resolving {requestedCity}…
          </span>
        ) : null}
        {target ? (
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-serif text-[1.1rem] lowercase italic text-ink">
              {target.name}
            </span>
            {targetScore?.total !== null && targetScore?.total !== undefined ? (
              <span className="font-mono text-[0.9rem] text-green">
                {targetScore.total}
              </span>
            ) : null}
          </div>
        ) : !isResolvingTarget ? (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">
            city not found — pick another on /simulation
          </span>
        ) : null}
        {provenanceLabel && !isResolvingTarget ? (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted">
            {provenanceLabel}
          </span>
        ) : null}
        <Link
          href="/simulation"
          className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
        >
          set on simulation →
        </Link>
      </div>

      <div className="h-px bg-line" />

      {/* ───────────── alternates ───────────── */}
      <div className="flex flex-col gap-2">
        <MonoLabel>OTHER MATCHES</MonoLabel>
        {altScored.length === 0 ? (
          <p className="font-serif text-[0.85rem] italic text-muted">
            no other matches in the current dataset. add cities globally in
            step c — or pick a different target on simulation.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {altScored.map(({ city, score }, i) => {
              const rank = i + 1;
              const active = city.id === selectedAlternateId;
              return (
                <li key={city.id} className="group flex">
                  <button
                    type="button"
                    onClick={() => setSelectedAlternateId(city.id)}
                    className={cn(
                      "flex min-w-0 flex-1 items-baseline gap-2 border-l-2 py-1 pl-3 pr-1 text-left",
                      active
                        ? "border-[color:var(--color-green)]"
                        : "border-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[0.8rem]",
                        active ? "text-ink" : "text-muted",
                      )}
                    >
                      {rank}.
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate font-serif text-[0.95rem] italic lowercase transition-colors",
                        active ? "text-ink" : "text-muted group-hover:text-ink",
                      )}
                    >
                      {city.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[0.85rem]",
                        active ? "text-ink" : "text-muted",
                      )}
                    >
                      {score.total ?? "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-1 font-serif text-[0.75rem] italic text-muted">
          alternates are sourced from 20 us metros. global expansion is v3.
        </p>
      </div>

      <div className="h-px bg-line" />

      {/* ───────────── weights ───────────── */}
      <div className="flex flex-col gap-3">
        <MonoLabel>WHAT MATTERS TO YOU</MonoLabel>

        <SubHeading>FOR THE KID</SubHeading>
        <div className="flex flex-col gap-4">
          {KID_ROWS.map(({ key, label }) => (
            <AtlasImportance
              key={key}
              label={label}
              value={draftWeights[key]}
              onChange={(v) => setDraftWeight(key, v)}
            />
          ))}
        </div>

        <SubHeading>FOR THE FAMILY</SubHeading>
        <div className="flex flex-col gap-4">
          {FAMILY_ROWS.map(({ key, label }) => (
            <AtlasImportance
              key={key}
              label={label}
              value={draftWeights[key]}
              onChange={(v) => setDraftWeight(key, v)}
            />
          ))}
        </div>

        <SubHeading>FOR YOU</SubHeading>
        <div className="flex flex-col gap-4">
          {youRows.map(({ key, label }) => (
            <AtlasImportance
              key={key}
              label={label}
              value={draftWeights[key]}
              onChange={(v) => setDraftWeight(key, v)}
            />
          ))}
        </div>
      </div>

      <p className="mt-auto font-serif text-[0.85rem] italic text-muted">
        weights tune which cities match your priorities.
      </p>
    </aside>
  );
}
