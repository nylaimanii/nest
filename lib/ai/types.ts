// types shared between server (api routes) and client (store) — kept in
// their own file so client code can `import type { ... }` without ever
// pulling lib/ai/groq.ts into the client bundle.

export const THEME_LIST = [
  "money_pressure",
  "partner_alignment",
  "support_system",
  "career_tradeoffs",
  "regret_horizon",
  "drift_awareness",
  "identity_after",
  "the_second_kid",
] as const;

export type Theme = (typeof THEME_LIST)[number];

export type AnswerClassification = {
  stance: "confident" | "uncertain" | "avoidant" | "conflicted";
  /** 1–3 short lowercase phrases describing what the answer revealed. */
  surface_tags: string[];
};

export type QuestionEntry = {
  theme: Theme;
  question: string;
  answer: string;
  classification: AnswerClassification | null;
};
