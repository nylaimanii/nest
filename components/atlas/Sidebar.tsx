"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import { MonoLabel } from "./MonoLabel";

// build the timestamp via formatToParts so we get exactly "OCT 27 · 14:22":
// month-short uppercased, day 2-digit, " · ", hour:minute in 24h. always
// renders in the user's local timezone — the seed scenario now stamps a
// real Date.now() on first client mount (see stampSeedCreatedAt) instead
// of carrying a hardcoded UTC instant that read as "JAN 01 · 09:00".
function formatTs(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month").toUpperCase()} ${get("day")} · ${get("hour")}:${get(
    "minute",
  )}`;
}

export function Sidebar() {
  const scenarios = useAppStore((s) => s.scenarios);
  const activeScenarioId = useAppStore((s) => s.activeScenarioId);
  const section = useAppStore((s) => s.section);
  const setActiveScenario = useAppStore((s) => s.setActiveScenario);
  const applyScenario = useAppStore((s) => s.applyScenario);
  const addScenario = useAppStore((s) => s.addScenario);
  const stampSeedCreatedAt = useAppStore((s) => s.stampSeedCreatedAt);

  // swap the seed scenario's createdAt sentinel for a real Date.now() on
  // first client mount. happens post-hydration so SSR and client agree on
  // the initial render; one re-render after the effect tick paints the
  // real time. no-op for non-seed scenarios + repeat mounts.
  useEffect(() => {
    stampSeedCreatedAt();
  }, [stampSeedCreatedAt]);

  return (
    <aside className="flex w-[260px] flex-col gap-6 border-r border-line bg-bone p-6">
      <div className="flex flex-col gap-3">
        <MonoLabel>SCENARIOS</MonoLabel>
        <ul className="flex flex-col gap-3">
          {scenarios.map((sc) => {
            const active = sc.id === activeScenarioId;
            return (
              <li key={sc.id}>
                <button
                  type="button"
                  onClick={() => {
                    applyScenario(sc.id);
                    setActiveScenario(sc.id);
                  }}
                  // every row keeps the same border-width + padding so
                  // activating only swaps the border color (no shift).
                  className={cn(
                    "block w-full border-l-2 pl-3 text-left",
                    active
                      ? "border-[color:var(--color-green)]"
                      : "border-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "block font-serif text-[0.98rem] lowercase transition-colors",
                      active ? "text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {sc.label}
                  </span>
                  <span className="mt-1 block font-mono text-[0.65rem] text-muted">
                    {sc.createdAt === 0 ? "" : formatTs(sc.createdAt)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* editorial textual action — not a button-styled control */}
      <button
        type="button"
        onClick={() => {
          const id = addScenario();
          setActiveScenario(id);
        }}
        className="self-start font-serif text-[0.9rem] italic text-muted transition-colors hover:text-ink"
      >
        + new scenario
      </button>

      <div className="mt-auto flex flex-col gap-2">
        <MonoLabel>SECTION</MonoLabel>
        <span className="font-mono text-[0.78rem] text-ink">{section}</span>
      </div>
    </aside>
  );
}
