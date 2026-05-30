"use client";

import { useEffect } from "react";

import { useAtlasStore } from "@/store/atlas";

/**
 * thin transient banner that surfaces when the geocoder couldn't resolve
 * the typed city. atlas store handled the revert (sim.inputs.city was
 * restored to the previous valid value); this is just the user-facing
 * acknowledgement that something happened. auto-dismisses after 4s.
 */
export function CityResolveBanner() {
  const error = useAtlasStore((s) => s.cityResolveError);
  const clear = useAtlasStore((s) => s.clearCityResolveError);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => clear(), 4000);
    return () => window.clearTimeout(t);
  }, [error, clear]);

  if (!error) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-baseline justify-between gap-4 border border-terracotta/40 bg-terracotta/5 px-4 py-3"
    >
      <span className="font-serif text-[0.95rem] italic text-ink">
        couldn&apos;t find &ldquo;{error.typed}&rdquo;
        {error.revertedTo ? (
          <>
            {" "}— kept previous city <span className="text-ink">{error.revertedTo}</span>.
          </>
        ) : (
          <>. set a city on the input panel to continue.</>
        )}
      </span>
      <button
        type="button"
        onClick={clear}
        className="shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
      >
        dismiss
      </button>
    </div>
  );
}
