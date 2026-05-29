"use client";

import { cn } from "@/lib/utils";
import { useAtlasStore } from "@/store/atlas";
import { useSimStore } from "@/store/sim";

/**
 * the explicit compute trigger for /simulation and /atlas-view. neither
 * sim inputs nor atlas weights recompute on every keystroke now — the user
 * edits drafts freely, then this button commits BOTH the sim draft and the
 * atlas weights draft in one tick.
 *
 * isDirty drives the glow: any unsaved draft (sim OR atlas weights) →
 * green ring + "INPUTS CHANGED · CLICK TO RUN"; otherwise plain muted
 * "MODEL IS UP TO DATE". the button stays clickable in both states —
 * clicking when clean just runs both engines over the same state.
 */
export function RecomputeButton() {
  const simDirty = useSimStore((s) => s.isDirty);
  const weightsDirty = useAtlasStore((s) => s.isWeightsDirty);
  const recomputeSim = useSimStore((s) => s.recompute);
  const recomputeAtlas = useAtlasStore((s) => s.recompute);

  const isDirty = simDirty || weightsDirty;

  function handleClick() {
    // sim recompute first so the atlas store's subscribe sees the new
    // committed inputs; then atlas recompute picks up any draft weight
    // changes alongside the fresh inputs.
    recomputeSim();
    recomputeAtlas();
  }

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
        onClick={handleClick}
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
