// shared domain types — imported by the store and downstream files.

export type Section = "simulation" | "atlas" | "questions" | "compare";

export type Scenario = {
  id: string;
  label: string;
  createdAt: number;
};
