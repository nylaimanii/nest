import { create } from "zustand";

import type {
  AnswerClassification,
  QuestionEntry,
  Theme,
} from "@/lib/ai/types";
import type { SimSuggestion } from "@/lib/sim/suggest";
import { useSimStore } from "@/store/sim";

export type QuestionsStatus =
  | "idle"
  | "loading_question"
  | "awaiting_answer"
  | "classifying"
  | "summarizing"
  | "complete"
  | "error";

interface QuestionsState {
  history: QuestionEntry[];
  currentQuestion: { theme: Theme; text: string } | null;
  status: QuestionsStatus;
  summary: string | null;
  suggestions: SimSuggestion[];
  errorMessage: string | null;

  start: () => Promise<void>;
  submitAnswer: (answer: string) => Promise<void>;
  applySuggestions: () => void;
  reset: () => void;
}

async function postJSON<T>(path: string, body: unknown): Promise<{
  ok: boolean;
  data: T | null;
  error: string | null;
}> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, data: null, error: e.error ?? `request failed (${res.status})` };
    }
    return { ok: true, data: (await res.json()) as T, error: null };
  } catch {
    return { ok: false, data: null, error: "network error" };
  }
}

export const useQuestionsStore = create<QuestionsState>((set, get) => ({
  history: [],
  currentQuestion: null,
  status: "idle",
  summary: null,
  suggestions: [],
  errorMessage: null,

  start: async () => {
    set({
      history: [],
      currentQuestion: null,
      summary: null,
      suggestions: [],
      errorMessage: null,
      status: "loading_question",
    });

    const sim = useSimStore.getState();
    const r = await postJSON<{ theme: Theme; question: string }>(
      "/api/questions/next",
      {
        history: [],
        inputs: sim.inputs,
        gap: sim.gap,
        asked: [],
      },
    );
    if (!r.ok || !r.data) {
      set({ status: "error", errorMessage: r.error });
      return;
    }
    set({
      currentQuestion: { theme: r.data.theme, text: r.data.question },
      status: "awaiting_answer",
    });
  },

  submitAnswer: async (rawAnswer: string) => {
    const answer = rawAnswer.trim();
    if (!answer) return;
    const current = get().currentQuestion;
    if (!current) return;

    set({ status: "classifying", errorMessage: null });

    const c = await postJSON<AnswerClassification>(
      "/api/questions/classify",
      { question: current.text, answer },
    );
    // classification is best-effort — if it fails we still record the answer.
    const classification: AnswerClassification | null = c.ok ? (c.data ?? null) : null;

    const entry: QuestionEntry = {
      theme: current.theme,
      question: current.text,
      answer,
      classification,
    };
    const history = [...get().history, entry];
    set({ history, currentQuestion: null });

    if (history.length >= 5) {
      set({ status: "summarizing" });
      const sim = useSimStore.getState();
      const s = await postJSON<{
        summary: string;
        suggestions: SimSuggestion[];
      }>("/api/questions/summary", {
        history,
        inputs: sim.inputs,
        gap: sim.gap,
      });
      if (!s.ok || !s.data) {
        set({ status: "error", errorMessage: s.error });
        return;
      }
      set({
        status: "complete",
        summary: s.data.summary,
        suggestions: s.data.suggestions ?? [],
      });
      return;
    }

    // load the next question
    set({ status: "loading_question" });
    const sim = useSimStore.getState();
    const n = await postJSON<{ theme: Theme; question: string }>(
      "/api/questions/next",
      {
        history,
        inputs: sim.inputs,
        gap: sim.gap,
        asked: history.map((h) => h.theme),
      },
    );
    if (!n.ok || !n.data) {
      set({ status: "error", errorMessage: n.error });
      return;
    }
    set({
      currentQuestion: { theme: n.data.theme, text: n.data.question },
      status: "awaiting_answer",
    });
  },

  applySuggestions: () => {
    const { suggestions } = get();
    const setInput = useSimStore.getState().setInput;
    for (const s of suggestions) {
      // dynamic key/value pair from a typed union; the sim store accepts it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setInput(s.field as any, s.to as any);
    }
  },

  reset: () =>
    set({
      history: [],
      currentQuestion: null,
      status: "idle",
      summary: null,
      suggestions: [],
      errorMessage: null,
    }),
}));
