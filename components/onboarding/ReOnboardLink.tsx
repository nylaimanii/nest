"use client";

import { useRouter } from "next/navigation";

/**
 * a small mono link surfaced in /notes that clears the localStorage
 * onboarded flag and routes to /simulation, where the modal will mount
 * on next paint. lets demo viewers + the author re-trigger onboarding
 * without devtools.
 */
export function ReOnboardLink() {
  const router = useRouter();

  function handleClick() {
    try {
      localStorage.removeItem("nest.onboarded");
    } catch {
      // if storage is unavailable, navigating to /simulation will at
      // least show the current state — graceful degradation.
    }
    router.push("/simulation");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted transition-colors hover:text-ink"
    >
      ← reset and re-onboard
    </button>
  );
}
