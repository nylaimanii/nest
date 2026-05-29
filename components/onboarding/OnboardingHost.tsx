"use client";

import { useEffect, useState } from "react";

import { OnboardingModal } from "./OnboardingModal";

// thin client wrapper around the modal so the (app)/layout can stay a
// server component. on mount, peek at localStorage; if the user hasn't
// onboarded yet, flip the modal open. localStorage is browser-only so the
// check has to run inside useEffect, not at render time — that's why the
// initial state is false (returning visitors never see a flash).

export function OnboardingHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const flag = localStorage.getItem("nest.onboarded");
      if (flag !== "true") setOpen(true);
    } catch {
      // safari private mode + corp policies can throw; default to hidden
      // so a broken storage read doesn't force the modal onto every visit.
    }
  }, []);

  return <OnboardingModal open={open} onClose={() => setOpen(false)} />;
}
