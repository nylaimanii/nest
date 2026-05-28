"use client";

import { MonoLabel } from "@/components/atlas/MonoLabel";
import { useQuestionsStore } from "@/store/questions";
import { QuestionStage } from "./QuestionStage";
import { Summary } from "./Summary";

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="atlas-fade-in flex flex-col gap-6">
      <p className="max-w-[48ch] font-serif text-[1.1rem] leading-relaxed text-ink">
        five questions. they take about three minutes. we&apos;ll ask one at
        a time, in serif. you&apos;ll answer in your own words.
      </p>
      <p className="max-w-[48ch] font-serif text-[1.1rem] leading-relaxed text-ink">
        we won&apos;t give advice. we won&apos;t reassure. what comes back at
        the end is what you said, reflected — and if your answers suggest
        the simulation should be tuned differently, we&apos;ll show you that
        too.
      </p>
      <p className="max-w-[48ch] font-serif text-[1rem] leading-relaxed text-muted">
        the questions are written against your current simulation state.
        answers go to the model only for classification and the closing
        reflection — they aren&apos;t stored anywhere else.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-2 self-start font-serif text-[1.05rem] italic text-green transition-colors hover:text-green-2"
      >
        begin →
      </button>
    </section>
  );
}

function ErrorView({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="atlas-fade-in flex flex-col gap-4">
      <MonoLabel tone="terracotta">SOMETHING WENT WRONG</MonoLabel>
      <p className="font-serif italic text-ink">
        {error ?? "an unknown error."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="self-start font-serif italic text-green transition-colors hover:text-green-2"
      >
        try again →
      </button>
    </section>
  );
}

export function QuestionsFlow() {
  const status = useQuestionsStore((s) => s.status);
  const errorMessage = useQuestionsStore((s) => s.errorMessage);
  const start = useQuestionsStore((s) => s.start);

  if (status === "idle") {
    return <Intro onStart={() => void start()} />;
  }
  if (status === "error") {
    return (
      <ErrorView
        error={errorMessage}
        onRetry={() => void start()}
      />
    );
  }
  if (status === "complete") {
    return <Summary />;
  }
  // loading_question | awaiting_answer | classifying | summarizing
  if (status === "summarizing") {
    return (
      <section className="atlas-fade-in flex flex-col gap-6">
        <MonoLabel tone="muted">WHAT YOU SAID</MonoLabel>
        <p className="font-serif italic text-muted">
          gathering the through-line…
        </p>
      </section>
    );
  }
  return <QuestionStage />;
}
