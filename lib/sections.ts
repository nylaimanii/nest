import type { Section } from "@/types";

// "atlas" routes to /atlas-view on purpose — /atlas is the dev smoke test
// from step 2 and must stay reachable.
export const SECTIONS: { id: Section; label: string; href: string }[] = [
  { id: "simulation", label: "simulation", href: "/simulation" },
  { id: "atlas", label: "atlas", href: "/atlas-view" },
  { id: "questions", label: "the questions", href: "/questions" },
  { id: "compare", label: "compare", href: "/compare" },
];
