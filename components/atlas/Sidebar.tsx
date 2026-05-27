"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import { MonoLabel } from "./MonoLabel";

// timeZone pinned to UTC so the server and client format the seeded
// timestamp identically (a local-tz formatter would mismatch on hydration).
const tsFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function formatTs(ms: number) {
  return tsFmt.format(ms).toUpperCase();
}

export function Sidebar() {
  const scenarios = useAppStore((s) => s.scenarios);
  const activeScenarioId = useAppStore((s) => s.activeScenarioId);
  const section = useAppStore((s) => s.section);
  const setActiveScenario = useAppStore((s) => s.setActiveScenario);
  const addScenario = useAppStore((s) => s.addScenario);

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
                  onClick={() => setActiveScenario(sc.id)}
                  className={cn(
                    "block w-full pl-3 text-left",
                    active && "border-l-2 border-l-green",
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
                    {formatTs(sc.createdAt)}
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
