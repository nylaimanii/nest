"use client";

import { cn } from "@/lib/utils";
import { useSimStore } from "@/store/sim";

/**
 * the explicit compute trigger for /simulation and /atlas-view. inputs no
 * longer recompute on every keystroke — the user types whatever they want
 * into draftInputs, then this button commits draft → inputs and re-runs
 * the engine in one tick.
 *
 * isDirty drives the glow: green ring + "INPUTS CHANGED · CLICK TO RUN"
 * when draft != committed, plain muted "MODEL IS UP TO DATE" otherwise.
 * the button stays clickable in both states — clicking when clean just
 * runs the engine over the same inputs (idempotent, harmless).
 */
export function RecomputeButton() {
  const isDirty = useSimStore((s) => s.isDirty);
  const recompute = useSimStore((s) => s.recompute);

  return (
    <div className="flex items-center justify-end gap-4">
      <span
        className={cn(
          "font-mono text-[0.7rem] uppercase tracking-[0.12em]",
          isDirty ? "text-green" : "text-muted",
        )}
      >
        {isDirty ? "inputs changed · click to run" : "model is up to date"}
      </span>
      <button
        type="button"
        onClick={recompute}
        className={cn(
          "border-2 border-green bg-bone px-8 py-3 font-mono text-[0.85rem] uppercase tracking-[0.15em] text-green transition-colors hover:bg-green hover:text-bone",
          isDirty && "ring-2 ring-green/30",
        )}
      >
        recompute →
      </button>
    </div>
  );
}
