"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Callout } from "@/components/atlas/Callout";
import { MonoLabel } from "@/components/atlas/MonoLabel";
import { useQuestionsStore } from "@/store/questions";

export function Summary() {
  const summary = useQuestionsStore((s) => s.summary);
  const suggestions = useQuestionsStore((s) => s.suggestions);
  const applySuggestions = useQuestionsStore((s) => s.applySuggestions);
  const reset = useQuestionsStore((s) => s.reset);
  const router = useRouter();

  const onRetune = () => {
    applySuggestions();
    router.push("/simulation");
  };

  return (
    <section className="atlas-fade-in flex flex-col gap-10">
      <MonoLabel tone="muted">WHAT YOU SAID</MonoLabel>

      <p className="max-w-[42ch] font-serif text-[1.4rem] italic leading-[1.4] text-ink">
        {summary ?? "—"}
      </p>

      {suggestions.length > 0 ? (
        <Callout label="WANT TO RE-TUNE THE SIMULATION?">
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2 font-serif leading-relaxed text-ink">
              {suggestions.map((s, i) => (
                <li key={`${s.field}-${i}`}>— {s.reason}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onRetune}
              className="self-start font-serif text-[1rem] italic text-green transition-colors hover:text-green-2"
            >
              re-tune and take me back →
            </button>
          </div>
        </Callout>
      ) : (
        <Link
          href="/simulation"
          className="self-start font-serif text-[0.95rem] italic text-muted transition-colors hover:text-ink"
        >
          ← back to simulation
        </Link>
      )}

      <button
        type="button"
        onClick={reset}
        className="self-start font-serif text-[0.85rem] italic text-muted transition-colors hover:text-ink"
      >
        start over
      </button>
    </section>
  );
}
