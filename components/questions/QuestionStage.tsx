"use client";

import { useEffect, useState } from "react";

import { MonoLabel } from "@/components/atlas/MonoLabel";
import { cn } from "@/lib/utils";
import { useQuestionsStore } from "@/store/questions";

export function QuestionStage() {
  const currentQuestion = useQuestionsStore((s) => s.currentQuestion);
  const status = useQuestionsStore((s) => s.status);
  const history = useQuestionsStore((s) => s.history);
  const submit = useQuestionsStore((s) => s.submitAnswer);

  const [answer, setAnswer] = useState("");
  // reset the textarea whenever a new question loads.
  useEffect(() => {
    setAnswer("");
  }, [currentQuestion?.text]);

  const busy = status === "loading_question" || status === "classifying";
  const labelN = Math.min(history.length + 1, 5);

  const canSubmit =
    !busy && status === "awaiting_answer" && answer.trim().length > 4;

  const onSubmit = () => {
    if (!canSubmit) return;
    void submit(answer);
  };

  const onSkip = () => {
    if (busy) return;
    void submit("i don't know yet");
  };

  return (
    <section
      className="atlas-fade-in flex flex-col gap-10"
      key={currentQuestion?.text ?? "loading"}
    >
      <MonoLabel tone="muted">QUESTION {labelN} OF 5</MonoLabel>

      <h2
        className={cn(
          "max-w-[36ch] font-serif text-[2rem] leading-[1.2] lowercase text-ink transition-opacity duration-300",
          busy ? "opacity-50" : "opacity-100",
        )}
      >
        {currentQuestion?.text ?? "preparing the next question…"}
      </h2>

      <div
        className={cn(
          "flex flex-col gap-3 transition-opacity duration-300",
          busy ? "opacity-50 pointer-events-none" : "opacity-100",
        )}
      >
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="your answer —"
          rows={3}
          disabled={busy}
          aria-label="your answer"
          className="w-full resize-none rounded-[2px] border border-line bg-bone p-4 font-sans text-[1.05rem] text-ink placeholder:italic placeholder:text-muted focus:border-green focus:outline-none"
        />
        <div className="flex items-baseline justify-between">
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="font-serif text-[0.9rem] italic text-muted transition-colors hover:text-ink disabled:hover:text-muted"
          >
            i don&apos;t know yet
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={cn(
              "font-serif text-[1rem] italic transition-colors",
              canSubmit
                ? "text-green hover:text-green-2"
                : "text-muted",
            )}
          >
            continue →
          </button>
        </div>
        {status === "classifying" ? (
          <span className="font-mono text-[0.7rem] text-muted">listening…</span>
        ) : null}
        {status === "loading_question" ? (
          <span className="font-mono text-[0.7rem] text-muted">
            preparing the next question…
          </span>
        ) : null}
      </div>
    </section>
  );
}
